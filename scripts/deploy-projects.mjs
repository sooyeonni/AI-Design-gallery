import { readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { parseProjects } from "../lib/projects.ts";
import {
  applyDeploymentUrls,
  formatProjectsJson,
  projectNameForSlug,
  selectProjectsForDeployment,
  validateProjectDirectory,
} from "./deploy-projects.lib.mjs";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const metadataPath = path.join(repositoryRoot, "projects.json");
const projectsRoot = path.join(repositoryRoot, "projects");
const vercelCommand = process.env.VERCEL_CLI || "vercel";

function runVercel(args, { allowFailure = false } = {}) {
  const token = process.env.VERCEL_TOKEN;
  const scope = process.env.VERCEL_SCOPE;
  if (!token) throw new Error("VERCEL_TOKEN is required to deploy projects.");
  const authArgs = ["--token", token, ...(scope ? ["--scope", scope] : [])];
  const result = spawnSync(vercelCommand, [...args, ...authArgs], {
    cwd: repositoryRoot,
    encoding: "utf8",
    env: process.env,
  });
  if (result.stderr) process.stderr.write(result.stderr);
  if (result.error) throw result.error;
  if (result.status !== 0 && !allowFailure) {
    throw new Error(`Vercel command failed (${args.slice(0, 3).join(" ")}), exit code ${result.status}.`);
  }
  return result;
}

async function readChangedPaths() {
  const changedFilesPath = process.env.CHANGED_FILES_PATH;
  if (!changedFilesPath) return [];
  const content = await readFile(changedFilesPath, "utf8");
  return content.split(/\r?\n/).filter(Boolean);
}

const rawEntries = JSON.parse(await readFile(metadataPath, "utf8"));
const projects = parseProjects(rawEntries);
const changedPaths = await readChangedPaths();
const selected = process.env.DEPLOY_ALL_PROJECTS === "true"
  ? projects.filter((project) => !project.sample)
  : selectProjectsForDeployment(projects, changedPaths);

if (selected.length === 0) {
  console.log("No new or changed projects require deployment.");
  process.exit(0);
}

const deploymentUrls = new Map();
for (const project of selected) {
  const projectDirectory = await validateProjectDirectory(projectsRoot, project.slug);
  const vercelProjectName = projectNameForSlug(project.slug);
  console.log(`Deploying "${project.title}" from projects/${project.slug}/...`);

  try {
    const inspection = runVercel(["project", "inspect", vercelProjectName], { allowFailure: true });
    if (inspection.status !== 0) {
      runVercel(["project", "add", vercelProjectName]);
    }
    runVercel(["link", projectDirectory, "--yes", "--project", vercelProjectName]);
    const deployment = runVercel(["deploy", "--cwd", projectDirectory, "--yes", "--prod"]);
    const url = deployment.stdout.trim();
    const parsedUrl = URL.parse(url);
    if (!parsedUrl || parsedUrl.protocol !== "https:") {
      throw new Error(`Vercel returned an invalid deployment URL for "${project.slug}": ${url}`);
    }
    deploymentUrls.set(project.slug, parsedUrl.href);
    console.log(`Deployed "${project.title}" successfully.`);
  } finally {
    await rm(path.join(projectDirectory, ".vercel"), { recursive: true, force: true });
  }
}

if (process.env.DEPLOYMENT_RESULTS_PATH) {
  await writeFile(
    process.env.DEPLOYMENT_RESULTS_PATH,
    `${JSON.stringify(Object.fromEntries(deploymentUrls), null, 2)}\n`,
    "utf8",
  );
}
const updatedEntries = applyDeploymentUrls(rawEntries, deploymentUrls);
await writeFile(metadataPath, formatProjectsJson(updatedEntries), "utf8");
console.log(`Updated projects.json with ${deploymentUrls.size} deployment URL(s).`);
