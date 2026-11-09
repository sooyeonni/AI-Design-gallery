import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseProjects } from "../lib/projects.ts";
import {
  applyDeploymentUrls,
  formatProjectsJson,
} from "./deploy-projects.lib.mjs";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const metadataPath = path.join(repositoryRoot, "projects.json");
const resultsPath = process.env.DEPLOYMENT_RESULTS_PATH;

if (!resultsPath) throw new Error("DEPLOYMENT_RESULTS_PATH is required.");

const entries = JSON.parse(await readFile(metadataPath, "utf8"));
parseProjects(entries);
const rawResults = JSON.parse(await readFile(resultsPath, "utf8"));
const existingSlugs = new Set(entries.map((entry) => entry.slug));
const results = new Map();

for (const [slug, url] of Object.entries(rawResults)) {
  if (!existingSlugs.has(slug)) continue;
  const parsedUrl = typeof url === "string" ? URL.parse(url) : null;
  if (!parsedUrl || parsedUrl.protocol !== "https:") {
    throw new Error(`Invalid deployment result for "${slug}".`);
  }
  results.set(slug, parsedUrl.href);
}

await writeFile(metadataPath, formatProjectsJson(applyDeploymentUrls(entries, results)), "utf8");
