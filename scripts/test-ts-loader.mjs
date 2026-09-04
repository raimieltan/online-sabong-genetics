// Node ESM customization hook used ONLY for `node --test`.
//
// Production `lib/**/*.ts` files intentionally use extensionless relative
// imports (the Next.js/bundler convention, matching tsconfig's
// `moduleResolution: "bundler"`). Node's native ESM resolver, however,
// requires explicit extensions on relative specifiers and does not try
// `.ts` on its own. Rather than adding `.ts` extensions to production
// source (which would be non-idiomatic for the Next.js bundler and is
// unnecessary there), this loader teaches Node's resolver to fall back to
// the sibling `.ts` file when an extensionless relative specifier can't be
// resolved as-is. It is wired in only via the test script and never
// touched by the Next.js build.
import { register } from "node:module";

register("./test-ts-loader-hooks.mjs", import.meta.url);
