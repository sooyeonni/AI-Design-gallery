import http from "node:http";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

const types = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".json": "application/json" };
const server = http.createServer(async (req, res) => {
  const name = decodeURIComponent(new URL(req.url, "http://127.0.0.1").pathname);
  const target = path.resolve("/source", `.${name === "/" ? "/index.html" : name}`);
  if (!target.startsWith("/source/")) { res.writeHead(403).end(); return; }
  try {
    const body = await readFile(target);
    res.setHeader("Content-Type", types[path.extname(target)] || "application/octet-stream");
    res.end(body);
  } catch (error) {
    if (error.code === "ENOENT" || error.code === "EISDIR") res.writeHead(404).end();
    else { console.error("Static preview failed", error); res.writeHead(500).end(); }
  }
});
await new Promise((resolve) => server.listen(8080, "127.0.0.1", resolve));
let browser;
try {
  browser = await chromium.launch({ args: ["--disable-dev-shm-usage"] });
  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror", () => errors.push("JavaScript runtime error"));
  page.on("response", (response) => {
    if (response.url().startsWith("http://127.0.0.1:8080/") && response.status() >= 400) errors.push("Missing static asset");
  });
  await page.route("**/*", (route) => {
    const url = new URL(route.request().url());
    if (url.origin === "http://127.0.0.1:8080") return route.continue();
    errors.push("External network dependency");
    return route.abort();
  });
  for (const width of [1152, 390]) {
    await page.setViewportSize({ width, height: 850 });
    const response = await page.goto("http://127.0.0.1:8080", { waitUntil: "networkidle", timeout: 15000 });
    if (response?.status() !== 200) throw new Error("Static entry point did not load.");
    const visible = await page.locator("body").evaluate((body) => {
      const style = getComputedStyle(body);
      return style.display !== "none" && style.visibility !== "hidden" &&
        (body.innerText.trim().length > 0 || !!body.querySelector("canvas,img,svg,video"));
    });
    if (!visible) throw new Error("Static preview is empty.");
  }
  if (errors.length) throw new Error([...new Set(errors)].join("; "));
  console.log("Static preview passed desktop/mobile smoke checks.");
} finally {
  await browser?.close();
  server.close();
}
