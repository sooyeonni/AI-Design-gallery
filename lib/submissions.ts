import { CATEGORIES } from "./types.ts";
import type { ProjectCategory } from "./types.ts";

export const MAX_ZIP_BYTES = 25 * 1024 * 1024;
export const MAX_EXPANDED_BYTES = 100 * 1024 * 1024;
export const MAX_FILE_BYTES = 20 * 1024 * 1024;
export const MAX_FILES = 300;
export const ARCHIVE_LIMITS = "25 MiB compressed, 100 MiB expanded, 20 MiB per file, and 300 entries";

export const SUBMISSION_STATES = [
  "uploading", "queued", "reviewing", "needs_review", "rejected", "failed", "published",
] as const;
export type SubmissionState = typeof SUBMISSION_STATES[number];

export interface SubmissionMetadata {
  title: string;
  author: string;
  category: ProjectCategory;
  tools: string[];
}

export interface Submission extends SubmissionMetadata {
  id: string;
  slug: string;
  status: SubmissionState;
  feedback: string;
  created_at: string;
  blob_path: string;
  archive_sha256: string;
  deployment_url: string | null;
  lease_token: string | null;
}

export class SubmissionInputError extends Error {}

export function parseSubmissionMetadata(data: unknown): SubmissionMetadata {
  if (!data || typeof data !== "object") throw new SubmissionInputError("Project information is required.");
  const record = data as Record<string, unknown>;
  const text = (key: string, max: number) => {
    const value = record[key];
    if (typeof value !== "string" || !value.trim() || value.trim().length > max) {
      throw new SubmissionInputError(`${key} must contain 1–${max} characters.`);
    }
    return value.trim();
  };
  const title = text("title", 100);
  const author = text("author", 80);
  const category = CATEGORIES.find((category) => category === record.category);
  if (!category) throw new SubmissionInputError("Choose a supported category.");
  if (!Array.isArray(record.tools) || record.tools.length === 0 || record.tools.length > 10 ||
      !record.tools.every((tool): tool is string => typeof tool === "string" && !!tool.trim() && tool.length <= 60)) {
    throw new SubmissionInputError("Provide 1–10 AI tool names, up to 60 characters each.");
  }
  return { title, author, category, tools: [...new Set(record.tools.map((tool) => tool.trim()))] };
}

export function submissionSlug(title: string, id: string) {
  const base = title.normalize("NFKD").toLowerCase().replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "").slice(0, 40).replace(/-$/, "") || "project";
  return `${base}-${id.replaceAll("-", "")}`;
}

export type PublishedSubmission = Pick<Submission, "id" | "title" | "author" | "category" | "tools" | "slug" | "created_at"> & {
  deployment_url: string;
};

export function publicSubmission(submission: Pick<Submission, "id" | "title" | "status" | "feedback" | "deployment_url">) {
  return {
    id: submission.id,
    title: submission.title,
    status: submission.status,
    feedback: submission.feedback,
    url: submission.status === "published" ? submission.deployment_url : null,
  };
}
