import assert from "node:assert/strict";
import { test } from "node:test";
import { getProjects, parseProjects } from "./projects.ts";
import { formatDate } from "./dates.ts";
import { CATEGORIES } from "./types.ts";

const project = {
  title: "Test project",
  author: "Study member",
  category: "Prototype",
  tools: ["Claude Code", "Figma Make"],
  slug: "test-project",
  url: "https://example.com/project",
  createdAt: "2026-09-23",
};

test("repository data parses and sorts newest first", () => {
  const projects = getProjects();
  assert.ok(Array.isArray(projects));
  assert.deepEqual(
    projects.map((entry) => entry.createdAt),
    projects.map((entry) => entry.createdAt).sort().reverse(),
  );
});

test("Slides leads the supported categories and Website is no longer accepted", () => {
  assert.deepEqual(CATEGORIES, ["Slides", "Prototype", "Experiment", "Tool", "Other"]);
  for (const category of CATEGORIES) {
    assert.equal(parseProjects([{ ...project, category }])[0].category, category);
  }
  assert.throws(() => parseProjects([{ ...project, category: "Website" }]), /unknown category/);
});

test("valid metadata and multiple tools survive parsing without mutating input", () => {
  const older = { ...project, title: "Older", slug: "older", createdAt: "2026-01-01" };
  const input = [older, project];
  const original = structuredClone(input);
  assert.deepEqual(parseProjects(input), [project, older]);
  assert.deepEqual(input, original);
});

test("an empty collection is valid", () => {
  assert.deepEqual(parseProjects([]), []);
});

test("a project can wait for automatic deployment without a url", () => {
  const pendingProject = Object.fromEntries(
    Object.entries(project).filter(([key]) => key !== "url"),
  );
  assert.deepEqual(parseProjects([pendingProject]), [pendingProject]);
});

test("optional sample marker is validated and retained", () => {
  assert.equal(parseProjects([{ ...project, sample: true }])[0].sample, true);
  assert.equal(parseProjects([{ ...project, sample: false }])[0].sample, false);
  assert.throws(() => parseProjects([{ ...project, sample: "true" }]), /sample/);
});

test("rejects non-array data and non-object entries with useful errors", () => {
  assert.throws(() => parseProjects({}), /must contain an array/);
  for (const value of [null, 42, "project", []]) {
    assert.throws(() => parseProjects([value]), /entry 1:/);
  }
});

test("rejects missing or invalid metadata", () => {
  for (const field of ["title", "author", "category", "tools", "slug", "createdAt"]) {
    assert.throws(() => parseProjects([{ ...project, [field]: undefined }]), /entry 1:/);
  }
  for (const fields of [
    { title: " " },
    { author: "" },
    { category: "Unknown" },
    { tools: [] },
    { tools: [""] },
    { tools: [123] },
    { slug: "UPPERCASE" },
    { slug: "spaces are invalid" },
    { slug: "../escape" },
    { slug: "double--hyphen" },
  ]) {
    assert.throws(() => parseProjects([{ ...project, ...fields }]), /entry 1:/);
  }
});

test("requires valid HTTPS URLs without embedded credentials", () => {
  for (const url of [
    "http://example.com",
    "javascript:alert(1)",
    "/relative-path",
    "not a URL",
    "https://",
    "https://user:password@example.com",
  ]) {
    assert.throws(() => parseProjects([{ ...project, url }]), /url/i);
  }
});

test("rejects duplicate slugs", () => {
  assert.throws(
    () => parseProjects([project, { ...project, title: "Another project", url: "https://example.com/another" }]),
    /entry 2: duplicate slug/,
  );
});

test("requires actual calendar dates in YYYY-MM-DD format", () => {
  for (const createdAt of ["2026-02-30", "2026-02-29", "2026-13-01", "09/23/2026", "2026-9-23"]) {
    assert.throws(() => parseProjects([{ ...project, createdAt }]), /createdAt/);
  }
  assert.equal(parseProjects([{ ...project, createdAt: "2024-02-29" }])[0].createdAt, "2024-02-29");
});

test("rejects duplicate title/URL pairs while allowing distinct projects", () => {
  assert.throws(
    () => parseProjects([project, { ...project, title: " TEST PROJECT ", slug: "another-project" }]),
    /entry 2: duplicate/,
  );
  assert.equal(
    parseProjects([project, { ...project, slug: "another-project", url: "https://example.com/different" }]).length,
    2,
  );
});

test("date labels are stable in UTC", () => {
  const originalTimezone = process.env.TZ;
  try {
    for (const timezone of ["UTC", "America/Los_Angeles", "Pacific/Kiritimati"]) {
      process.env.TZ = timezone;
      assert.equal(formatDate("2026-09-23"), "Sep 23, 2026");
    }
  } finally {
    if (originalTimezone === undefined) delete process.env.TZ;
    else process.env.TZ = originalTimezone;
  }
});
