import { cp, mkdtemp, rm, symlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { getProjects } from "../lib/projects.ts";
import { copyPagesProject, validatePagesProject } from "./pages-projects.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const stage = await mkdtemp(path.join(root, ".pages-build-"));
const output = path.join(root, "out");
try {
  const projects = getProjects().filter((project) => !project.sample &&
    project.url === `https://sooyeonni.github.io/AI-Design-gallery/projects/${project.slug}/`);
  const validated = [];
  let total = 0;
  for (const project of projects) {
    const result = await validatePagesProject(path.join(root, "projects"), project.slug);
    total += result.bytes;
    if (total > 750 * 1024 * 1024) throw new Error("Projects exceed the 750 MiB Pages budget. Nothing was published.");
    validated.push({ slug: project.slug, ...result });
  }
  // Keep the existing Vercel receipt APIs intact; export only public gallery routes.
  const inputs = ["app", "components", "lib", "AGENTS.md", "projects.json", "package.json", "tsconfig.json", "next.config.ts"];
  if (existsSync(path.join(root, "public"))) inputs.push("public");
  for (const name of inputs) {
    await cp(path.join(root, name), path.join(stage, name), {
      recursive: true,
      filter: (source) => ![path.join(root, "app/api"), path.join(root, "app/submission-status")].includes(source),
    });
  }
  await symlink(path.join(root, "node_modules"), path.join(stage, "node_modules"), "dir");
  const result = spawnSync(process.execPath, [
    path.join(root, "node_modules/next/dist/bin/next"), "build", stage, "--webpack",
  ], {
    cwd: root, stdio: "inherit",
    env: { ...process.env, GITHUB_PAGES: "true", NEXT_TELEMETRY_DISABLED: "1" },
  });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`Pages build failed (${result.status}).`);
  const destination = path.join(stage, "out");
  for (const project of validated) {
    await copyPagesProject(project, destination);
  }
  await writeFile(path.join(destination, ".nojekyll"), "");
  await writeFile(path.join(destination, "_thumbnail-projects.json"), JSON.stringify(validated.map(({ slug }) => slug)));
  await rm(output, { recursive: true, force: true });
  await cp(destination, output, { recursive: true });
  console.log(`Pages export ready: ${validated.length} static projects. No submitted build scripts were executed.`);
} finally {
  await rm(stage, { recursive: true, force: true });
}
