import type { PublishedSubmission } from "./submissions.ts";

export function submissionStorageConfigured() {
  const names = ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "BLOB_READ_WRITE_TOKEN"];
  const present = names.filter((name) => !!process.env[name]);
  if (present.length && present.length !== names.length) {
    throw new Error("Submission storage is partially configured. Set SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY and BLOB_READ_WRITE_TOKEN together.");
  }
  return present.length === names.length;
}

export async function database<T>(resource: string, init: RequestInit = {}): Promise<T> {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase submission storage is not configured.");
  const response = await fetch(`${url.replace(/\/$/, "")}/rest/v1/${resource}`, {
    ...init,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      ...init.headers,
    },
    cache: "no-store",
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) {
    const body = await response.text();
    if (response.status === 429 || body.includes("submission_rate_limit")) {
      throw new SubmissionRateLimitError("Submission limit reached. Try again later.");
    }
    // Keep database internals out of client responses.
    console.error("Submission database request failed", response.status, resource.split("?")[0]);
    throw new Error("Submission database request failed.");
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export class SubmissionRateLimitError extends Error {}

export async function publishedSubmissions(): Promise<PublishedSubmission[]> {
  if (!submissionStorageConfigured()) return [];
  return database<PublishedSubmission[]>("submissions?status=eq.published&select=id,title,author,category,tools,slug,created_at,deployment_url&order=created_at.desc&limit=1000");
}
