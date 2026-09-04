// Resolver hook (see test-ts-loader.mjs for why this exists).
//
// Handles two things Node's ESM resolver doesn't do on its own:
//   1. `@/*` path aliases (matching tsconfig's `paths`) are rewritten to an
//      absolute file URL relative to the project root.
//   2. Extensionless specifiers are retried with an extension appended when
//      the default resolver can't find them: `.ts` for relative/aliased
//      imports (source files), `.js` for bare package subpaths (e.g.
//      `next/server`, which Next ships without an `exports` map, so Node's
//      strict ESM resolution — unlike CJS — won't auto-append `.js`).
// Specifiers that already have an extension, or that resolve on the first
// try, are left untouched.
const PROJECT_ROOT = new URL("../", import.meta.url);

export async function resolve(specifier, context, nextResolve) {
  const isRelative = specifier.startsWith("./") || specifier.startsWith("../");
  const isAlias = specifier.startsWith("@/");
  const hasExtension = /\.[a-zA-Z0-9]+$/.test(specifier);

  const target = isAlias ? new URL(specifier.slice(2), PROJECT_ROOT).href : specifier;

  if (hasExtension) {
    return nextResolve(target, context);
  }

  try {
    return await nextResolve(target, context);
  } catch (err) {
    if (err && err.code === "ERR_MODULE_NOT_FOUND") {
      const fallbackExt = isRelative || isAlias ? "ts" : "js";
      return nextResolve(`${target}.${fallbackExt}`, context);
    }
    throw err;
  }
}
