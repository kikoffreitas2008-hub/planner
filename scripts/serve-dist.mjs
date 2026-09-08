// Zero-dependency static server for the exported web build (`dist/`).
// Use this instead of the Metro dev server for long testing sessions —
// Metro's watcher leaks memory over time. Run: node scripts/serve-dist.mjs
//
// Local dev tool only: bound to loopback, and every request is handled
// defensively so a malformed URL can't crash the process (a bare `async`
// request handler throwing turns into an unhandled rejection, which recent
// Node versions treat as fatal).
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, join, normalize, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

// fileURLToPath decodes percent-encoding and handles the Windows drive letter;
// reading `new URL(...).pathname` by hand left "%20" literal when the project
// path contains a space, so every request 404'd.
const ROOT = resolve(fileURLToPath(new URL("../dist/", import.meta.url)));
const PORT = Number(process.env.PORT ?? 8081);
const HOST = process.env.HOST ?? "127.0.0.1";

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
};

/** Resolve `path` and confirm it is still inside ROOT (blocks any `..` escape). */
function withinRoot(path) {
  const resolved = resolve(path);
  return resolved === ROOT || resolved.startsWith(ROOT + sep) ? resolved : null;
}

async function tryFile(path) {
  const contained = withinRoot(path);
  if (!contained) return null;
  try {
    const s = await stat(contained);
    if (s.isFile()) return contained;
    if (s.isDirectory()) return tryFile(join(contained, "index.html"));
  } catch {
    /* not found */
  }
  return null;
}

async function handleRequest(req, res) {
  let pathname = "/";
  try {
    pathname = decodeURIComponent((req.url ?? "/").split("?")[0]);
  } catch {
    res.writeHead(400).end("Bad request");
    return;
  }
  const safe = normalize(pathname);

  let file = await tryFile(join(ROOT, safe));
  if (!file && !extname(safe)) file = await tryFile(join(ROOT, `${safe}.html`));
  if (!file) file = await tryFile(join(ROOT, "index.html")); // SPA fallback

  if (!file) {
    res.writeHead(404).end("Not found");
    return;
  }
  const body = await readFile(file);
  res.writeHead(200, {
    "content-type": TYPES[extname(file)] ?? "application/octet-stream",
    "cache-control": "no-cache",
  });
  res.end(body);
}

const server = createServer((req, res) => {
  req.on("error", () => res.destroy());
  res.on("error", () => {});
  handleRequest(req, res).catch((error) => {
    console.error("[serve-dist]", error);
    if (!res.headersSent) res.writeHead(500).end("Server error");
    else res.destroy();
  });
});

server.on("error", (error) => {
  console.error("[serve-dist] server error:", error);
});

server.listen(PORT, HOST, () => {
  console.log(`Serving dist/ on http://${HOST}:${PORT}`);
});
