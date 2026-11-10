import { lstat, readFile, mkdir, writeFile, rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

export async function finishThumbnails(site, screenshots) {
  const manifest = path.join(site, "_thumbnail-projects.json");
  const slugs = JSON.parse(await readFile(manifest, "utf8"));
  if (!Array.isArray(slugs) || slugs.some((slug) => typeof slug !== "string" || !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) ||
      new Set(slugs).size !== slugs.length) {
    throw new Error("Invalid thumbnail project manifest.");
  }
  await mkdir(path.join(site, "thumbnails"), { recursive: true });
  for (const slug of slugs) {
    const source = path.join(screenshots, `${slug}.png`);
    const stat = await lstat(source);
    if (!stat.isFile() || stat.size > 5 * 1024 * 1024 || stat.size < 33) {
      throw new Error(`Invalid screenshot file: ${slug}`);
    }
    const image = await readFile(source);
    if (image.subarray(0, 8).toString("hex") !== "89504e470d0a1a0a" ||
        image.toString("ascii", 12, 16) !== "IHDR" ||
        image.readUInt32BE(16) !== 1280 || image.readUInt32BE(20) !== 720) {
      throw new Error(`Screenshot must be a 1280x720 PNG: ${slug}`);
    }
    await writeFile(path.join(site, "thumbnails", `${slug}.png`), image);
  }
  await rm(manifest);
  console.log(`Installed ${slugs.length} generated thumbnails.`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (process.argv.length !== 4) throw new Error("Usage: node scripts/finish-thumbnails.mjs <site> <screenshots>");
  await finishThumbnails(path.resolve(process.argv[2]), path.resolve(process.argv[3]));
}
