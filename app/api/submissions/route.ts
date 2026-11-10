import { createHash, createHmac, randomBytes, randomUUID } from "node:crypto";
import { del, get } from "@vercel/blob";
import { generateClientTokenFromReadWriteToken } from "@vercel/blob/client";
import { inspectArchive } from "@/lib/submission-archive";
import { database, submissionStorageConfigured, SubmissionRateLimitError } from "@/lib/submission-store";
import { MAX_ZIP_BYTES, SubmissionInputError, submissionSlug } from "@/lib/submissions";
import type { Submission } from "@/lib/submissions";
import { boundedBytes, clientUploadOptions, parseUploadReceipt, parseUploadRequest, uploadJson, UPLOAD_WINDOW_MS } from "@/lib/submission-upload";

export const runtime = "nodejs";
export const maxDuration = 60;

const headers = { "Cache-Control": "no-store" };
const hash = (value: string | Buffer) => createHash("sha256").update(value).digest("hex");

function uploadSite(request: Request) {
  if (!submissionStorageConfigured() || !process.env.TURNSTILE_SECRET_KEY ||
      !process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || !process.env.SUBMISSION_IP_SALT ||
      !process.env.SUBMISSION_SITE_URL) {
    return Response.json({ error: "Uploads are not configured yet. Please contact the study organizer." }, { status: 503, headers });
  }
  const site = new URL(process.env.SUBMISSION_SITE_URL);
  if (request.headers.get("origin") !== site.origin) {
    return Response.json({ error: "Submit from the gallery upload page." }, { status: 403, headers });
  }
  return site;
}

function uploadError(error: unknown) {
  if (error instanceof SubmissionInputError || error instanceof SubmissionRateLimitError) {
    return Response.json({ error: error.message }, { status: error instanceof SubmissionRateLimitError ? 429 : 400, headers });
  }
  console.error("ZIP submission failed", error);
  return Response.json({ error: "Submission could not be saved. Please try again later." }, { status: 503, headers });
}

export async function POST(request: Request) {
  try {
    const site = uploadSite(request);
    if (site instanceof Response) return site;
    const { metadata, challenge: token, size } = parseUploadRequest(await uploadJson(request));
    const verification = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      body: new URLSearchParams({ secret: process.env.TURNSTILE_SECRET_KEY!, response: token }),
      signal: AbortSignal.timeout(10000),
    });
    if (!verification.ok) throw new Error("Anti-bot verification service failed.");
    const challenge = await verification.json();
    if (challenge.success !== true || challenge.hostname !== site.hostname || challenge.action !== "submit-project") {
      throw new SubmissionInputError("Anti-bot check expired or failed. Please try again.");
    }
    const ip = process.env.VERCEL
      ? request.headers.get("x-vercel-forwarded-for")?.split(",")[0]?.trim()
      : "local";
    if (!ip) throw new Error("Trusted client IP is unavailable.");
    const id = randomUUID();
    const statusToken = randomBytes(32).toString("hex");
    const pathname = `submissions/${id}/project.zip`;
    // Reserve quota before granting any storage access. Uploading rows cannot be claimed by the worker.
    await database("rpc/reserve_submission_upload", {
      method: "POST",
      body: JSON.stringify({ payload: {
        ...metadata, id, slug: submissionSlug(metadata.title, id), blob_path: pathname,
        archive_sha256: "", status_token_hash: hash(statusToken),
        ip_hash: createHmac("sha256", process.env.SUBMISSION_IP_SALT!).update(ip).digest("hex"),
      } }),
    });
    const clientToken = await generateClientTokenFromReadWriteToken(clientUploadOptions(pathname, size));
    return Response.json({ id, token: statusToken, pathname, clientToken }, { status: 201, headers });
  } catch (error) {
    return uploadError(error);
  }
}

export async function PUT(request: Request) {
  try {
    const site = uploadSite(request);
    if (site instanceof Response) return site;
    const { id, token } = parseUploadReceipt(await uploadJson(request));
    const tokenHash = hash(token);
    const [submission] = await database<Submission[]>(
      `submissions?id=eq.${id}&status_token_hash=eq.${tokenHash}&select=*`,
    );
    if (!submission) return Response.json({ error: "Upload not found." }, { status: 404, headers });
    // A lost completion response may be retried without touching an already accepted ZIP.
    if (submission.status !== "uploading") {
      if (!submission.archive_sha256) throw new SubmissionInputError("This upload has expired. Submit the ZIP again.");
      return Response.json({ id, token }, { headers });
    }
    if (Date.now() - Date.parse(submission.created_at) >= UPLOAD_WINDOW_MS) {
      throw new SubmissionInputError("This upload has expired. Submit the ZIP again.");
    }
    const blob = await get(submission.blob_path, { access: "private", useCache: false });
    if (!blob || blob.statusCode !== 200 || !blob.stream) {
      throw new SubmissionInputError("ZIP upload is not complete. Please retry.");
    }
    let bytes: Buffer;
    try {
      bytes = await boundedBytes(blob.stream, MAX_ZIP_BYTES);
      await inspectArchive(bytes);
    } catch (error) {
      if (error instanceof SubmissionInputError) {
        // Only invalid archives are removed. A transient failure must never delete an accepted upload.
        await database("submissions?id=eq." + id + "&status=eq.uploading", {
          method: "PATCH", body: JSON.stringify({ status: "rejected", feedback: error.message }),
        });
        try { await del(submission.blob_path); }
        catch (cleanupError) { console.error("Invalid upload cleanup failed", id, cleanupError); }
      }
      throw error;
    }
    await database("rpc/complete_submission_upload", {
      method: "POST",
      body: JSON.stringify({ submission_id: id, credential_hash: tokenHash, checksum: hash(bytes) }),
    });
    return Response.json({ id, token }, { headers });
  } catch (error) {
    return uploadError(error);
  }
}
