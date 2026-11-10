import { cp, lstat, mkdir, readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { validateArchivePath, assertNoCredentials } from "../lib/submission-archive.ts";
import { MAX_EXPANDED_BYTES, MAX_FILES, MAX_FILE_BYTES } from "../lib/submissions.ts";
import { projectNameForSlug } from "./deploy-projects.lib.mjs";

const STATIC_ASSET = /\.(?:html?|css|[cm]?js|json|svg|png|jpe?g|gif|webp|avif|ico|woff2?|ttf|otf|txt|xml|map|mp4|webm|mp3|wav|wasm|task|tflite|bin)$/i;

export async function validatePagesProject(projectsRoot, slug) {
  projectNameForSlug(slug);
  const directory = path.resolve(projectsRoot, slug);
  const stat = await lstat(directory);
  if (!stat.isDirectory() || stat.isSymbolicLink()) throw new Error(`projects/${slug} must be a real directory.`);
  const files = [];
  let total = 0;
  let entries = 0;
  async function walk(current) {
    for (const entry of await readdir(current, { withFileTypes: true })) {
      const target = path.join(current, entry.name);
      const name = path.relative(directory, target).split(path.sep).join("/");
      validateArchivePath(name);
      if (++entries > MAX_FILES) throw new Error(`projects/${slug} exceeds ${MAX_FILES} entries.`);
      if (entry.isSymbolicLink() || (!entry.isDirectory() && !entry.isFile())) {
        throw new Error(`Unsupported file type: projects/${slug}/${name}`);
      }
      if (name.split("/").some((part) => part.startsWith("."))) {
        throw new Error(`Hidden files are not published: projects/${slug}/${name}`);
      }
      if (entry.isDirectory()) { await walk(target); continue; }
      if (!STATIC_ASSET.test(name) || /(?:^|\/)(?:package(?:-lock)?\.json|vercel\.json)$/i.test(name)) {
        throw new Error(`Submit static exports only, not build/server configuration: projects/${slug}/${name}`);
      }
      const info = await lstat(target);
      total += info.size;
      if (info.size > MAX_FILE_BYTES || total > MAX_EXPANDED_BYTES) {
        throw new Error(`projects/${slug} exceeds 100 MiB total or 20 MiB per file.`);
      }
      assertNoCredentials(await readFile(target), `projects/${slug}/${name}`);
      files.push(name);
    }
  }
  await walk(directory);
  if (!files.includes("index.html")) throw new Error(`projects/${slug}/index.html is required.`);
  return { directory, bytes: total, files };
}

export async function copyPagesProject(project, output) {
  const target = path.join(output, "projects", project.slug);
  for (const file of project.files) {
    const destination = path.join(target, file);
    await mkdir(path.dirname(destination), { recursive: true });
    await cp(path.join(project.directory, file), destination);
  }
}
