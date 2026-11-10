import assert from "node:assert/strict";
import { test } from "node:test";
import { randomBytes } from "node:crypto";
import { deflateRawSync, crc32 } from "node:zlib";
import { inspectArchive, staticSiteIssue, validateArchivePath } from "./submission-archive.ts";
import { MAX_EXPANDED_BYTES, MAX_FILE_BYTES, MAX_ZIP_BYTES, parseSubmissionMetadata, publicSubmission, submissionSlug } from "./submissions.ts";
import { boundedBytes, clientUploadOptions, parseUploadReceipt, parseUploadRequest, uploadJson, UPLOAD_WINDOW_MS } from "./submission-upload.ts";
import { deploymentUrl, localReviewUrl, parseReviewDecision, reviewAndPublish, reviewFiles } from "./submission-review.ts";
import type { Submission } from "./submissions.ts";

// Small, real ZIP fixtures without invoking a shell or a participant build.
function zip(entries: { name: string; content?: string | Buffer; mode?: number; size?: number; stored?: boolean }[]) {
  const local: Buffer[] = [];
  const central: Buffer[] = [];
  let offset = 0;
  for (const entry of entries) {
    const name = Buffer.from(entry.name);
    const content = Buffer.from(entry.content || "");
    const compressed = entry.stored ? content : deflateRawSync(content);
    const header = Buffer.alloc(30);
    header.writeUInt32LE(0x04034b50);
    header.writeUInt16LE(20, 4);
    header.writeUInt16LE(entry.stored ? 0 : 8, 8);
    header.writeUInt32LE(crc32(content), 14);
    header.writeUInt32LE(compressed.length, 18);
    header.writeUInt32LE(entry.size ?? content.length, 22);
    header.writeUInt16LE(name.length, 26);
    local.push(header, name, compressed);
    const index = Buffer.alloc(46);
    index.writeUInt32LE(0x02014b50);
    index.writeUInt16LE(0x0314, 4);
    header.copy(index, 6, 4, 28);
    index.writeUInt32LE(((entry.mode ?? 0x81a4) << 16) >>> 0, 38);
    index.writeUInt32LE(offset, 42);
    central.push(index, name);
    offset += header.length + name.length + compressed.length;
  }
  const directory = Buffer.concat(central);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(directory.length, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...local, directory, end]);
}

test("metadata validates category, tool names, limits and unique server slug", () => {
  const metadata = { title: "Test", author: "Soo", category: "Slides", tools: ["Claude", "Claude"] };
  assert.deepEqual(parseSubmissionMetadata(metadata).tools, ["Claude"]);
  for (const invalid of [{ ...metadata, title: "" }, { ...metadata, category: "Website" },
    { ...metadata, tools: [""] }, { ...metadata, author: "a".repeat(81) }]) {
    assert.throws(() => parseSubmissionMetadata(invalid));
  }
  assert.match(submissionSlug("테스트", "550e8400-e29b-41d4-a716-446655440000"), /^project-[a-f0-9]{32}$/);
});

test("ZIP accepts flat and wrapped static projects", async () => {
  for (const prefix of ["", "my-project/"]) {
    const files = await inspectArchive(zip([
      { name: `${prefix}index.html`, content: "<h1>Hello</h1>" },
      { name: `${prefix}assets/main.css`, content: "body {color: black}" },
    ]));
    assert.equal(files.get("index.html")?.toString(), "<h1>Hello</h1>");
    assert.equal(staticSiteIssue(files), null);
  }
});

test("ZIP accepts exactly 25 MiB compressed and rejects one byte more", async () => {
  const overhead = zip([{ name: "index.html", stored: true }, { name: "a.bin", stored: true }, { name: "b.bin", stored: true }]).length;
  const content = randomBytes(MAX_ZIP_BYTES - overhead);
  const archive = zip([
    { name: "index.html", stored: true },
    { name: "a.bin", content: content.subarray(0, 13 * 1024 * 1024), stored: true },
    { name: "b.bin", content: content.subarray(13 * 1024 * 1024), stored: true },
  ]);
  assert.equal(archive.length, 25 * 1024 * 1024);
  assert.equal((await inspectArchive(archive)).size, 3);
  await assert.rejects(inspectArchive(Buffer.concat([archive, Buffer.alloc(1)])), /25 MiB/);
});

test("ZIP accepts 100 MiB expanded and 20 MiB per file, rejects either overflow", async () => {
  const entries = [
    { name: "index.html", content: "" },
    ...Array.from({ length: 5 }, (_, i) => ({ name: `asset-${i}.bin`, content: Buffer.alloc(MAX_FILE_BYTES) })),
  ];
  assert.equal(MAX_EXPANDED_BYTES, 100 * 1024 * 1024);
  const files = await inspectArchive(zip(entries));
  assert.equal([...files.values()].reduce((total, file) => total + file.length, 0), MAX_EXPANDED_BYTES);
  await assert.rejects(inspectArchive(zip([...entries, { name: "extra.txt", content: "x" }])), /archive limits/);
  await assert.rejects(inspectArchive(zip([{ name: "index.html", size: MAX_FILE_BYTES + 1 }])), /archive limits/);
});

test("MediaPipe-sized assets pass intake but unsupported models and WASM remain held", async () => {
  const files = await inspectArchive(zip([
    { name: "index.html", content: "<h1>Camera app</h1>" },
    { name: "mediapipe/models/hand_landmarker.task", content: Buffer.alloc(Math.ceil(12.89 * 1024 * 1024)) },
    { name: "mediapipe/vision.wasm", content: "wasm" },
  ]));
  assert.match(staticSiteIssue(files)!, /manual review/);
});

test("direct upload validates declared sizes, metadata, consent, anti-bot token and receipt", () => {
  const data = {
    title: "Test", author: "Soo", category: "Tool", tools: ["Claude"],
    consent: "yes", challenge: "challenge", filename: "project.zip", size: MAX_ZIP_BYTES,
  };
  assert.equal(parseUploadRequest(data).size, MAX_ZIP_BYTES);
  for (const invalid of [
    { size: MAX_ZIP_BYTES + 1 }, { size: 0 }, { size: -1 }, { size: 1.5 }, { size: "1" },
    { filename: "project.html" }, { consent: "no" }, { challenge: "" }, { category: "invalid" },
  ]) assert.throws(() => parseUploadRequest({ ...data, ...invalid }));
  const receipt = { id: "550e8400-e29b-41d4-a716-446655440000", token: "a".repeat(64) };
  assert.deepEqual(parseUploadReceipt(receipt), receipt);
  for (const invalid of [{ ...receipt, id: "id&status=eq.published" }, { ...receipt, token: "" }]) {
    assert.throws(() => parseUploadReceipt(invalid));
  }
  assert.deepEqual(clientUploadOptions(`submissions/${receipt.id}/project.zip`, data.size, 1000), {
    pathname: `submissions/${receipt.id}/project.zip`, maximumSizeInBytes: MAX_ZIP_BYTES,
    allowedContentTypes: ["application/zip"], validUntil: 1000 + UPLOAD_WINDOW_MS,
    addRandomSuffix: false, allowOverwrite: false,
  });
});

test("direct upload bounds streamed JSON and Blob downloads without trusting content-length", async () => {
  const stream = (chunks: Uint8Array[]) => new ReadableStream<Uint8Array>({
    start(controller) { for (const chunk of chunks) controller.enqueue(chunk); controller.close(); },
  });
  assert.equal((await boundedBytes(stream([Buffer.alloc(10), Buffer.alloc(10)]), 20)).length, 20);
  await assert.rejects(boundedBytes(stream([Buffer.alloc(10), Buffer.alloc(11)]), 20), /size/);
  const request = (body: string, type = "application/json") => new Request("https://gallery.example/api/submissions", {
    method: "POST", headers: { "Content-Type": type, "Content-Length": "1" }, body,
  });
  assert.deepEqual(await uploadJson(request('{"title":"Test"}')), { title: "Test" });
  for (const body of ["null", "[]", "{", " ".repeat(16 * 1024 + 1)]) {
    await assert.rejects(uploadJson(request(body)));
  }
  await assert.rejects(uploadJson(request("{}", "text/plain")));
});

test("ZIP rejects traversal, symlinks, secrets, generated files and duplicates", async () => {
  for (const name of ["../index.html", "/index.html", "a\\index.html", "a/../index.html",
    ".env", "nested/.env.production", "node_modules/a.js", ".git/config", ".npmrc", "a/key.pem"]) {
    assert.throws(() => validateArchivePath(name), Error, name);
  }
  for (const entries of [
    [{ name: "index.html", mode: 0xa1ff }],
    [{ name: "index.html", content: "-----BEGIN PRIVATE KEY-----" }],
    [{ name: "index.html" }, { name: "INDEX.html" }],
    [{ name: "index.html" }, { name: "assets", content: "file" }, { name: "assets/main.js" }],
    [{ name: "readme.txt" }],
    [{ name: "index.html", size: 21 * 1024 * 1024 }],
    Array.from({ length: 301 }, (_, i) => ({ name: `${i}.html` })),
  ]) {
    await assert.rejects(inspectArchive(zip(entries)));
  }
  await assert.rejects(inspectArchive(Buffer.alloc(MAX_ZIP_BYTES + 1)));
  await assert.rejects(inspectArchive(Buffer.from("not a ZIP")));
  const damaged = zip([{ name: "index.html", content: "Hello" }]);
  // Corrupt the central-directory CRC without changing compressed bytes.
  const end = damaged.length - 22;
  const directoryOffset = damaged.readUInt32LE(end + 16);
  damaged.writeUInt32LE(0, directoryOffset + 16);
  await assert.rejects(inspectArchive(damaged), /damaged/);
});

test("source projects and unknown binaries are held, not executed or auto-published", () => {
  for (const names of [["package.json"], ["index.html", "package.json"], ["index.html", "api/index.js"],
    ["index.html", "payload.exe"], ["index.html", ".hidden.txt"], ["index.html", "vercel.json"]]) {
    assert.ok(staticSiteIssue(new Map(names.map((name) => [name, Buffer.from("{}")]))));
  }
});

test("review responses and endpoints are fail-closed", () => {
  for (const data of [null, {}, { verdict: "approve" }, { verdict: "approved", summary: "ok" },
    { verdict: "approve", summary: "x".repeat(1001) }]) assert.throws(() => parseReviewDecision(data));
  assert.equal(parseReviewDecision({ verdict: "approve", summary: " Reviewed " }).summary, "Reviewed");
  assert.equal(localReviewUrl("http://127.0.0.1:8000/review").hostname, "127.0.0.1");
  for (const url of ["https://external-ai.example/review", "http://127.0.0.1.evil.example", "file:///tmp/model"]) {
    assert.throws(() => localReviewUrl(url));
  }
  assert.throws(() => reviewFiles(new Map([["index.html", Buffer.alloc(200 * 1024 + 1)]])));
  for (const url of ["http://test.vercel.app", "https://evil.example", "https://test.vercel.app.evil.example",
    "https://test.vercel.app/path", "https://user:test@test.vercel.app"]) assert.throws(() => deploymentUrl(url));
});

test("publication requires approval, successful isolated preview, and a valid deployment in order", async () => {
  const files = new Map([["index.html", Buffer.from("<h1>Hello</h1>")]]);
  const calls: string[] = [];
  const services = {
    review: async () => { calls.push("review"); return { verdict: "approve", summary: "ok" }; },
    preview: async () => { calls.push("preview"); },
    deploy: async () => { calls.push("deploy"); return "https://test.vercel.app"; },
  };
  const result = await reviewAndPublish(files, services);
  assert.equal(result.status, "published");
  assert.deepEqual(calls, ["review", "preview", "deploy"]);
  calls.length = 0;
  const held = await reviewAndPublish(files, { ...services, review: async () => ({ verdict: "needs_review", summary: "Uncertain" }) });
  assert.equal(held.status, "needs_review");
  assert.deepEqual(calls, []);
  await assert.rejects(reviewAndPublish(files, { ...services, preview: async () => { throw new Error("Preview failed"); } }));
  assert.deepEqual(calls, ["review"]);
  calls.length = 0;
  await assert.rejects(reviewAndPublish(files, { ...services, deploy: async () => "https://external.example" }));
  assert.deepEqual(calls, ["review", "preview"]);
});

test("public receipts do not expose private paths, hashes or leases", () => {
  const submission: Submission = {
    id: "id", title: "Title", author: "Soo", category: "Slides", tools: ["Claude"],
    slug: "title-id", status: "needs_review", feedback: "Pending", created_at: "2026-11-09",
    blob_path: "private/path", archive_sha256: "hash", deployment_url: "https://test.vercel.app",
    lease_token: "private-lease",
  };
  assert.deepEqual(Object.keys(publicSubmission(submission)), ["id", "title", "status", "feedback", "url"]);
  assert.equal(publicSubmission(submission).url, null);
});
