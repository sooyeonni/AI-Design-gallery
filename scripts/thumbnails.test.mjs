import assert from "node:assert/strict";
import { test } from "node:test";
import { mkdtemp, mkdir, writeFile, readFile, rm, symlink, access } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { once } from "node:events";
import { crc32, deflateSync } from "node:zlib";
import { finishThumbnails } from "./finish-thumbnails.mjs";
import { projectServer } from "./thumbnail-worker/server.mjs";

async function fixture(t) {
  const root = await mkdtemp(path.join(tmpdir(), "gallery-thumbnails-test-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const site = path.join(root, "site");
  const output = path.join(root, "output");
  await mkdir(site);
  await mkdir(output);
  await writeFile(path.join(site, "_thumbnail-projects.json"), '["demo"]');
  return { root, site, output };
}

function png(width = 1280, height = 720) {
  const chunk = (type, data) => {
    const body = Buffer.concat([Buffer.from(type), data]);
    const result = Buffer.alloc(body.length + 8);
    result.writeUInt32BE(data.length);
    body.copy(result, 4);
    result.writeUInt32BE(crc32(body), result.length - 4);
    return result;
  };
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width);
  header.writeUInt32BE(height, 4);
  header[8] = 8;
  header[9] = 2;
  return Buffer.concat([
    Buffer.from("89504e470d0a1a0a", "hex"),
    chunk("IHDR", header),
    chunk("IDAT", deflateSync(Buffer.alloc((width * 3 + 1) * height))),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

test("installs exact screenshot bytes and removes the private build manifest", async (t) => {
  const { site, output } = await fixture(t);
  const image = png();
  await writeFile(path.join(output, "demo.png"), image);
  await writeFile(path.join(output, "unexpected.html"), "<script>ignored</script>");
  await finishThumbnails(site, output);
  assert.deepEqual(await readFile(path.join(site, "thumbnails/demo.png")), image);
  await assert.rejects(access(path.join(site, "_thumbnail-projects.json")));
  await assert.rejects(access(path.join(site, "thumbnails/unexpected.html")));
});

test("missing, oversized, non-PNG and incorrect-size screenshots stop publication", async (t) => {
  const { site, output } = await fixture(t);
  await assert.rejects(finishThumbnails(site, output), /ENOENT/);
  for (const image of [Buffer.alloc(10), Buffer.alloc(5 * 1024 * 1024 + 1), Buffer.alloc(100), png(640, 360)]) {
    await writeFile(path.join(output, "demo.png"), image);
    await assert.rejects(finishThumbnails(site, output), /Invalid screenshot|1280x720 PNG/);
    await access(path.join(site, "_thumbnail-projects.json"));
  }
});

test("symlink output and invalid manifest paths are rejected", async (t) => {
  const { site, output, root } = await fixture(t);
  await writeFile(path.join(root, "other.png"), png());
  await symlink(path.join(root, "other.png"), path.join(output, "demo.png"));
  await assert.rejects(finishThumbnails(site, output), /Invalid screenshot/);
  for (const slugs of [["../escape"], ["demo", "demo"], [42], {}]) {
    await writeFile(path.join(site, "_thumbnail-projects.json"), JSON.stringify(slugs));
    await assert.rejects(finishThumbnails(site, output), /Invalid thumbnail project manifest/);
  }
});

test("empty galleries do not require a screenshot", async (t) => {
  const { site, output } = await fixture(t);
  await writeFile(path.join(site, "_thumbnail-projects.json"), "[]");
  await finishThumbnails(site, output);
  await assert.rejects(access(path.join(site, "_thumbnail-projects.json")));
});

test("capture server serves only one project at its real Pages path with correct MIME types", async (t) => {
  const { site } = await fixture(t);
  const directory = path.join(site, "projects/demo");
  await mkdir(directory, { recursive: true });
  for (const [file, contents] of [
    ["index.html", "<h1>Demo</h1>"], ["app.js", "export {};"], ["model.wasm", "wasm"],
    ["font.woff2", "font"], ["with space.svg", "<svg/>"],
  ]) await writeFile(path.join(directory, file), contents);
  await mkdir(path.join(site, "projects/other"));
  await writeFile(path.join(site, "projects/other/index.html"), "Private to other project");
  const errors = [];
  const server = projectServer(site, "demo", (error) => errors.push(error));
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  t.after(() => new Promise((resolve) => {
    server.closeAllConnections();
    server.close(resolve);
  }));
  const base = `http://127.0.0.1:${server.address().port}/AI-Design-gallery/projects/`;
  assert.equal(await (await fetch(`${base}demo/`)).text(), "<h1>Demo</h1>");
  for (const [file, type] of [
    ["app.js", "text/javascript"], ["model.wasm", "application/wasm"], ["font.woff2", "font/woff2"],
  ]) assert.equal((await fetch(`${base}demo/${file}`)).headers.get("content-type"), type);
  assert.equal((await fetch(`${base}demo/with%20space.svg`)).status, 200);
  assert.equal((await fetch(`${base}demo/app.js`, { method: "HEAD" })).headers.get("content-type"), "text/javascript");
  for (const suffix of ["other/", "demo/missing", "demo/%2e%2e%2fother/index.html", "demo/%ZZ", "demo/%00"]) {
    assert.ok((await fetch(`${base}${suffix}`)).status >= 400, suffix);
  }
  assert.equal((await fetch(`${base}demo/`, { method: "POST" })).status, 404);
  assert.deepEqual(errors, []);
});
