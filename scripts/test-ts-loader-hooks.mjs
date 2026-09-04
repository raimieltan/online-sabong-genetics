// Resolver hook (see test-ts-loader.mjs for why this exists).
//
// For a relative specifier with no file extension, try resolving it
// unchanged first; if Node's default resolver can't find it, retry with a
// `.ts` extension appended. Everything else (bare specifiers, node:
// builtins, specifiers that already have an extension) is left untouched.
export async function resolve(specifier, context, nextResolve) {
  const isRelative = specifier.startsWith("./") || specifier.startsWith("../");
  const hasExtension = /\.[a-zA-Z0-9]+$/.test(specifier);

  if (!isRelative || hasExtension) {
    return nextResolve(specifier, context);
  }

  try {
    return await nextResolve(specifier, context);
  } catch (err) {
    if (err && err.code === "ERR_MODULE_NOT_FOUND") {
      return nextResolve(`${specifier}.ts`, context);
    }
    throw err;
  }
}
