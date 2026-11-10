import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import path from "node:path";

const types = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css",
  ".js": "text/javascript",
  ".mjs": "text/javascript",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".otf": "font/otf",
  ".wasm": "application/wasm",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
};

export function projectServer(root, slug, onError) {
  const prefix = `/AI-Design-gallery/projects/${slug}/`;
  const directory = path.resolve(root, "projects", slug);
  return createServer(async (request, response) => {
    try {
      const pathname = decodeURIComponent(new URL(request.url, "http://localhost").pathname);
      if (!pathname.startsWith(prefix) || !["GET", "HEAD"].includes(request.method)) {
        response.writeHead(404).end();
        return;
      }
      let relative = pathname.slice(prefix.length);
      if (!relative || relative.endsWith("/")) relative += "index.html";
      const file = path.resolve(directory, relative);
      if (!file.startsWith(`${directory}${path.sep}`)) {
        response.writeHead(403).end();
        return;
      }
      const contents = await readFile(file);
      response.writeHead(200, {
        "Content-Type": types[path.extname(file).toLowerCase()] ?? "application/octet-stream",
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "no-store",
      });
      response.end(request.method === "HEAD" ? undefined : contents);
    } catch (error) {
      const missing = error.code === "ENOENT" || error.code === "EISDIR";
      const malformed = error instanceof URIError || error.code === "ERR_INVALID_ARG_VALUE";
      if (!missing && !malformed) onError(error);
      response.writeHead(missing ? 404 : malformed ? 400 : 500).end();
    }
  });
}
