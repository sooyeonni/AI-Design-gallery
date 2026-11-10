import { MAX_ZIP_BYTES, parseSubmissionMetadata, SubmissionInputError } from "./submissions.ts";

export const UPLOAD_WINDOW_MS = 30 * 60 * 1000;

export async function boundedBytes(stream: ReadableStream<Uint8Array>, maximum: number): Promise<Buffer> {
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > maximum) {
        await reader.cancel();
        throw new SubmissionInputError("Upload exceeds the allowed size.");
      }
      chunks.push(value);
    }
    return Buffer.concat(chunks);
  } finally {
    reader.releaseLock();
  }
}

export async function uploadJson(request: Request): Promise<Record<string, unknown>> {
  if (!request.body || !request.headers.get("content-type")?.startsWith("application/json")) {
    throw new SubmissionInputError("Send project information using the upload form.");
  }
  const bytes = await boundedBytes(request.body, 16 * 1024);
  let data: unknown;
  try {
    data = JSON.parse(bytes.toString("utf8"));
  } catch {
    throw new SubmissionInputError("Invalid upload request.");
  }
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw new SubmissionInputError("Invalid upload request.");
  }
  return data as Record<string, unknown>;
}

export function parseUploadRequest(data: Record<string, unknown>) {
  if (data.consent !== "yes") {
    throw new SubmissionInputError("Permission to review and publish this project is required.");
  }
  if (typeof data.challenge !== "string" || !data.challenge || data.challenge.length > 2048) {
    throw new SubmissionInputError("Complete the anti-bot check before submitting.");
  }
  if (typeof data.filename !== "string" || !data.filename.toLowerCase().endsWith(".zip") ||
      typeof data.size !== "number" || !Number.isSafeInteger(data.size) || data.size <= 0 || data.size > MAX_ZIP_BYTES) {
    throw new SubmissionInputError("Choose a non-empty ZIP, up to 25 MiB.");
  }
  return { metadata: parseSubmissionMetadata(data), challenge: data.challenge, size: data.size };
}

export function parseUploadReceipt(data: Record<string, unknown>) {
  if (typeof data.id !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(data.id) ||
      typeof data.token !== "string" || !/^[0-9a-f]{64}$/.test(data.token)) {
    throw new SubmissionInputError("A valid upload receipt is required.");
  }
  return { id: data.id, token: data.token };
}

export function clientUploadOptions(pathname: string, size: number, now = Date.now()) {
  return {
    pathname,
    maximumSizeInBytes: size,
    allowedContentTypes: ["application/zip"],
    validUntil: now + UPLOAD_WINDOW_MS,
    addRandomSuffix: false,
    allowOverwrite: false,
  };
}
