import { readFile } from "node:fs/promises";
import path from "node:path";

export const dynamic = "force-static";

export async function GET() {
  const instructions = await readFile(path.join(process.cwd(), "AGENTS.md"), "utf8");
  return new Response(instructions, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Content-Disposition": 'attachment; filename="AGENTS.md"',
    },
  });
}
