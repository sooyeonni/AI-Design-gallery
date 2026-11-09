import { readFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseProjects } from "../lib/projects.ts";
import {
  validateParticipantUrls,
  validateProjectDirectory,
} from "./deploy-projects.lib.mjs";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const projectsRoot = path.join(repositoryRoot, "projects");
const metadata = JSON.parse(await readFile(path.join(repositoryRoot, "projects.json"), "utf8"));
const projects = parseProjects(metadata);

if (process.env.BASE_SHA) {
  const baseMetadata = JSON.parse(
    execFileSync("git", ["show", `${process.env.BASE_SHA}:projects.json`], {
      cwd: repositoryRoot,
      encoding: "utf8",
    }),
  );
  validateParticipantUrls(projects, parseProjects(baseMetadata));
}

for (const project of projects.filter((entry) => !entry.sample)) {
  await validateProjectDirectory(projectsRoot, project.slug);
}

console.log(`Validated ${projects.length} metadata entries and ${projects.filter((entry) => !entry.sample).length} submitted project folders.`);
