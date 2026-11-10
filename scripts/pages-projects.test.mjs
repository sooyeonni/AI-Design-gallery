import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile, readFile, rm, symlink, truncate } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { copyPagesProject, validatePagesProject } from "./pages-projects.mjs";

async function fixture(run) {
  const root = await mkdtemp(path.join(os.tmpdir(), "pages-test-"));
  const directory = path.join(root, "example");
  await mkdir(directory);
  try { await run(root, directory); }
  finally { await rm(root, { recursive: true, force: true }); }
}

test("Pages accepts static local MediaPipe assets without executing submitted code", async () => {
  await fixture(async (root, directory) => {
    for (const [file, data] of Object.entries({
      "index.html": '<script src="./assets/main.js"></script>',
      "assets/main.js": 'throw new Error("must never execute in CI")',
      "assets/vision.wasm": "wasm", "assets/hand.task": "model",
    })) {
      await mkdir(path.dirname(path.join(directory, file)), { recursive: true });
      await writeFile(path.join(directory, file), data);
    }
    const result = await validatePagesProject(root, "example");
    assert.equal(result.files.length, 4);
    assert.ok(result.bytes > 0);
    const output = path.join(root, "out");
    await copyPagesProject({ slug: "example", ...result }, output);
    assert.equal(await readFile(path.join(output, "projects/example/assets/hand.task"), "utf8"), "model");
    assert.equal(await readFile(path.join(output, "projects/example/index.html"), "utf8"),
      '<script src="./assets/main.js"></script>');
  });
});

test("Pages rejects source configuration, hidden files, symlinks, credentials and oversized assets", async () => {
  for (const filename of ["package.json", "vercel.json", ".env", ".hidden.txt", "server.py", "project.zip"]) {
    await fixture(async (root, directory) => {
      await writeFile(path.join(directory, "index.html"), "Hello");
      await writeFile(path.join(directory, filename), "{}");
      await assert.rejects(validatePagesProject(root, "example"));
    });
  }
  await fixture(async (root, directory) => {
    await writeFile(path.join(directory, "index.html"), "Hello");
    await symlink(path.join(directory, "index.html"), path.join(directory, "linked.html"));
    await assert.rejects(validatePagesProject(root, "example"), /file type/);
  });
  await fixture(async (root, directory) => {
    await writeFile(path.join(directory, "index.html"), "-----BEGIN PRIVATE KEY-----");
    await assert.rejects(validatePagesProject(root, "example"), /credentials/);
  });
  await fixture(async (root, directory) => {
    await writeFile(path.join(directory, "index.html"), "");
    await truncate(path.join(directory, "index.html"), 20 * 1024 * 1024 + 1);
    await assert.rejects(validatePagesProject(root, "example"), /20 MiB/);
  });
  await fixture(async (root, directory) => {
    await writeFile(path.join(directory, "main.js"), "hello");
    await assert.rejects(validatePagesProject(root, "example"), /index.html/);
  });
});
