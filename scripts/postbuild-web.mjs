// Post-processing for the exported web build (`dist/`), run at the end of
// `npm run build:web`. Two jobs:
//
// 1. SPA fallback. Expo Router's web export is a single-page app; Cloudflare
//    Pages needs `_redirects` to serve `index.html` for every unknown path so
//    a deep link like /project/abc resolves.
//
// 2. Get the vendored assets out of a `node_modules` directory. Expo writes
//    its runtime assets — the Ionicons and Material Symbols `.ttf` files,
//    expo-router's navigation PNGs — to `dist/assets/node_modules/...`,
//    mirroring their source location. `wrangler pages deploy` silently skips
//    every path containing a `node_modules` segment, so those 20 files never
//    reached Cloudflare: the `_redirects` rule then answered each font request
//    with the HTML shell, `@font-face` parsed it as garbage, and every icon
//    rendered as a tofu box. We rename the folder to `assets/vendor/` and
//    rewrite the references the bundle uses to load them.
//
// Zero dependencies, and it fails loudly (non-zero exit) if either the folder
// or a stale reference survives — a regression should break the deploy, not
// ship silently.
import { readdirSync, readFileSync, writeFileSync, renameSync, existsSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const DIST = resolve(fileURLToPath(new URL("../dist/", import.meta.url)));
const FROM_DIR = join(DIST, "assets", "node_modules");
const TO_DIR = join(DIST, "assets", "vendor");
const FROM_REF = "assets/node_modules/";
const TO_REF = "assets/vendor/";
// Text files the bundler emits that can carry asset references.
const TEXT_EXT = new Set([".js", ".mjs", ".html", ".json", ".map", ".css"]);

/** All files under `dir`, recursively, as absolute paths. */
function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else out.push(full);
  }
  return out;
}

if (!existsSync(DIST) || !statSync(DIST).isDirectory()) {
  throw new Error(`postbuild-web: ${DIST} not found — run \`expo export -p web\` first`);
}

// --- 1. SPA fallback --------------------------------------------------------
writeFileSync(join(DIST, "_redirects"), "/*    /index.html    200\n");

// --- 2. Lift assets out of node_modules -----------------------------------
if (existsSync(FROM_DIR)) {
  if (existsSync(TO_DIR)) {
    throw new Error(`postbuild-web: ${TO_DIR} already exists; refusing to overwrite`);
  }
  renameSync(FROM_DIR, TO_DIR);
}

let rewritten = 0;
for (const file of walk(DIST)) {
  if (!TEXT_EXT.has(file.slice(file.lastIndexOf(".")))) continue;
  const before = readFileSync(file, "utf8");
  if (!before.includes(FROM_REF)) continue;
  writeFileSync(file, before.split(FROM_REF).join(TO_REF));
  rewritten += 1;
}

// --- 3. Guard against regressions ----------------------------------------
const strays = walk(DIST).filter((f) => f.split(/[\\/]/).includes("node_modules"));
if (strays.length > 0) {
  throw new Error(
    `postbuild-web: ${strays.length} file(s) still under a node_modules path; ` +
      `wrangler will drop them:\n  ${strays.slice(0, 5).join("\n  ")}`,
  );
}
const stale = walk(DIST).filter(
  (f) => TEXT_EXT.has(f.slice(f.lastIndexOf("."))) && readFileSync(f, "utf8").includes(FROM_REF),
);
if (stale.length > 0) {
  throw new Error(`postbuild-web: stale "${FROM_REF}" reference in:\n  ${stale.join("\n  ")}`);
}

console.log(
  `postbuild-web: wrote _redirects` +
    (existsSync(TO_DIR) ? `, moved assets/node_modules -> assets/vendor (${rewritten} file(s) rewritten)` : ""),
);
