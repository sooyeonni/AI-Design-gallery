import { chromium } from "playwright";
import { readFile } from "node:fs/promises";
import { once } from "node:events";
import { projectServer } from "./server.mjs";

const slugs = JSON.parse(await readFile("/source/_thumbnail-projects.json", "utf8"));
if (!Array.isArray(slugs) || slugs.some((slug) => typeof slug !== "string" || !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) ||
    new Set(slugs).size !== slugs.length) {
  throw new Error("Invalid thumbnail project manifest.");
}

for (const slug of slugs) {
  // Each project gets a fresh browser and a server exposing only its own export.
  const failures = [];
  const server = projectServer("/source", slug, (error) => failures.push(error.message));
  server.listen(8080, "127.0.0.1");
  await once(server, "listening");
  let browser;
  try {
    browser = await chromium.launch({ chromiumSandbox: false });
    const context = await browser.newContext({
      viewport: { width: 1280, height: 720 },
      deviceScaleFactor: 1,
      reducedMotion: "reduce",
      colorScheme: "light",
      serviceWorkers: "block",
      acceptDownloads: false,
    });
    const origin = "http://127.0.0.1:8080";
    await context.route("**/*", (route) => {
      if (new URL(route.request().url()).origin === origin) return route.continue();
      return route.abort("blockedbyclient");
    });
    await context.routeWebSocket(/.*/, (socket) => socket.close());
    const page = await context.newPage();
    page.on("pageerror", (error) => failures.push(error.message));
    const response = await page.goto(`${origin}/AI-Design-gallery/projects/${slug}/`, {
      waitUntil: "load", timeout: 30_000,
    });
    if (!response?.ok()) throw new Error(`Opening screen failed to load for ${slug}.`);
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(3000);
    if (failures.length) throw new Error(`Project ${slug} has capture errors: ${failures.join("; ")}`);
    await page.screenshot({
      path: `/output/${slug}.png`,
      type: "png",
      animations: "disabled",
      timeout: 15_000,
    });
    console.log(`Captured ${slug}: 1280x720.`);
  } finally {
    if (browser) await browser.close();
    server.closeAllConnections();
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
}
