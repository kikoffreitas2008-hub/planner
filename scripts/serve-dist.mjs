// Zero-dependency static server for the exported web build (`dist/`).
// Use this instead of the Metro dev server for long testing sessions —
// Metro's watcher leaks memory over time. Run: node scripts/serve-dist.mjs
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, join, normalize } from "node:path";

const ROOT = new URL("../dist/", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const PORT = Number(process.env.PORT ?? 8081);

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

async function tryFile(path) {
  try {
    const s = await stat(path);
    if (s.isFile()) return path;
    if (s.isDirectory()) return tryFile(join(path, "index.html"));
  } catch {
    /* not found */
  }
  return null;
}

const server = createServer(async (req, res) => {
  const url = decodeURIComponent((req.url ?? "/").split("?")[0]);
  const safe = normalize(url).replace(/^(\.\.[/\\])+/, "");
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
});

server.listen(PORT, () => {
  console.log(`Serving dist/ on http://localhost:${PORT}`);
});
