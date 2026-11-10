import projectsData from "../projects.json" with { type: "json" };
import { CATEGORIES, SLUG_PATTERN } from "./types.ts";
import type { Project, ProjectCategory } from "./types.ts";

function isCategory(value: unknown): value is ProjectCategory {
  return CATEGORIES.some((category) => category === value);
}

function isText(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

export function parseProjects(data: unknown): Project[] {
  if (!Array.isArray(data)) throw new Error("projects.json must contain an array.");
  const seenSlugs = new Set<string>();
  const seenTitleUrls = new Set<string>();
  const projects = data.map((entry: unknown, index): Project => {
    const fail = (message: string): never => {
      throw new Error(`projects.json entry ${index + 1}: ${message}`);
    };
    if (typeof entry !== "object" || entry === null) {
      return fail("expected a project object.");
    }
    if (!("title" in entry) || !isText(entry.title)) return fail("title is required.");
    if (!("author" in entry) || !isText(entry.author)) return fail("author is required.");
    if (!("category" in entry) || !isCategory(entry.category)) return fail("unknown category.");
    if (!("tools" in entry) || !Array.isArray(entry.tools) ||
        entry.tools.length === 0 || !entry.tools.every(isText)) {
      return fail("tools must be a non-empty array of names.");
    }
    if (!("slug" in entry) || !isText(entry.slug) || !SLUG_PATTERN.test(entry.slug)) {
      return fail("slug is required and must be lowercase kebab-case (e.g. \"ai-travel-planner\").");
    }
    if (seenSlugs.has(entry.slug)) return fail(`duplicate slug "${entry.slug}".`);
    seenSlugs.add(entry.slug);
    let url: string | undefined;
    if ("url" in entry && entry.url !== undefined) {
      if (!isText(entry.url)) return fail("url must be a non-empty string when provided.");
      const parsed = URL.parse(entry.url);
      if (!parsed || parsed.protocol !== "https:" || parsed.username || parsed.password) {
        return fail("url must be valid HTTPS with no embedded credentials.");
      }
      url = entry.url;
      const key = JSON.stringify([entry.title.trim().toLowerCase(), parsed.href]);
      if (seenTitleUrls.has(key)) return fail("duplicate title and url.");
      seenTitleUrls.add(key);
    }
    if (!("createdAt" in entry) || typeof entry.createdAt !== "string" ||
        !/^\d{4}-\d{2}-\d{2}$/.test(entry.createdAt)) {
      return fail("createdAt must use YYYY-MM-DD.");
    }
    const date = new Date(`${entry.createdAt}T00:00:00Z`);
    if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== entry.createdAt) {
      return fail("createdAt must be a real calendar date.");
    }
    const sample = "sample" in entry ? entry.sample : undefined;
    if (sample !== undefined && typeof sample !== "boolean") {
      return fail("sample must be a boolean when provided.");
    }
    return {
      title: entry.title,
      author: entry.author,
      category: entry.category,
      tools: entry.tools,
      slug: entry.slug,
      ...(url !== undefined ? { url } : {}),
      createdAt: entry.createdAt,
      ...(sample !== undefined ? { sample } : {}),
    };
  });
  return projects.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function getProjects(): Project[] {
  return resolveProjectUrls(parseProjects(projectsData));
}

export function resolveProjectUrls(projects: Project[]): Project[] {
  return projects.map((project) => {
    const base = "https://sooyeonni.github.io/AI-Design-gallery";
    const pagesUrl = `${base}/projects/${project.slug}/`;
    const isPagesProject = !project.sample && (!project.url || project.url === pagesUrl);
    return {
      ...project,
      ...(isPagesProject ? {
        url: pagesUrl,
        thumbnailUrl: `${base}/thumbnails/${project.slug}.png`,
      } : {}),
    };
  });
}
