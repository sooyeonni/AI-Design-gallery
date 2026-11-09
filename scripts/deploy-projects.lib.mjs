import { lstat, readFile, readdir } from "node:fs/promises";
import path from "node:path";

export const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const PROJECT_MARKERS = new Set(["index.html", "package.json", "vercel.json"]);
const FORBIDDEN_DIRECTORIES = new Set([".git", ".vercel", "node_modules"]);
const FORBIDDEN_FILES = new Set([".env", "id_rsa", "id_ed25519"]);

function isForbiddenFile(name) {
  return (
    FORBIDDEN_FILES.has(name) ||
    (name.startsWith(".env.") && name !== ".env.example") ||
    name.endsWith(".pem") ||
    name.endsWith(".key")
  );
}

export function selectProjectsForDeployment(projects, changedPaths = []) {
  const normalizedPaths = changedPaths.map((file) => file.replaceAll("\\", "/"));
  return projects.filter((project) => {
    if (project.sample) return false;
    if (!project.url) return true;
    const folderPrefix = `projects/${project.slug}/`;
    return normalizedPaths.some((file) => file.startsWith(folderPrefix));
  });
}

export function projectNameForSlug(slug) {
  if (!SLUG_PATTERN.test(slug) || slug.length > 64) {
    throw new Error(`Invalid project slug "${slug}". Use up to 64 lowercase letters, numbers, and single hyphens.`);
  }
  return `ai-design-study-${slug}`;
}

export async function validateProjectDirectory(projectsRoot, slug) {
  projectNameForSlug(slug);
  const root = path.resolve(projectsRoot);
  const projectDirectory = path.resolve(root, slug);
  if (!projectDirectory.startsWith(`${root}${path.sep}`)) {
    throw new Error(`Project "${slug}" resolves outside the projects directory.`);
  }

  let projectStat;
  try {
    projectStat = await lstat(projectDirectory);
  } catch (error) {
    if (error?.code === "ENOENT") {
      throw new Error(`Missing project folder: projects/${slug}/`);
    }
    throw error;
  }
  if (!projectStat.isDirectory() || projectStat.isSymbolicLink()) {
    throw new Error(`projects/${slug}/ must be a real directory, not a symlink.`);
  }

  const rootEntries = await readdir(projectDirectory);
  if (!rootEntries.some((entry) => PROJECT_MARKERS.has(entry))) {
    throw new Error(
      `projects/${slug}/ must contain index.html, package.json, or vercel.json so Vercel can deploy it.`,
    );
  }

  async function walk(directory) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const entryPath = path.join(directory, entry.name);
      const relativePath = path.relative(root, entryPath);
      if (entry.isSymbolicLink()) {
        throw new Error(`Symlinks are not allowed in submitted projects: projects/${relativePath}`);
      }
      if (entry.isDirectory()) {
        if (FORBIDDEN_DIRECTORIES.has(entry.name)) {
          throw new Error(`Remove generated or repository directory: projects/${relativePath}/`);
        }
        await walk(entryPath);
      } else if (isForbiddenFile(entry.name)) {
        throw new Error(`Potential secret file is not allowed: projects/${relativePath}`);
      }
    }
  }
  await walk(projectDirectory);

  if (rootEntries.includes("package.json")) {
    const packagePath = path.join(projectDirectory, "package.json");
    try {
      const packageData = JSON.parse(await readFile(packagePath, "utf8"));
      if (typeof packageData !== "object" || packageData === null || Array.isArray(packageData)) {
        throw new Error("expected an object");
      }
    } catch (error) {
      throw new Error(`Invalid projects/${slug}/package.json: ${error.message}`);
    }
  }

  return projectDirectory;
}

export function applyDeploymentUrls(entries, deploymentUrls) {
  return entries.map((entry) => {
    const url = deploymentUrls.get(entry.slug);
    if (!url) return entry;
    const updated = {};
    for (const [key, value] of Object.entries(entry)) {
      if (key === "url") continue;
      updated[key] = value;
      if (key === "slug") updated.url = url;
    }
    return updated;
  });
}

export function validateParticipantUrls(currentProjects, baseProjects) {
  const baseBySlug = new Map(baseProjects.map((project) => [project.slug, project]));
  const currentSlugs = new Set(currentProjects.map((project) => project.slug));
  for (const baseProject of baseProjects) {
    if (!baseProject.sample && baseProject.url && !currentSlugs.has(baseProject.slug)) {
      throw new Error(
        `Deployed project "${baseProject.slug}" cannot be removed or re-slugged in a participant Pull Request.`,
      );
    }
  }
  for (const project of currentProjects) {
    const baseProject = baseBySlug.get(project.slug);
    if (project.sample && !baseProject?.sample) {
      throw new Error(`Project "${project.slug}" cannot set the reserved sample flag.`);
    }
    if (project.url !== baseProject?.url) {
      throw new Error(
        `Project "${project.slug}" adds or changes url. Participants must omit url; the post-merge workflow owns this field.`,
      );
    }
  }
}

export function formatProjectsJson(entries) {
  const objects = entries.map((entry) => {
    const pretty = JSON.stringify(entry, null, 2);
    const inlineTools = `[${entry.tools.map((tool) => JSON.stringify(tool)).join(", ")}]`;
    const compactTools = pretty.replace(
      /  "tools": \[\n(?:    .+(?:,\n|\n))+?  \](,?)/,
      `  "tools": ${inlineTools}$1`,
    );
    return compactTools.split("\n").map((line) => `  ${line}`).join("\n");
  });
  return `[\n${objects.join(",\n")}\n]\n`;
}
