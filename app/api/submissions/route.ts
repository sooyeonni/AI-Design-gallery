import { createHash, createHmac, randomBytes, randomUUID } from "node:crypto";
import { del, put } from "@vercel/blob";
import { inspectArchive } from "@/lib/submission-archive";
import { database, submissionStorageConfigured, SubmissionRateLimitError } from "@/lib/submission-store";
import { MAX_ZIP_BYTES, parseSubmissionMetadata, SubmissionInputError, submissionSlug } from "@/lib/submissions";

export const runtime = "nodejs";
export const maxDuration = 60;

async function boundedForm(request: Request) {
  const max = MAX_ZIP_BYTES + 64 * 1024;
  if (!request.body || Number(request.headers.get("content-length")) > max) {
    throw new SubmissionInputError("Submission is too large. ZIP must be 3 MiB or smaller.");
  }
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let length = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    length += value.byteLength;
    if (length > max) {
      await reader.cancel();
      throw new SubmissionInputError("Submission is too large. ZIP must be 3 MiB or smaller.");
    }
    chunks.push(value);
  }
  try {
    return await new Response(Buffer.concat(chunks), {
      headers: { "Content-Type": request.headers.get("content-type") || "" },
    }).formData();
  } catch {
    throw new SubmissionInputError("Send project information and a ZIP using the upload form.");
  }
}

export async function POST(request: Request) {
  let blobPath: string | undefined;
  try {
    if (!submissionStorageConfigured() || !process.env.TURNSTILE_SECRET_KEY ||
        !process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || !process.env.SUBMISSION_IP_SALT ||
        !process.env.SUBMISSION_SITE_URL) {
      return Response.json({ error: "Uploads are not configured yet. Please contact the study organizer." }, { status: 503 });
    }
    const site = new URL(process.env.SUBMISSION_SITE_URL);
    if (request.headers.get("origin") !== site.origin) {
      return Response.json({ error: "Submit from the gallery upload page." }, { status: 403 });
    }
    const form = await boundedForm(request);
    if (form.get("consent") !== "yes") {
      throw new SubmissionInputError("Permission to review and publish this project is required.");
    }
    const token = form.get("challenge");
    if (typeof token !== "string" || !token || token.length > 2048) {
      throw new SubmissionInputError("Complete the anti-bot check before submitting.");
    }
    const verification = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      body: new URLSearchParams({ secret: process.env.TURNSTILE_SECRET_KEY, response: token }),
      signal: AbortSignal.timeout(10000),
    });
    if (!verification.ok) throw new Error("Anti-bot verification service failed.");
    const challenge = await verification.json();
    if (challenge.success !== true || challenge.hostname !== site.hostname || challenge.action !== "submit-project") {
      throw new SubmissionInputError("Anti-bot check expired or failed. Please try again.");
    }
    const metadata = parseSubmissionMetadata({
      title: form.get("title"), author: form.get("author"), category: form.get("category"),
      tools: typeof form.get("tools") === "string" ? String(form.get("tools")).split(",").map((tool) => tool.trim()) : [],
    });
    const file = form.get("archive");
    if (!(file instanceof File) || !file.name.toLowerCase().endsWith(".zip") || !file.size) {
      throw new SubmissionInputError("Choose a non-empty .zip file.");
    }
    const bytes = Buffer.from(await file.arrayBuffer());
    await inspectArchive(bytes);
    const id = randomUUID();
    const statusToken = randomBytes(32).toString("hex");
    const pathname = `submissions/${id}/project.zip`;
    const blob = await put(pathname, bytes, {
      access: "private", addRandomSuffix: false, contentType: "application/zip",
    });
    blobPath = blob.pathname;
    const ip = process.env.VERCEL
      ? request.headers.get("x-vercel-forwarded-for")?.split(",")[0]?.trim()
      : "local";
    if (!ip) throw new Error("Trusted client IP is unavailable.");
    await database("rpc/reserve_submission", {
      method: "POST",
      body: JSON.stringify({ payload: {
        ...metadata, id, slug: submissionSlug(metadata.title, id), blob_path: blob.pathname,
        archive_sha256: createHash("sha256").update(bytes).digest("hex"),
        status_token_hash: createHash("sha256").update(statusToken).digest("hex"),
        ip_hash: createHmac("sha256", process.env.SUBMISSION_IP_SALT).update(ip).digest("hex"),
      } }),
    });
    blobPath = undefined;
    return Response.json({ id, token: statusToken }, {
      status: 201, headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    if (blobPath) {
      try {
        await del(blobPath);
      } catch (cleanupError) {
        console.error("Could not remove unregistered submission ZIP", blobPath, cleanupError);
      }
    }
    if (error instanceof SubmissionInputError || error instanceof SubmissionRateLimitError) {
      return Response.json({ error: error.message }, { status: error instanceof SubmissionRateLimitError ? 429 : 400 });
    }
    console.error("ZIP submission failed", error);
    return Response.json({ error: "Submission could not be saved. Please try again later." }, { status: 503 });
  }
}
