// Node module-resolution hooks for `node --test`, so test files and the
// modules they import can use the project's `@/` alias (which normally only
// Metro and tsc understand) and extensionless relative imports.
import { existsSync } from "node:fs";
import { pathToFileURL } from "node:url";

const SRC = pathToFileURL(`${process.cwd()}/src/`).href;

function firstExisting(base) {
  for (const candidate of [base, `${base}.ts`, `${base}.tsx`, `${base}/index.ts`]) {
    try {
      if (existsSync(new URL(candidate))) return candidate;
    } catch {
      // not a file: URL — ignore
    }
  }
  return `${base}.ts`;
}

export async function resolve(specifier, context, nextResolve) {
  if (specifier.startsWith("@/")) {
    return nextResolve(firstExisting(SRC + specifier.slice(2)), context);
  }
  if (
    (specifier.startsWith("./") || specifier.startsWith("../")) &&
    context.parentURL?.startsWith("file:") &&
    !/\.(ts|tsx|js|mjs|json)$/.test(specifier)
  ) {
    return nextResolve(firstExisting(new URL(specifier, context.parentURL).href), context);
  }
  return nextResolve(specifier, context);
}
