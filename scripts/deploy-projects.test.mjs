import assert from "node:assert/strict";
import { mkdir, mkdtemp, symlink, writeFile } from "node:fs/promises";
import { test } from "node:test";
import os from "node:os";
import path from "node:path";
import {
  applyDeploymentUrls,
  formatProjectsJson,
  projectNameForSlug,
  selectProjectsForDeployment,
  validateParticipantUrls,
  validateProjectDirectory,
} from "./deploy-projects.lib.mjs";

const deployed = { title: "Deployed", slug: "deployed", url: "https://example.com", sample: false };
const pending = { title: "Pending", slug: "pending", sample: false };
const sample = { title: "Sample", slug: "sample", sample: true };

test("selects pending and changed real projects but never samples", () => {
  assert.deepEqual(
    selectProjectsForDeployment([deployed, pending, sample], ["projects/deployed/src/app.ts"]),
    [deployed, pending],
  );
  assert.deepEqual(selectProjectsForDeployment([deployed, sample], ["projects/other/file.ts"]), []);
});

test("creates isolated, deterministic Vercel project names", () => {
  assert.equal(projectNameForSlug("my-project"), "ai-design-study-my-project");
  for (const slug of ["../escape", "UPPER", "two--hyphens", "a".repeat(65)]) {
    assert.throws(() => projectNameForSlug(slug), /Invalid project slug/);
  }
});

test("validates static and package-based project roots", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "gallery-projects-"));
  await mkdir(path.join(root, "static-site"));
  await writeFile(path.join(root, "static-site", "index.html"), "<h1>Hello</h1>");
  assert.equal(await validateProjectDirectory(root, "static-site"), path.join(root, "static-site"));

  await mkdir(path.join(root, "framework-site"));
  await writeFile(path.join(root, "framework-site", "package.json"), "{\"scripts\":{\"build\":\"next build\"}}");
  assert.equal(await validateProjectDirectory(root, "framework-site"), path.join(root, "framework-site"));
});

test("rejects missing markers, invalid package files, secrets, generated folders, and symlinks", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "gallery-projects-"));
  await mkdir(path.join(root, "empty"));
  await assert.rejects(validateProjectDirectory(root, "empty"), /must contain/);

  await mkdir(path.join(root, "bad-package"));
  await writeFile(path.join(root, "bad-package", "package.json"), "{");
  await assert.rejects(validateProjectDirectory(root, "bad-package"), /Invalid/);

  await mkdir(path.join(root, "secret"));
  await writeFile(path.join(root, "secret", "index.html"), "ok");
  await writeFile(path.join(root, "secret", ".env.local"), "SECRET=value");
  await assert.rejects(validateProjectDirectory(root, "secret"), /Potential secret/);

  await mkdir(path.join(root, "generated"));
  await writeFile(path.join(root, "generated", "index.html"), "ok");
  await mkdir(path.join(root, "generated", "node_modules"));
  await assert.rejects(validateProjectDirectory(root, "generated"), /generated or repository/);

  await mkdir(path.join(root, "linked"));
  await writeFile(path.join(root, "linked", "index.html"), "ok");
  await symlink(path.join(root, "empty"), path.join(root, "linked", "outside"));
  await assert.rejects(validateProjectDirectory(root, "linked"), /Symlinks/);
});

test("adds deployment URLs after slug and preserves other metadata", () => {
  const entries = [{ title: "Pending", slug: "pending", createdAt: "2026-10-06" }];
  assert.deepEqual(
    applyDeploymentUrls(entries, new Map([["pending", "https://pending.vercel.app/"]])),
    [{ title: "Pending", slug: "pending", url: "https://pending.vercel.app/", createdAt: "2026-10-06" }],
  );
  assert.deepEqual(entries, [{ title: "Pending", slug: "pending", createdAt: "2026-10-06" }]);
});

test("participants cannot add or replace deployment URLs", () => {
  const base = [{ slug: "existing", url: "https://existing.vercel.app/" }];
  assert.doesNotThrow(() => validateParticipantUrls(base, base));
  assert.doesNotThrow(() => validateParticipantUrls([...base, { slug: "new-project" }], base));
  assert.throws(
    () => validateParticipantUrls([...base, { slug: "new-project", url: "https://manual.example.com/" }], base),
    /workflow owns this field/,
  );
  assert.throws(
    () => validateParticipantUrls([{ slug: "existing", url: "https://changed.example.com/" }], base),
    /workflow owns this field/,
  );
  assert.throws(
    () => validateParticipantUrls([...base, { slug: "new-project", sample: true }], base),
    /reserved sample flag/,
  );
  assert.throws(
    () => validateParticipantUrls([], base),
    /cannot be removed or re-slugged/,
  );
});

test("formats project metadata with two-space indentation and compact tools", () => {
  const output = formatProjectsJson([{ title: "Project", tools: ["Claude", "Cursor"], slug: "project" }]);
  assert.equal(
    output,
    '[\n  {\n    "title": "Project",\n    "tools": ["Claude", "Cursor"],\n    "slug": "project"\n  }\n]\n',
  );
  assert.deepEqual(JSON.parse(output)[0].tools, ["Claude", "Cursor"]);
});
