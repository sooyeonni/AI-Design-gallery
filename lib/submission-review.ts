import { SubmissionInputError } from "./submissions.ts";
import { staticSiteIssue } from "./submission-archive.ts";

export interface ReviewDecision {
  verdict: "approve" | "reject" | "needs_review";
  summary: string;
}

export function parseReviewDecision(data: unknown): ReviewDecision {
  if (!data || typeof data !== "object" || !("verdict" in data) || !("summary" in data) ||
      !["approve", "reject", "needs_review"].includes(String(data.verdict)) ||
      typeof data.summary !== "string" || !data.summary.trim() || data.summary.length > 1000) {
    throw new Error("AI review returned an invalid decision. Publication was blocked.");
  }
  return { verdict: data.verdict as ReviewDecision["verdict"], summary: data.summary.trim() };
}

export function localReviewUrl(value: string) {
  const url = new URL(value);
  if (!["http:", "https:"].includes(url.protocol) || url.username || url.password ||
      !["127.0.0.1", "[::1]", "localhost"].includes(url.hostname)) {
    throw new Error("AI_REVIEW_URL must point to your own loopback-hosted review service.");
  }
  return url;
}

export function deploymentUrl(value: unknown): string {
  if (typeof value !== "string") throw new Error("Deployment URL is missing.");
  const url = new URL(value);
  if (url.protocol !== "https:" || !/^[a-z0-9-]+\.vercel\.app$/.test(url.hostname) ||
      url.username || url.password || url.port || url.search || url.hash || url.pathname !== "/") {
    throw new Error("Deployment did not return an isolated HTTPS Vercel site.");
  }
  return url.origin;
}

export function reviewFiles(files: Map<string, Buffer>) {
  const textFiles: { path: string; content: string }[] = [];
  let total = 0;
  for (const [path, content] of files) {
    if (!/\.(?:html?|css|[cm]?js|json|svg|txt|xml|md)$/i.test(path)) continue;
    total += content.length;
    if (total > 1024 * 1024 || content.length > 200 * 1024) {
      throw new SubmissionInputError("Text sources exceed the automatic review limit. An organizer must review this project.");
    }
    textFiles.push({ path, content: content.toString("utf8") });
  }
  return textFiles;
}

export async function reviewAndPublish(files: Map<string, Buffer>, services: {
  review: (sources: ReturnType<typeof reviewFiles>) => Promise<unknown>;
  preview: () => Promise<void>;
  deploy: () => Promise<string>;
}) {
  const issue = staticSiteIssue(files);
  if (issue) return { status: "needs_review" as const, feedback: issue, url: null };
  const decision = parseReviewDecision(await services.review(reviewFiles(files)));
  if (decision.verdict !== "approve") {
    return {
      status: decision.verdict === "reject" ? "rejected" as const : "needs_review" as const,
      feedback: decision.summary, url: null,
    };
  }
  await services.preview();
  const url = deploymentUrl(await services.deploy());
  return {
    status: "published" as const,
    feedback: "Review and isolated static preview checks passed. Your project is now in the gallery.",
    url,
  };
}
