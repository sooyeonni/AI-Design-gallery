import { createHash } from "node:crypto";
import { database } from "@/lib/submission-store";
import { publicSubmission } from "@/lib/submissions";
import type { Submission } from "@/lib/submissions";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const token = request.headers.get("authorization")?.replace(/^Bearer /, "");
  const headers = { "Cache-Control": "no-store" };
  if (!/^[0-9a-f-]{36}$/.test(id) || !token || !/^[0-9a-f]{64}$/.test(token)) {
    return Response.json({ error: "A valid submission receipt is required." }, { status: 401, headers });
  }
  try {
    const hash = createHash("sha256").update(token).digest("hex");
    const rows = await database<Pick<Submission, "id" | "title" | "status" | "feedback" | "deployment_url">[]>(
      `submissions?id=eq.${id}&status_token_hash=eq.${hash}&select=id,title,status,feedback,deployment_url`,
    );
    if (!rows[0]) return Response.json({ error: "Submission not found." }, { status: 404, headers });
    return Response.json(publicSubmission(rows[0]), { headers });
  } catch (error) {
    console.error("Submission status lookup failed", error);
    return Response.json({ error: "Status is temporarily unavailable." }, { status: 503, headers });
  }
}
