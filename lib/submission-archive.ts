import * as yauzl from "yauzl";
import { crc32 } from "node:zlib";
import { ARCHIVE_LIMITS, MAX_EXPANDED_BYTES, MAX_FILE_BYTES, MAX_FILES, MAX_ZIP_BYTES, SubmissionInputError } from "./submissions.ts";

const SECRET = /-----BEGIN (?:[A-Z ]+ )?PRIVATE KEY-----|(?:gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,}|AKIA[A-Z0-9]{16}|sk-(?:proj-)?[A-Za-z0-9_-]{20,})|(?:api[_-]?key|secret|password|access[_-]?token)\s*[:=]\s*["'](?!YOUR_|EXAMPLE|REPLACE|<)[^"'\s]{12,}["']/i;
const FORBIDDEN = /^(?:node_modules|\.git|\.vercel|\.next|__MACOSX|\.DS_Store|\.npmrc|\.netrc|id_rsa|id_ed25519|\.env(?:\..*)?)$/i;

export function validateArchivePath(name: string) {
  if (!name || name.length > 240 || /[\\\x00-\x1f\x7f:]/.test(name) || name.startsWith("/") ||
      name.split("/").some((part) => part === "." || part === ".." ||
        (part !== ".env.example" && FORBIDDEN.test(part)) || /\.(?:pem|key|p12|pfx)$/i.test(part))) {
    throw new SubmissionInputError(`Unsafe or excluded ZIP path: ${name.slice(0, 100)}`);
  }
  const parts = name.replace(/\/$/, "").split("/");
  if (parts.some((part) => !part || part.endsWith(".") || part.endsWith(" "))) {
    throw new SubmissionInputError("ZIP contains an ambiguous filename.");
  }
}

export async function inspectArchive(bytes: Buffer): Promise<Map<string, Buffer>> {
  if (bytes.length > MAX_ZIP_BYTES) throw new SubmissionInputError("ZIP must be 25 MiB or smaller.");
  return new Promise((resolve, reject) => {
    yauzl.fromBuffer(bytes, { lazyEntries: true, validateEntrySizes: true, strictFileNames: true }, (error, zip) => {
      if (error || !zip) return reject(new SubmissionInputError("Upload a valid, unencrypted ZIP file."));
      const files = new Map<string, Buffer>();
      const seen = new Set<string>();
      let total = 0;
      let count = 0;
      let stopped = false;
      const fail = (error: unknown) => {
        if (stopped) return;
        stopped = true;
        zip.close();
        reject(error instanceof SubmissionInputError ? error : new SubmissionInputError("ZIP could not be safely read."));
      };
      zip.on("error", fail);
      zip.on("entry", (entry: yauzl.Entry) => {
        try {
          validateArchivePath(entry.fileName);
          if (++count > MAX_FILES) throw new SubmissionInputError("ZIP may contain at most 300 entries.");
          const key = entry.fileName.toLowerCase().replace(/\/$/, "");
          if (seen.has(key)) throw new SubmissionInputError("ZIP contains duplicate filenames.");
          seen.add(key);
          const mode = (entry.externalFileAttributes >>> 16) & 0xf000;
          if (mode && mode !== 0x8000 && mode !== 0x4000) {
            throw new SubmissionInputError("ZIP links and special files are not allowed.");
          }
          if (entry.generalPurposeBitFlag & 1) throw new SubmissionInputError("Encrypted ZIP files are not accepted.");
          total += entry.uncompressedSize;
          if (total > MAX_EXPANDED_BYTES || entry.uncompressedSize > MAX_FILE_BYTES) {
            throw new SubmissionInputError(`ZIP exceeds the archive limits: ${ARCHIVE_LIMITS}.`);
          }
          if (entry.fileName.endsWith("/")) return zip.readEntry();
          zip.openReadStream(entry, (error, stream) => {
            if (error || !stream) return fail(error);
            const chunks: Buffer[] = [];
            let size = 0;
            stream.on("error", fail);
            stream.on("data", (chunk: Buffer) => {
              size += chunk.length;
              if (size > entry.uncompressedSize || size > MAX_FILE_BYTES) {
                stream.destroy();
                fail(new SubmissionInputError("ZIP entry exceeds its declared size."));
              } else {
                chunks.push(chunk);
              }
            });
            stream.on("end", () => {
              if (stopped) return;
              const content = Buffer.concat(chunks);
              if (crc32(content) !== entry.crc32) {
                return fail(new SubmissionInputError("ZIP contains a damaged file. Recreate the archive and try again."));
              }
              if (SECRET.test(content.toString("utf8"))) {
                return fail(new SubmissionInputError("Potential credentials found. Remove secrets before submitting."));
              }
              files.set(entry.fileName, content);
              zip.readEntry();
            });
          });
        } catch (error) {
          fail(error);
        }
      });
      zip.on("end", () => {
        if (stopped) return;
        if (!files.size) return fail(new SubmissionInputError("ZIP is empty."));
        // Accept an optional single wrapper folder, as produced by common ZIP tools.
        const roots = new Set([...files.keys()].map((name) => name.split("/")[0]));
        const wrapped = roots.size === 1 && [...files.keys()].every((name) => name.includes("/"));
        const normalized = new Map([...files].map(([name, content]) => [
          wrapped ? name.slice(name.indexOf("/") + 1) : name, content,
        ]));
        if ([...normalized.keys()].some((name) =>
          name.split("/").slice(0, -1).some((_, index, parts) => normalized.has(parts.slice(0, index + 1).join("/"))))) {
          return fail(new SubmissionInputError("ZIP uses a file as a directory."));
        }
        if (!["index.html", "package.json", "vercel.json"].some((name) => normalized.has(name))) {
          return fail(new SubmissionInputError("Project root must contain index.html, package.json, or vercel.json."));
        }
        resolve(normalized);
      });
      zip.readEntry();
    });
  });
}

export function staticSiteIssue(files: Map<string, Buffer>): string | null {
  if (!files.has("index.html")) return "Export a static site with index.html at the ZIP root, or wait for a supported isolated framework builder.";
  if ([...files.keys()].some((name) => /(?:^|\/)(?:api|functions|\.vercel|node_modules)(?:\/|$)|\.(?:php|py|rb|sh|exe|dll|wasm)$/i.test(name))) {
    return "Server code or executable files require manual review; only static exports can be published automatically.";
  }
  if (files.has("package.json") || files.has("vercel.json")) {
    return "Source/build configuration requires manual review. Submit only the exported static assets for automatic publication.";
  }
  if ([...files.keys()].some((name) =>
    name.split("/").some((part) => part.startsWith(".")) ||
    !/\.(?:html?|css|[cm]?js|json|svg|png|jpe?g|gif|webp|avif|ico|woff2?|ttf|otf|txt|xml|map|mp4|webm|mp3|wav)$/i.test(name))) {
    return "This export includes unsupported or hidden files and needs manual review.";
  }
  return null;
}
