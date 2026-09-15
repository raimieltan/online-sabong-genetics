# Production Authentication Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the shared-singleton `getOrCreatePlayer()` dev shortcut with Supabase-backed authentication so every request is bound to a real, isolated `Player` account, and ship every P0 launch-blocking auth surface (login/signup, confirm, reset, signout, route authorization, DTOs, hardening).

**Architecture:** Supabase Auth is the identity provider; `Player.authUserId` links one Supabase `auth.users` row to one internal `Player`. A new `lib/auth/*` layer resolves verified claims to a `Player` via `requirePlayer()`, which replaces `getOrCreatePlayer()` everywhere. `proxy.ts` only refreshes cookies and does optimistic redirects — every Route Handler re-authenticates through `lib/auth`.

**Tech Stack:** Next.js 16 (`proxy.ts`), `@supabase/supabase-js`, `@supabase/ssr`, Prisma 6, Postgres (Supabase), Node's built-in test runner (`node --test`).

**Spec:** `docs/superpowers/specs/2026-09-15-production-auth-design.md` — this plan implements it in full; read both together.

## Global Constraints

- Never use `Player.findFirst()` or any global-state inference for identity (spec §5.1).
- Never trust a `playerId`/`ownerPlayerId`/email/auth subject supplied in request JSON, query params, or headers (spec §5.2).
- Use `supabase.auth.getClaims()` for authorization; never `getSession()` for authorization (spec §5.4).
- A resource owned by another player returns the same `404` as a nonexistent resource — no `403` for "exists but not yours" on reads (spec §5.6).
- Mutations must not rely on `proxy.ts` for security; Route Handlers authenticate independently (spec §5.8).
- Supabase secret/service-role keys and `DATABASE_URL` must never reach client bundles or `NEXT_PUBLIC_*` vars (spec §5.9).
- A starter grant occurs at most once per `Player`, inside one transaction (spec §5.11).
- All new server-only modules (`lib/supabase/server.ts`, `lib/auth/*`) must import `server-only` at the top.
- Tests run via `yarn test` → `node --import ./scripts/test-ts-loader.mjs --test --test-concurrency=1 lib/__tests__/*.test.ts`. New auth unit tests go in `lib/__tests__/*.test.ts` following that exact convention.
- All new/changed dependencies go through `package.json`; run `yarn install` (this repo uses yarn per existing scripts) after adding packages.

---

## Task 0: Pre-flight hygiene checklist (manual, non-code)

**Files:** none (operator checklist)

This task has no code changes. It documents the manual actions required before or alongside Phase 1 that cannot be done from the repo. Run through this checklist and check off items as completed; do not skip to Task 1 without doing so.

- [ ] **Step 1: Confirm the duplicate `MarketListing` fix is live**

  Run: `git log --oneline -1 --grep="prisma duplicate models"`
  Expected: shows commit `df3b1f9` (already merged per repo history — this item is done, just confirm).

- [ ] **Step 2: Rotate the exposed local database credential**

  In the Supabase dashboard for this project, rotate the database password. Update the local `.env` `DATABASE_URL` (and `DIRECT_URL` once added in Task 2) with the new credential. Do not commit `.env` — confirm it stays gitignored:

  Run: `git check-ignore .env`
  Expected: prints `.env`

- [ ] **Step 3: Scan git history for leaked secrets**

  Run: `git log -p --all | grep -iE "database_url|service_role|supabase.*key" | head -20`
  Expected: no live-looking credentials in history. If any are found, stop and report to the user before proceeding — history rewriting is a destructive operation that needs explicit approval.

- [ ] **Step 4: Create the Supabase Auth project configuration**

  In the Supabase dashboard: enable email/password auth, require email confirmation, set the Site URL and redirect allowlist to the app's local/preview/production origins, and configure a real SMTP provider for production (branded templates, SPF/DKIM/DMARC). Record the project URL and publishable key for Task 1's `.env.local`.

---

## Phase 1: Identity foundation

### Task 1: Add Supabase dependencies and environment validation

**Files:**
- Modify: `package.json`
- Create: `lib/env.ts`
- Create: `.env.local.example`
- Test: `lib/__tests__/env.test.ts`

**Interfaces:**
- Produces: `getSupabaseEnv(): { url: string; publishableKey: string; appUrl: string }` — used by `lib/supabase/client.ts` and `lib/supabase/server.ts` in Task 3/4.

- [ ] **Step 1: Add dependencies**

  Run: `yarn add @supabase/supabase-js @supabase/ssr`

- [ ] **Step 2: Write failing test for env validation**

  ```ts
  // lib/__tests__/env.test.ts
  import test from "node:test";
  import assert from "node:assert/strict";

  import { getSupabaseEnv } from "../env";

  test("getSupabaseEnv throws when a required variable is missing", () => {
    const original = { ...process.env };
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    assert.throws(() => getSupabaseEnv(), /NEXT_PUBLIC_SUPABASE_URL/);
    process.env = original;
  });

  test("getSupabaseEnv returns configured values", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "test-key";
    process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000";
    const env = getSupabaseEnv();
    assert.equal(env.url, "https://example.supabase.co");
    assert.equal(env.publishableKey, "test-key");
    assert.equal(env.appUrl, "http://localhost:3000");
  });
  ```

- [ ] **Step 2: Run test to verify it fails**

  Run: `node --import ./scripts/test-ts-loader.mjs --test lib/__tests__/env.test.ts`
  Expected: FAIL with "Cannot find module '../env'"

- [ ] **Step 3: Implement `lib/env.ts`**

  ```ts
  // lib/env.ts
  export type SupabaseEnv = {
    url: string;
    publishableKey: string;
    appUrl: string;
  };

  function required(name: string): string {
    const value = process.env[name];
    if (!value) {
      throw new Error(`Missing required environment variable: ${name}`);
    }
    return value;
  }

  export function getSupabaseEnv(): SupabaseEnv {
    return {
      url: required("NEXT_PUBLIC_SUPABASE_URL"),
      publishableKey: required("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"),
      appUrl: required("NEXT_PUBLIC_APP_URL"),
    };
  }
  ```

- [ ] **Step 4: Run test to verify it passes**

  Run: `node --import ./scripts/test-ts-loader.mjs --test lib/__tests__/env.test.ts`
  Expected: PASS (2 tests)

- [ ] **Step 5: Create `.env.local.example` documenting required vars**

  ```text
  NEXT_PUBLIC_SUPABASE_URL=
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
  NEXT_PUBLIC_APP_URL=http://localhost:3000
  DATABASE_URL=
  DIRECT_URL=
  ```

- [ ] **Step 6: Commit**

  ```bash
  git add package.json yarn.lock lib/env.ts lib/__tests__/env.test.ts .env.local.example
  git commit -m "feat(auth): add Supabase dependencies and env validation"
  ```

---

### Task 2: Migration A — expand `Player` schema

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/<timestamp>_add_player_auth_fields/migration.sql`

**Interfaces:**
- Produces: `Player.authUserId` (nullable `String?` mapped to `Uuid`), `Player.displayName`, `Player.onboardingState`, `Player.provisionedAt`, `Player.lastSeenAt` — consumed by `lib/auth/player.ts` (Task 7).

- [ ] **Step 1: Edit the `Player` model**

  In `prisma/schema.prisma`, change:

  ```prisma
  model Player {
    id                 String               @id @default(uuid())
    createdAt          DateTime             @default(now())
    credits            Int                  @default(1000)
    tournamentTokens   Int                  @default(0)
    chickens           Chicken[]
    eggs               Egg[]
    facilities         Facility[]
    pveProgress        PveProgress[]
    pveCampaignState   PveCampaignState?
    pveOpponentHistory PveOpponentHistory[]
    pveEncounterEvents PveEncounterEvent[]
    tournaments        Tournament[]
  }
  ```

  to:

  ```prisma
  model Player {
    id                 String               @id @default(uuid())
    authUserId         String?              @unique @db.Uuid
    displayName        String?
    onboardingState    String               @default("PENDING")
    provisionedAt      DateTime?
    lastSeenAt         DateTime?
    createdAt          DateTime             @default(now())
    credits            Int                  @default(1000)
    tournamentTokens   Int                  @default(0)
    chickens           Chicken[]
    eggs               Egg[]
    facilities         Facility[]
    pveProgress        PveProgress[]
    pveCampaignState   PveCampaignState?
    pveOpponentHistory PveOpponentHistory[]
    pveEncounterEvents PveEncounterEvent[]
    tournaments        Tournament[]
  }
  ```

  Note: `authUserId` stays nullable in this migration (expand phase, spec §6.2 Migration A). Do not add the `auth.users` foreign key yet — that is Migration B (Task 27).

- [ ] **Step 2: Generate the migration**

  Run: `yarn prisma migrate dev --name add_player_auth_fields --create-only`
  Expected: creates `prisma/migrations/<timestamp>_add_player_auth_fields/migration.sql` with `ALTER TABLE "Player" ADD COLUMN ...` statements and a unique index on `authUserId`.

- [ ] **Step 3: Verify the generated SQL matches intent**

  Open the generated `migration.sql` and confirm it contains `ADD COLUMN "authUserId" UUID`, `ADD COLUMN "displayName" TEXT`, `ADD COLUMN "onboardingState" TEXT NOT NULL DEFAULT 'PENDING'`, `ADD COLUMN "provisionedAt" TIMESTAMP(3)`, `ADD COLUMN "lastSeenAt" TIMESTAMP(3)`, and `CREATE UNIQUE INDEX ... ON "Player"("authUserId")`. Do not hand-edit unless a column is missing.

- [ ] **Step 4: Apply the migration and validate**

  Run: `yarn prisma migrate dev`
  Run: `yarn prisma validate`
  Expected: both succeed with no errors.

- [ ] **Step 5: Run full test suite to confirm no regression**

  Run: `yarn test`
  Expected: same pass/fail count as before this change (adding nullable columns must not break existing tests).

- [ ] **Step 6: Commit**

  ```bash
  git add prisma/schema.prisma prisma/migrations
  git commit -m "feat(auth): add nullable Player auth fields (migration A)"
  ```

---

### Task 3: Supabase browser client

**Files:**
- Create: `lib/supabase/client.ts`

**Interfaces:**
- Consumes: `getSupabaseEnv()` from Task 1.
- Produces: `createBrowserSupabaseClient(): SupabaseClient` — consumed by the login/signup page (Task 12) and any client component needing auth state.

- [ ] **Step 1: Implement the browser client**

  ```ts
  // lib/supabase/client.ts
  "use client";

  import { createBrowserClient } from "@supabase/ssr";

  import { getSupabaseEnv } from "@/lib/env";

  export function createBrowserSupabaseClient() {
    const env = getSupabaseEnv();
    return createBrowserClient(env.url, env.publishableKey);
  }
  ```

- [ ] **Step 2: Verify it compiles**

  Run: `yarn tsc --noEmit`
  Expected: no new type errors attributable to this file.

- [ ] **Step 3: Commit**

  ```bash
  git add lib/supabase/client.ts
  git commit -m "feat(auth): add Supabase browser client"
  ```

---

### Task 4: Supabase server (cookie-scoped) client

**Files:**
- Create: `lib/supabase/server.ts`

**Interfaces:**
- Consumes: `getSupabaseEnv()` from Task 1; Next.js `cookies()` from `next/headers`.
- Produces: `createServerSupabaseClient(): Promise<SupabaseClient>` — consumed by `lib/auth/session.ts` (Task 6) and `app/auth/confirm/route.ts` (Task 15).

- [ ] **Step 1: Implement the server client**

  ```ts
  // lib/supabase/server.ts
  import "server-only";

  import { cookies } from "next/headers";
  import { createServerClient } from "@supabase/ssr";

  import { getSupabaseEnv } from "@/lib/env";

  export async function createServerSupabaseClient() {
    const env = getSupabaseEnv();
    const cookieStore = await cookies();

    return createServerClient(env.url, env.publishableKey, {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // Called from a Server Component render; the proxy refresh path
            // (Task 11) is what actually persists refreshed cookies.
          }
        },
      },
    });
  }
  ```

- [ ] **Step 2: Verify it compiles**

  Run: `yarn tsc --noEmit`
  Expected: no new type errors attributable to this file.

- [ ] **Step 3: Commit**

  ```bash
  git add lib/supabase/server.ts
  git commit -m "feat(auth): add Supabase server-side cookie client"
  ```

---

### Task 5: Auth error types

**Files:**
- Create: `lib/auth/errors.ts`
- Test: `lib/__tests__/auth-errors.test.ts`

**Interfaces:**
- Produces: `class UnauthenticatedError extends Error`, `class ForbiddenError extends Error` — consumed by `lib/auth/session.ts` (Task 6), `lib/auth/player.ts` (Task 7), `lib/auth/responses.ts` (Task 8), and every converted route (Phase 3).

- [ ] **Step 1: Write failing test**

  ```ts
  // lib/__tests__/auth-errors.test.ts
  import test from "node:test";
  import assert from "node:assert/strict";

  import { UnauthenticatedError, ForbiddenError } from "../auth/errors";

  test("UnauthenticatedError carries a stable code", () => {
    const err = new UnauthenticatedError();
    assert.equal(err.code, "UNAUTHENTICATED");
    assert.ok(err instanceof Error);
  });

  test("ForbiddenError carries a stable code", () => {
    const err = new ForbiddenError();
    assert.equal(err.code, "FORBIDDEN");
    assert.ok(err instanceof Error);
  });
  ```

- [ ] **Step 2: Run test to verify it fails**

  Run: `node --import ./scripts/test-ts-loader.mjs --test lib/__tests__/auth-errors.test.ts`
  Expected: FAIL with "Cannot find module '../auth/errors'"

- [ ] **Step 3: Implement**

  ```ts
  // lib/auth/errors.ts
  export class UnauthenticatedError extends Error {
    readonly code = "UNAUTHENTICATED" as const;
    constructor(message = "Sign in to continue.") {
      super(message);
      this.name = "UnauthenticatedError";
    }
  }

  export class ForbiddenError extends Error {
    readonly code = "FORBIDDEN" as const;
    constructor(message = "You cannot perform this action.") {
      super(message);
      this.name = "ForbiddenError";
    }
  }
  ```

- [ ] **Step 4: Run test to verify it passes**

  Run: `node --import ./scripts/test-ts-loader.mjs --test lib/__tests__/auth-errors.test.ts`
  Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

  ```bash
  git add lib/auth/errors.ts lib/__tests__/auth-errors.test.ts
  git commit -m "feat(auth): add typed auth error classes"
  ```

---

### Task 6: Claims verification

**Files:**
- Create: `lib/auth/session.ts`
- Test: `lib/__tests__/auth-session.test.ts`

**Interfaces:**
- Consumes: `createServerSupabaseClient()` from Task 4; `UnauthenticatedError` from Task 5.
- Produces: `type AuthClaims = { authUserId: string; email?: string }`, `requireAuthClaims(): Promise<AuthClaims>`, `optionalAuthClaims(): Promise<AuthClaims | null>` — consumed by `lib/auth/player.ts` (Task 7).

- [ ] **Step 1: Write failing test using a fake Supabase client**

  ```ts
  // lib/__tests__/auth-session.test.ts
  import test from "node:test";
  import assert from "node:assert/strict";
  import { mock } from "node:test";

  import { UnauthenticatedError } from "../auth/errors";

  test("requireAuthClaims returns claims for a valid UUID subject", async () => {
    mock.module("../supabase/server", {
      namedExports: {
        createServerSupabaseClient: async () => ({
          auth: {
            getClaims: async () => ({
              data: { claims: { sub: "11111111-1111-1111-1111-111111111111", email: "a@example.com" } },
              error: null,
            }),
          },
        }),
      },
    });
    const { requireAuthClaims } = await import("../auth/session");
    const claims = await requireAuthClaims();
    assert.equal(claims.authUserId, "11111111-1111-1111-1111-111111111111");
    assert.equal(claims.email, "a@example.com");
  });

  test("requireAuthClaims rejects a missing subject", async () => {
    mock.module("../supabase/server", {
      namedExports: {
        createServerSupabaseClient: async () => ({
          auth: { getClaims: async () => ({ data: { claims: null }, error: null }) },
        }),
      },
    });
    const { requireAuthClaims } = await import("../auth/session");
    await assert.rejects(() => requireAuthClaims(), UnauthenticatedError);
  });

  test("requireAuthClaims rejects a non-UUID subject", async () => {
    mock.module("../supabase/server", {
      namedExports: {
        createServerSupabaseClient: async () => ({
          auth: { getClaims: async () => ({ data: { claims: { sub: "not-a-uuid" } }, error: null }) },
        }),
      },
    });
    const { requireAuthClaims } = await import("../auth/session");
    await assert.rejects(() => requireAuthClaims(), UnauthenticatedError);
  });

  test("optionalAuthClaims returns null instead of throwing", async () => {
    mock.module("../supabase/server", {
      namedExports: {
        createServerSupabaseClient: async () => ({
          auth: { getClaims: async () => ({ data: { claims: null }, error: null }) },
        }),
      },
    });
    const { optionalAuthClaims } = await import("../auth/session");
    assert.equal(await optionalAuthClaims(), null);
  });
  ```

- [ ] **Step 2: Run test to verify it fails**

  Run: `node --import ./scripts/test-ts-loader.mjs --test lib/__tests__/auth-session.test.ts`
  Expected: FAIL with "Cannot find module '../auth/session'"

- [ ] **Step 3: Implement**

  ```ts
  // lib/auth/session.ts
  import "server-only";

  import { createServerSupabaseClient } from "@/lib/supabase/server";
  import { UnauthenticatedError } from "./errors";

  export type AuthClaims = {
    authUserId: string;
    email?: string;
  };

  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  export async function optionalAuthClaims(): Promise<AuthClaims | null> {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase.auth.getClaims();
    if (error || !data?.claims) return null;

    const sub = data.claims.sub as string | undefined;
    if (!sub || !UUID_RE.test(sub)) return null;

    return { authUserId: sub, email: data.claims.email as string | undefined };
  }

  export async function requireAuthClaims(): Promise<AuthClaims> {
    const claims = await optionalAuthClaims();
    if (!claims) throw new UnauthenticatedError();
    return claims;
  }
  ```

- [ ] **Step 4: Run test to verify it passes**

  Run: `node --import ./scripts/test-ts-loader.mjs --test lib/__tests__/auth-session.test.ts`
  Expected: PASS (4 tests)

  If `node:test`'s `mock.module` is unavailable in the Node version this repo runs (check with `node --version`; `mock.module` requires Node ≥ 22 and `--experimental-test-module-mocks` on some versions), add `--experimental-test-module-mocks` to the `test` script in `package.json` for this test file, or restructure `requireAuthClaims`/`optionalAuthClaims` to accept an injected Supabase client factory as an optional parameter defaulting to `createServerSupabaseClient`, and pass a fake directly in the test instead of mocking the module. Prefer the injected-factory approach if the Node version is uncertain — it needs no experimental flags.

- [ ] **Step 5: Commit**

  ```bash
  git add lib/auth/session.ts lib/__tests__/auth-session.test.ts package.json
  git commit -m "feat(auth): add claims verification via getClaims()"
  ```

---

### Task 7: Player provisioning and `requirePlayer()`

**Files:**
- Create: `lib/auth/player.ts`
- Test: `lib/__tests__/auth-player.test.ts`

**Interfaces:**
- Consumes: `requireAuthClaims()` from Task 6; `prisma` from `lib/db.ts`.
- Produces: `getOrProvisionPlayer(authUserId: string): Promise<Player>`, `requirePlayer(): Promise<Player>` — consumed by every route conversion in Phase 3.

This is the direct replacement for `lib/player.ts#getOrCreatePlayer()`. Starter grant logic: this repo's `Player` model already defaults `credits: 1000` and `tournamentTokens: 0` at the schema level (see `prisma/schema.prisma`), so "starter grant" here means creating the `Player` row itself exactly once per `authUserId` — there is no separate starter-roster grant in the current schema to extend, so provisioning does not need additional starter chickens/facilities beyond what `Player.create` already produces. If a future task adds starter chickens, extend this transaction — do not add a second write path.

- [ ] **Step 1: Write failing test**

  ```ts
  // lib/__tests__/auth-player.test.ts
  import test from "node:test";
  import assert from "node:assert/strict";

  import { prisma } from "../db";
  import { getOrProvisionPlayer } from "../auth/player";

  test("getOrProvisionPlayer creates exactly one Player per authUserId", async () => {
    const authUserId = "22222222-2222-2222-2222-222222222222";
    await prisma.player.deleteMany({ where: { authUserId } });

    const first = await getOrProvisionPlayer(authUserId);
    const second = await getOrProvisionPlayer(authUserId);

    assert.equal(first.id, second.id);
    const count = await prisma.player.count({ where: { authUserId } });
    assert.equal(count, 1);
  });

  test("getOrProvisionPlayer handles concurrent calls without duplicating the Player", async () => {
    const authUserId = "33333333-3333-3333-3333-333333333333";
    await prisma.player.deleteMany({ where: { authUserId } });

    const [a, b] = await Promise.all([
      getOrProvisionPlayer(authUserId),
      getOrProvisionPlayer(authUserId),
    ]);

    assert.equal(a.id, b.id);
    const count = await prisma.player.count({ where: { authUserId } });
    assert.equal(count, 1);
  });

  test("two distinct authUserIds get two distinct Players", async () => {
    const idA = "44444444-4444-4444-4444-444444444444";
    const idB = "55555555-5555-5555-5555-555555555555";
    await prisma.player.deleteMany({ where: { authUserId: { in: [idA, idB] } } });

    const a = await getOrProvisionPlayer(idA);
    const b = await getOrProvisionPlayer(idB);

    assert.notEqual(a.id, b.id);
  });
  ```

- [ ] **Step 2: Run test to verify it fails**

  Run: `node --import ./scripts/test-ts-loader.mjs --test lib/__tests__/auth-player.test.ts`
  Expected: FAIL with "Cannot find module '../auth/player'"

- [ ] **Step 3: Implement**

  ```ts
  // lib/auth/player.ts
  import "server-only";

  import type { Player } from "@prisma/client";

  import { prisma } from "@/lib/db";
  import { requireAuthClaims } from "./session";

  export async function getOrProvisionPlayer(authUserId: string): Promise<Player> {
    const existing = await prisma.player.findUnique({ where: { authUserId } });
    if (existing) return existing;

    try {
      return await prisma.player.create({
        data: {
          authUserId,
          onboardingState: "PROVISIONED",
          provisionedAt: new Date(),
          lastSeenAt: new Date(),
        },
      });
    } catch (err) {
      // Unique-constraint race: another concurrent request created it first.
      const isUniqueViolation =
        typeof err === "object" && err !== null && "code" in err && (err as { code: string }).code === "P2002";
      if (!isUniqueViolation) throw err;

      const winner = await prisma.player.findUnique({ where: { authUserId } });
      if (!winner) throw err;
      return winner;
    }
  }

  export async function requirePlayer(): Promise<Player> {
    const claims = await requireAuthClaims();
    return getOrProvisionPlayer(claims.authUserId);
  }
  ```

- [ ] **Step 4: Run test to verify it passes**

  Run: `node --import ./scripts/test-ts-loader.mjs --test lib/__tests__/auth-player.test.ts`
  Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

  ```bash
  git add lib/auth/player.ts lib/__tests__/auth-player.test.ts
  git commit -m "feat(auth): add idempotent player provisioning and requirePlayer()"
  ```

---

### Task 8: API error response mapping

**Files:**
- Create: `lib/auth/responses.ts`
- Test: `lib/__tests__/auth-responses.test.ts`

**Interfaces:**
- Consumes: `UnauthenticatedError`, `ForbiddenError` from Task 5.
- Produces: `toErrorResponse(error: unknown): NextResponse` — consumed by every converted route in Phase 3.

- [ ] **Step 1: Write failing test**

  ```ts
  // lib/__tests__/auth-responses.test.ts
  import test from "node:test";
  import assert from "node:assert/strict";

  import { UnauthenticatedError, ForbiddenError } from "../auth/errors";
  import { toErrorResponse } from "../auth/responses";

  test("UnauthenticatedError maps to 401 with UNAUTHENTICATED code", async () => {
    const res = toErrorResponse(new UnauthenticatedError());
    assert.equal(res.status, 401);
    const body = await res.json();
    assert.equal(body.error.code, "UNAUTHENTICATED");
  });

  test("ForbiddenError maps to 403 with FORBIDDEN code", async () => {
    const res = toErrorResponse(new ForbiddenError());
    assert.equal(res.status, 403);
    const body = await res.json();
    assert.equal(body.error.code, "FORBIDDEN");
  });

  test("unknown errors map to 500 without leaking internals", async () => {
    const res = toErrorResponse(new Error("some internal detail"));
    assert.equal(res.status, 500);
    const body = await res.json();
    assert.equal(body.error.code, "INTERNAL_ERROR");
    assert.ok(!JSON.stringify(body).includes("internal detail"));
  });
  ```

- [ ] **Step 2: Run test to verify it fails**

  Run: `node --import ./scripts/test-ts-loader.mjs --test lib/__tests__/auth-responses.test.ts`
  Expected: FAIL with "Cannot find module '../auth/responses'"

- [ ] **Step 3: Implement**

  ```ts
  // lib/auth/responses.ts
  import { NextResponse } from "next/server";
  import { randomUUID } from "node:crypto";

  import { ForbiddenError, UnauthenticatedError } from "./errors";

  export function toErrorResponse(error: unknown): NextResponse {
    const requestId = randomUUID();

    if (error instanceof UnauthenticatedError) {
      return NextResponse.json(
        { error: { code: "UNAUTHENTICATED", message: error.message, requestId } },
        { status: 401 }
      );
    }

    if (error instanceof ForbiddenError) {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: error.message, requestId } },
        { status: 403 }
      );
    }

    console.error("[auth] unhandled route error", { requestId, error });
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Something went wrong.", requestId } },
      { status: 500 }
    );
  }
  ```

- [ ] **Step 4: Run test to verify it passes**

  Run: `node --import ./scripts/test-ts-loader.mjs --test lib/__tests__/auth-responses.test.ts`
  Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

  ```bash
  git add lib/auth/responses.ts lib/__tests__/auth-responses.test.ts
  git commit -m "feat(auth): add consistent API error response mapping"
  ```

---

### Task 9: Player and chicken DTOs

**Files:**
- Create: `lib/auth/dto.ts`
- Test: `lib/__tests__/auth-dto.test.ts`

**Interfaces:**
- Consumes: `Player`, `Chicken` types from `@prisma/client`.
- Produces: `toPlayerDto(player: Player): PlayerDto`, `toChickenDto(chicken: Chicken): ChickenDto` — consumed by `app/api/player/route.ts` (Task 18) and chicken-facing routes (Task 19).

- [ ] **Step 1: Write failing test**

  ```ts
  // lib/__tests__/auth-dto.test.ts
  import test from "node:test";
  import assert from "node:assert/strict";

  import { toPlayerDto } from "../auth/dto";

  test("toPlayerDto omits authUserId and internal fields", () => {
    const player = {
      id: "p1",
      authUserId: "auth-uuid-should-not-leak",
      displayName: "Sean",
      onboardingState: "PROVISIONED",
      provisionedAt: new Date(),
      lastSeenAt: new Date(),
      createdAt: new Date(),
      credits: 1000,
      tournamentTokens: 0,
    };

    const dto = toPlayerDto(player as never);

    assert.equal(dto.id, "p1");
    assert.equal(dto.credits, 1000);
    assert.equal(dto.tournamentTokens, 0);
    assert.equal("authUserId" in dto, false);
  });
  ```

- [ ] **Step 2: Run test to verify it fails**

  Run: `node --import ./scripts/test-ts-loader.mjs --test lib/__tests__/auth-dto.test.ts`
  Expected: FAIL with "Cannot find module '../auth/dto'"

- [ ] **Step 3: Implement**

  ```ts
  // lib/auth/dto.ts
  import type { Chicken, Player } from "@prisma/client";

  export type PlayerDto = {
    id: string;
    displayName: string | null;
    credits: number;
    tournamentTokens: number;
  };

  export function toPlayerDto(player: Player): PlayerDto {
    return {
      id: player.id,
      displayName: player.displayName,
      credits: player.credits,
      tournamentTokens: player.tournamentTokens,
    };
  }

  export type ChickenDto = Omit<Chicken, "playerId"> & { playerId?: never };

  export function toChickenDto(chicken: Chicken): Omit<Chicken, "playerId"> {
    const { playerId: _playerId, ...rest } = chicken;
    return rest;
  }
  ```

- [ ] **Step 4: Run test to verify it passes**

  Run: `node --import ./scripts/test-ts-loader.mjs --test lib/__tests__/auth-dto.test.ts`
  Expected: PASS (1 test)

- [ ] **Step 5: Commit**

  ```bash
  git add lib/auth/dto.ts lib/__tests__/auth-dto.test.ts
  git commit -m "feat(auth): add player and chicken DTOs that omit internal fields"
  ```

---

### Task 10: Explicit legacy-player link script

**Files:**
- Create: `scripts/link-legacy-player.ts`

**Interfaces:**
- Consumes: `prisma` from `lib/db.ts`.
- Produces: a CLI script, not an importable module — run manually during cutover per spec §6.2.

- [ ] **Step 1: Implement the script**

  ```ts
  // scripts/link-legacy-player.ts
  import { prisma } from "@/lib/db";

  async function main() {
    const authUserId = process.argv[2];
    const playerId = process.argv[3];
    const confirmFlag = process.argv[4];

    if (!authUserId || !playerId) {
      console.error("Usage: link-legacy-player <AUTH_USER_ID> <PLAYER_ID> --confirm-production");
      process.exit(1);
    }

    if (process.env.NODE_ENV === "production" && confirmFlag !== "--confirm-production") {
      console.error("Refusing to run against production without --confirm-production.");
      process.exit(1);
    }

    const [authTarget, playerTarget] = await Promise.all([
      prisma.player.findUnique({ where: { authUserId } }),
      prisma.player.findUnique({ where: { id: playerId } }),
    ]);

    if (authTarget) {
      console.error(`authUserId ${authUserId} is already linked to Player ${authTarget.id}.`);
      process.exit(1);
    }

    if (!playerTarget) {
      console.error(`Player ${playerId} does not exist.`);
      process.exit(1);
    }

    if (playerTarget.authUserId) {
      console.error(`Player ${playerId} is already linked to authUserId ${playerTarget.authUserId}.`);
      process.exit(1);
    }

    console.log(`Linking authUserId=${authUserId} to Player=${playerId}...`);

    await prisma.$transaction(async (tx) => {
      await tx.player.update({
        where: { id: playerId },
        data: { authUserId, onboardingState: "PROVISIONED", provisionedAt: new Date() },
      });
    });

    console.log(`Linked. authUserId=${authUserId} playerId=${playerId} at ${new Date().toISOString()}`);
  }

  main()
    .catch((err) => {
      console.error(err);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
  ```

- [ ] **Step 2: Add an npm script for discoverability**

  In `package.json`, under `"scripts"`, add:

  ```json
  "link-legacy-player": "node --import ./scripts/test-ts-loader.mjs scripts/link-legacy-player.ts"
  ```

- [ ] **Step 3: Dry-run against local dev data**

  Run: `yarn prisma studio` (or a `psql` query) to find a local dev `authUserId` (create a test Supabase user first) and an existing `Player.id`, then:
  Run: `yarn link-legacy-player <authUserId> <playerId>`
  Expected: prints the linking confirmation and updates the row; running it again with the same args exits non-zero because it's already linked.

- [ ] **Step 4: Commit**

  ```bash
  git add scripts/link-legacy-player.ts package.json
  git commit -m "feat(auth): add explicit legacy-player linking script"
  ```

---

## Phase 2: Auth UX and shell

### Task 11: `proxy.ts` — token refresh and optimistic redirects

**Files:**
- Create: `proxy.ts` (repo root, alongside `next.config.ts`)

**Interfaces:**
- Consumes: `@supabase/ssr`'s `createServerClient`, `getSupabaseEnv()` from Task 1.
- Produces: the Next.js 16 proxy entrypoint; no other task imports from it.

- [ ] **Step 1: Read the Next.js 16 proxy convention doc before writing this file**

  Run: `find node_modules/next/dist/docs -iname "*proxy*"` and read the matching file — this repo's `AGENTS.md` requires reading the resolved Next.js docs for breaking-change APIs before writing proxy code, since `proxy.ts` (not `middleware.ts`) is Next 16's convention and the exact export shape may differ from training-data `middleware.ts` examples.

- [ ] **Step 2: Implement `proxy.ts`**

  ```ts
  // proxy.ts
  import { NextResponse, type NextRequest } from "next/server";
  import { createServerClient } from "@supabase/ssr";

  import { getSupabaseEnv } from "@/lib/env";

  const PUBLIC_PATHS = ["/login", "/forgot-password", "/reset-password", "/auth/confirm", "/auth/signout"];
  const AUTH_ONLY_PATHS = ["/login", "/forgot-password"];

  function isSameOriginRelativePath(next: string | null): next is string {
    if (!next) return false;
    if (!next.startsWith("/")) return false;
    if (next.startsWith("//")) return false;
    if (/^\/[a-zA-Z][a-zA-Z\d+\-.]*:/.test(next)) return false;
    return true;
  }

  export default async function proxy(request: NextRequest) {
    const { pathname } = request.nextUrl;
    let response = NextResponse.next({ request });

    if (pathname.startsWith("/api/")) {
      return response;
    }

    const isStaticAsset =
      pathname.startsWith("/_next/") ||
      pathname === "/favicon.ico" ||
      pathname === "/robots.txt" ||
      /\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|map)$/.test(pathname);

    if (isStaticAsset) {
      return response;
    }

    const env = getSupabaseEnv();
    const supabase = createServerClient(env.url, env.publishableKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    });

    const { data } = await supabase.auth.getClaims();
    const isAuthenticated = Boolean(data?.claims?.sub);

    const isPublicPath = PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));

    if (!isAuthenticated && !isPublicPath) {
      const loginUrl = new URL("/login", request.url);
      const next = `${pathname}${request.nextUrl.search}`;
      if (isSameOriginRelativePath(next)) {
        loginUrl.searchParams.set("next", next);
      }
      return NextResponse.redirect(loginUrl);
    }

    if (isAuthenticated && AUTH_ONLY_PATHS.some((p) => pathname === p)) {
      return NextResponse.redirect(new URL("/", request.url));
    }

    return response;
  }

  export const config = {
    matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
  };
  ```

- [ ] **Step 3: Verify redirect behavior manually**

  Run: `yarn dev`, then visit `http://localhost:3000/coop` in a browser with no Supabase session cookie.
  Expected: redirected to `/login?next=%2Fcoop`.

  Visit `http://localhost:3000/api/player` directly.
  Expected: not redirected by the proxy (still returns the route's own JSON `401` once Task 18 lands — before that task, it currently returns 200 from the old handler, which is expected at this point in the plan).

- [ ] **Step 4: Commit**

  ```bash
  git add proxy.ts
  git commit -m "feat(auth): add proxy.ts for session refresh and protected-page redirects"
  ```

---

### Task 12: Login/signup page

**Files:**
- Create: `app/(auth)/layout.tsx`
- Create: `app/(auth)/login/page.tsx`
- Create: `components/auth/AuthCard.tsx`

**Interfaces:**
- Consumes: `createBrowserSupabaseClient()` from Task 3.
- Produces: the `/login` route with sign-in and create-account modes.

- [ ] **Step 1: Read the UI style docs before building this screen**

  Read `docs/ui/visual-style.md` and `docs/ui/game-shell.md` — this project's `AGENTS.md` requires the cinematic glass/brass game aesthetic, not a generic SaaS auth card, per spec §9.

- [ ] **Step 2: Create the auth-only layout (no `TopBar`)**

  ```tsx
  // app/(auth)/layout.tsx
  export default function AuthLayout({ children }: { children: React.ReactNode }) {
    return (
      <div className="min-h-screen w-full bg-(--background) text-(--foreground)">
        {children}
      </div>
    );
  }
  ```

- [ ] **Step 3: Create the shared `AuthCard` shell**

  ```tsx
  // components/auth/AuthCard.tsx
  export function AuthCard({ title, children }: { title: string; children: React.ReactNode }) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="w-full max-w-md rounded-2xl border border-(--color-gold)/20 bg-black/40 p-8 backdrop-blur-xl shadow-2xl">
          <h1 className="font-display mb-6 text-2xl font-semibold text-(--color-gold-bright)">{title}</h1>
          {children}
        </div>
      </div>
    );
  }
  ```

  Adjust class names to match the exact tokens defined in `docs/ui/visual-style.md` once read in Step 1 — the above uses the same CSS custom-property pattern already seen in `components/TopBar.tsx` (`--color-gold`, `--color-gold-bright`, `--foreground`, `--background`) as a starting point.

- [ ] **Step 4: Implement the login/signup page**

  ```tsx
  // app/(auth)/login/page.tsx
  "use client";

  import { useState } from "react";
  import { useRouter, useSearchParams } from "next/navigation";

  import { createBrowserSupabaseClient } from "@/lib/supabase/client";
  import { AuthCard } from "@/components/auth/AuthCard";

  type Mode = "sign-in" | "sign-up";

  function isSameOriginRelativePath(next: string | null): next is string {
    if (!next) return false;
    if (!next.startsWith("/")) return false;
    if (next.startsWith("//")) return false;
    if (/^\/[a-zA-Z][a-zA-Z\d+\-.]*:/.test(next)) return false;
    return true;
  }

  export default function LoginPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [mode, setMode] = useState<Mode>("sign-in");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [pendingConfirmation, setPendingConfirmation] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);

    const rawNext = searchParams.get("next");
    const nextPath = isSameOriginRelativePath(rawNext) ? rawNext : "/";

    async function handleSubmit(e: React.FormEvent) {
      e.preventDefault();
      if (submitting) return;
      setError(null);

      if (mode === "sign-up" && password !== confirmPassword) {
        setError("Passwords do not match.");
        return;
      }

      setSubmitting(true);
      const supabase = createBrowserSupabaseClient();

      try {
        if (mode === "sign-in") {
          const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
          if (signInError) {
            setError("Invalid email or password.");
            return;
          }
          router.push(nextPath);
        } else {
          const { error: signUpError } = await supabase.auth.signUp({ email, password });
          if (signUpError) {
            setError("Could not create account. Try a different email or password.");
            return;
          }
          setPendingConfirmation(true);
        }
      } finally {
        setSubmitting(false);
      }
    }

    if (pendingConfirmation) {
      return (
        <AuthCard title="Check your email">
          <p className="text-sm text-(--foreground)/80">
            We sent a confirmation link to {email}. Follow it to activate your dynasty.
          </p>
        </AuthCard>
      );
    }

    return (
      <AuthCard title={mode === "sign-in" ? "Sign in" : "Create your account"}>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
          <label className="flex flex-col gap-1 text-sm">
            <span>Email</span>
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="rounded-lg border border-(--color-gold)/30 bg-black/30 px-3 py-2"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span>Password</span>
            <input
              type="password"
              required
              minLength={8}
              autoComplete={mode === "sign-in" ? "current-password" : "new-password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="rounded-lg border border-(--color-gold)/30 bg-black/30 px-3 py-2"
            />
          </label>
          {mode === "sign-up" && (
            <label className="flex flex-col gap-1 text-sm">
              <span>Confirm password</span>
              <input
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="rounded-lg border border-(--color-gold)/30 bg-black/30 px-3 py-2"
              />
            </label>
          )}
          {error && (
            <p role="alert" className="text-sm text-red-400">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={submitting}
            className="rounded-lg bg-(--color-gold) px-4 py-2 font-semibold text-black disabled:opacity-50"
          >
            {submitting ? "Please wait..." : mode === "sign-in" ? "Sign in" : "Create account"}
          </button>
        </form>
        <div className="mt-4 flex justify-between text-sm">
          <button
            type="button"
            onClick={() => setMode(mode === "sign-in" ? "sign-up" : "sign-in")}
            className="underline"
          >
            {mode === "sign-in" ? "Create an account" : "Have an account? Sign in"}
          </button>
          {mode === "sign-in" && (
            <a href="/forgot-password" className="underline">
              Forgot password?
            </a>
          )}
        </div>
      </AuthCard>
    );
  }
  ```

- [ ] **Step 5: Manually verify sign-up and sign-in flows against the local Supabase project**

  Run: `yarn dev`, visit `/login`, create an account with a real inbox, confirm via the emailed link (Task 15 must exist for this to complete — if run before Task 15, note the confirm link will 404 until then and revisit this verification after Task 15), then sign in.

- [ ] **Step 6: Commit**

  ```bash
  git add app/\(auth\)/layout.tsx app/\(auth\)/login/page.tsx components/auth/AuthCard.tsx
  git commit -m "feat(auth): add login/signup screen"
  ```

---

### Task 13: Forgot-password page

**Files:**
- Create: `app/(auth)/forgot-password/page.tsx`

**Interfaces:**
- Consumes: `createBrowserSupabaseClient()` from Task 3; `AuthCard` from Task 12.

- [ ] **Step 1: Implement**

  ```tsx
  // app/(auth)/forgot-password/page.tsx
  "use client";

  import { useState } from "react";

  import { createBrowserSupabaseClient } from "@/lib/supabase/client";
  import { AuthCard } from "@/components/auth/AuthCard";

  export default function ForgotPasswordPage() {
    const [email, setEmail] = useState("");
    const [submitted, setSubmitted] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    async function handleSubmit(e: React.FormEvent) {
      e.preventDefault();
      if (submitting) return;
      setSubmitting(true);
      const supabase = createBrowserSupabaseClient();
      await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/reset-password`,
      });
      // Always show the same confirmation regardless of whether the email
      // exists (spec §9.1: no indication whether a reset address exists).
      setSubmitted(true);
      setSubmitting(false);
    }

    if (submitted) {
      return (
        <AuthCard title="Check your email">
          <p className="text-sm text-(--foreground)/80">
            If an account exists for {email}, a reset link is on its way.
          </p>
        </AuthCard>
      );
    }

    return (
      <AuthCard title="Reset your password">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
          <label className="flex flex-col gap-1 text-sm">
            <span>Email</span>
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="rounded-lg border border-(--color-gold)/30 bg-black/30 px-3 py-2"
            />
          </label>
          <button
            type="submit"
            disabled={submitting}
            className="rounded-lg bg-(--color-gold) px-4 py-2 font-semibold text-black disabled:opacity-50"
          >
            {submitting ? "Please wait..." : "Send reset link"}
          </button>
        </form>
      </AuthCard>
    );
  }
  ```

- [ ] **Step 2: Commit**

  ```bash
  git add app/\(auth\)/forgot-password/page.tsx
  git commit -m "feat(auth): add forgot-password screen"
  ```

---

### Task 14: Reset-password page

**Files:**
- Create: `app/(auth)/reset-password/page.tsx`

**Interfaces:**
- Consumes: `createBrowserSupabaseClient()` from Task 3; `AuthCard` from Task 12.

- [ ] **Step 1: Implement**

  ```tsx
  // app/(auth)/reset-password/page.tsx
  "use client";

  import { useState } from "react";
  import { useRouter } from "next/navigation";

  import { createBrowserSupabaseClient } from "@/lib/supabase/client";
  import { AuthCard } from "@/components/auth/AuthCard";

  export default function ResetPasswordPage() {
    const router = useRouter();
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);

    async function handleSubmit(e: React.FormEvent) {
      e.preventDefault();
      if (submitting) return;
      setError(null);

      if (password !== confirmPassword) {
        setError("Passwords do not match.");
        return;
      }

      setSubmitting(true);
      const supabase = createBrowserSupabaseClient();
      const { error: updateError } = await supabase.auth.updateUser({ password });
      setSubmitting(false);

      if (updateError) {
        setError("Could not reset password. Request a new reset link and try again.");
        return;
      }

      router.push("/");
    }

    return (
      <AuthCard title="Set a new password">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
          <label className="flex flex-col gap-1 text-sm">
            <span>New password</span>
            <input
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="rounded-lg border border-(--color-gold)/30 bg-black/30 px-3 py-2"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span>Confirm new password</span>
            <input
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="rounded-lg border border-(--color-gold)/30 bg-black/30 px-3 py-2"
            />
          </label>
          {error && (
            <p role="alert" className="text-sm text-red-400">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={submitting}
            className="rounded-lg bg-(--color-gold) px-4 py-2 font-semibold text-black disabled:opacity-50"
          >
            {submitting ? "Please wait..." : "Reset password"}
          </button>
        </form>
      </AuthCard>
    );
  }
  ```

- [ ] **Step 2: Commit**

  ```bash
  git add app/\(auth\)/reset-password/page.tsx
  git commit -m "feat(auth): add reset-password screen"
  ```

---

### Task 15: Email confirmation route

**Files:**
- Create: `app/auth/confirm/route.ts`

**Interfaces:**
- Consumes: `createServerSupabaseClient()` from Task 4.

- [ ] **Step 1: Implement**

  ```ts
  // app/auth/confirm/route.ts
  import { NextResponse, type NextRequest } from "next/server";
  import type { EmailOtpType } from "@supabase/supabase-js";

  import { createServerSupabaseClient } from "@/lib/supabase/server";

  function isSameOriginRelativePath(next: string | null): next is string {
    if (!next) return false;
    if (!next.startsWith("/")) return false;
    if (next.startsWith("//")) return false;
    if (/^\/[a-zA-Z][a-zA-Z\d+\-.]*:/.test(next)) return false;
    return true;
  }

  export async function GET(request: NextRequest) {
    const { searchParams } = request.nextUrl;
    const tokenHash = searchParams.get("token_hash");
    const type = searchParams.get("type") as EmailOtpType | null;
    const rawNext = searchParams.get("next");
    const next = isSameOriginRelativePath(rawNext) ? rawNext : "/";

    if (!tokenHash || !type) {
      return NextResponse.redirect(new URL("/login?error=invalid_confirm_link", request.url));
    }

    const supabase = await createServerSupabaseClient();
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });

    if (error) {
      return NextResponse.redirect(new URL("/login?error=confirm_failed", request.url));
    }

    return NextResponse.redirect(new URL(next, request.url));
  }
  ```

- [ ] **Step 2: Manually verify against the local Supabase project**

  Complete Task 12's Step 5 verification now (sign up, click the emailed confirmation link, confirm it lands on `/`).

- [ ] **Step 3: Commit**

  ```bash
  git add app/auth/confirm/route.ts
  git commit -m "feat(auth): add email confirmation exchange route"
  ```

---

### Task 16: Sign-out route

**Files:**
- Create: `app/auth/signout/route.ts`

**Interfaces:**
- Consumes: `createServerSupabaseClient()` from Task 4.

- [ ] **Step 1: Implement**

  ```ts
  // app/auth/signout/route.ts
  import { NextResponse } from "next/server";

  import { createServerSupabaseClient } from "@/lib/supabase/server";

  export async function POST() {
    const supabase = await createServerSupabaseClient();
    await supabase.auth.signOut();
    return NextResponse.redirect(new URL("/login", process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"));
  }
  ```

- [ ] **Step 2: Commit**

  ```bash
  git add app/auth/signout/route.ts
  git commit -m "feat(auth): add POST-only signout route"
  ```

---

### Task 17: Wire the authenticated shell to real player identity

**Files:**
- Modify: `components/TopBar.tsx`
- Modify: `lib/playerStore.ts`

**Interfaces:**
- Consumes: `PlayerDto` from Task 9 via `GET /api/player` (converted in Task 18).
- Produces: `TopBar` renders real `displayName`/wallet instead of `mockPlayer`; a sign-out control; `playerStore` clears state and redirects on `401`.

- [ ] **Step 1: Add a sign-out action and clear-on-401 handling to `playerStore.ts`**

  In `lib/playerStore.ts`, replace the `refreshPlayer` function:

  ```ts
  export async function refreshPlayer() {
    const res = await fetch("/api/player");
    if (res.status === 401) {
      snapshot = { credits: 0, tournamentTokens: 0 };
      emit();
      if (typeof window !== "undefined") window.location.href = "/login";
      return;
    }
    if (!res.ok) return;
    const player: PlayerSnapshot = await res.json();
    snapshot = player;
    emit();
  }

  export async function signOut() {
    await fetch("/auth/signout", { method: "POST" });
    snapshot = { credits: 0, tournamentTokens: 0 };
    emit();
    if (typeof window !== "undefined") window.location.href = "/login";
  }
  ```

- [ ] **Step 2: Remove the `mockPlayer` import from `TopBar.tsx` and add a sign-out control**

  In `components/TopBar.tsx`, remove `import { mockPlayer } from "@/lib/mockPlayer";` and add a settings/account control that calls `signOut()` from `lib/playerStore.ts`. Keep the existing `displayName`-less placeholders (level/energy) as-is per spec §9.3 ("retaining gameplay-level placeholders only where no system exists") — only the identity/sign-out piece is in scope here, not a full profile redesign.

- [ ] **Step 3: Manually verify**

  Run: `yarn dev`, sign in, confirm the `TopBar` no longer references `mockPlayer`, click sign out, confirm redirect to `/login` and that `/api/player` afterward returns `401` (once Task 18 lands) or redirects (via proxy for pages).

- [ ] **Step 4: Commit**

  ```bash
  git add components/TopBar.tsx lib/playerStore.ts
  git commit -m "feat(auth): wire TopBar and playerStore to real auth state"
  ```

---

## Phase 3: Route conversion and isolation

### Task 18: Convert `GET /api/player`

**Files:**
- Modify: `app/api/player/route.ts`
- Test: `lib/__tests__/player-route.test.ts`

**Interfaces:**
- Consumes: `requirePlayer()` (Task 7), `toPlayerDto()` (Task 9), `toErrorResponse()` (Task 8).

- [ ] **Step 1: Implement**

  ```ts
  // app/api/player/route.ts
  import { NextResponse } from "next/server";

  import { requirePlayer } from "@/lib/auth/player";
  import { toPlayerDto } from "@/lib/auth/dto";
  import { toErrorResponse } from "@/lib/auth/responses";

  export async function GET() {
    try {
      const player = await requirePlayer();
      return NextResponse.json(toPlayerDto(player));
    } catch (error) {
      return toErrorResponse(error);
    }
  }
  ```

- [ ] **Step 2: Write route-level regression test using the exported handler directly**

  ```ts
  // lib/__tests__/player-route.test.ts
  import test from "node:test";
  import assert from "node:assert/strict";
  import { mock } from "node:test";

  test("GET /api/player returns 401 when unauthenticated", async () => {
    mock.module("@/lib/auth/player", {
      namedExports: {
        requirePlayer: async () => {
          const { UnauthenticatedError } = await import("../auth/errors");
          throw new UnauthenticatedError();
        },
      },
    });
    const { GET } = await import("../../app/api/player/route");
    const res = await GET();
    assert.equal(res.status, 401);
  });
  ```

  If `mock.module` path-mapping via `@/` alias is unreliable in the test loader, use a relative import (`../auth/player`) matching however `scripts/test-ts-loader.mjs` resolves other test files' imports — check `lib/__tests__/player.test.ts` (Task 7's predecessor) for the exact existing convention and match it exactly.

- [ ] **Step 3: Run test**

  Run: `node --import ./scripts/test-ts-loader.mjs --test lib/__tests__/player-route.test.ts`
  Expected: PASS

- [ ] **Step 4: Delete the now-unused `lib/player.ts` and its test only after Task 24 confirms no remaining call sites**

  Do not delete yet — 39 other files still import `getOrCreatePlayer` from it. This is handled in Task 24, Step 4.

- [ ] **Step 5: Commit**

  ```bash
  git add app/api/player/route.ts lib/__tests__/player-route.test.ts
  git commit -m "feat(auth): convert GET /api/player to requirePlayer() and DTO"
  ```

---

### Task 19: Convert `GET /api/chickens/[id]` to owner-scoped lookup

**Files:**
- Modify: `app/api/chickens/[id]/route.ts`
- Test: `lib/__tests__/chicken-detail-route.test.ts`

**Interfaces:**
- Consumes: `requirePlayer()` (Task 7), `toErrorResponse()` (Task 8).

This route currently does not scope by player at all (`prisma.chicken.findUnique({ where: { id } })`) — this is the spec's flagged remediation item (§8.2 row 1).

- [ ] **Step 1: Write failing test proving cross-owner access currently succeeds**

  ```ts
  // lib/__tests__/chicken-detail-route.test.ts
  import test from "node:test";
  import assert from "node:assert/strict";
  import { mock } from "node:test";

  import { prisma } from "../db";

  test("GET returns 404 for another player's chicken", async () => {
    await prisma.chicken.deleteMany();
    await prisma.player.deleteMany();

    const owner = await prisma.player.create({ data: { authUserId: "66666666-6666-6666-6666-666666666666" } });
    const requester = await prisma.player.create({ data: { authUserId: "77777777-7777-7777-7777-777777777777" } });
    const chicken = await prisma.chicken.create({
      data: { id: "chk-1", playerId: owner.id, name: "Test", sex: "MALE" },
    });

    mock.module("@/lib/auth/player", {
      namedExports: { requirePlayer: async () => requester },
    });

    const { GET } = await import("../../app/api/chickens/[id]/route");
    const res = await GET(new Request("http://x/api/chickens/chk-1"), {
      params: Promise.resolve({ id: chicken.id }),
    });

    assert.equal(res.status, 404);
  });

  test("GET returns the chicken for its owner", async () => {
    const owner = await prisma.player.findFirst({ where: { authUserId: "66666666-6666-6666-6666-666666666666" } });
    mock.module("@/lib/auth/player", {
      namedExports: { requirePlayer: async () => owner },
    });

    const { GET } = await import("../../app/api/chickens/[id]/route");
    const res = await GET(new Request("http://x/api/chickens/chk-1"), {
      params: Promise.resolve({ id: "chk-1" }),
    });

    assert.equal(res.status, 200);
  });
  ```

  Adjust the `Chicken.create` fields to whatever is actually required by the Prisma schema's non-optional `Chicken` fields — check `prisma/schema.prisma`'s `Chicken` model before running this test; add any missing required fields with plausible test values.

- [ ] **Step 2: Run test to verify the cross-owner case fails (returns 200, not 404)**

  Run: `node --import ./scripts/test-ts-loader.mjs --test lib/__tests__/chicken-detail-route.test.ts`
  Expected: first test FAILS (current code returns 200 for any valid id).

- [ ] **Step 3: Implement the fix**

  ```ts
  // app/api/chickens/[id]/route.ts
  import { NextResponse } from "next/server";

  import { requirePlayer } from "@/lib/auth/player";
  import { toErrorResponse } from "@/lib/auth/responses";
  import { prisma } from "@/lib/db";
  import { experienceInsights } from "@/lib/training/insights";
  import type { Chicken } from "@/lib/types";

  export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
      const player = await requirePlayer();
      const { id } = await params;
      const row = await prisma.chicken.findFirst({ where: { id, playerId: player.id } });

      if (!row) {
        return NextResponse.json({ error: "Chicken not found" }, { status: 404 });
      }

      const chicken = row as unknown as Chicken;
      const trainingInsights = experienceInsights(
        chicken.experience ?? { offensive: 0, defensive: 0, evasion: 0, counter: 0, pressure: 0, recovery: 0, adaptation: 0 }
      );

      return NextResponse.json({ ...row, trainingInsights });
    } catch (error) {
      return toErrorResponse(error);
    }
  }
  ```

- [ ] **Step 4: Run test to verify it passes**

  Run: `node --import ./scripts/test-ts-loader.mjs --test lib/__tests__/chicken-detail-route.test.ts`
  Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

  ```bash
  git add app/api/chickens/\[id\]/route.ts lib/__tests__/chicken-detail-route.test.ts
  git commit -m "fix(auth): scope chicken detail lookup to the requesting player"
  ```

---

### Task 20: Convert pedigree route to require root-rooster ownership

**Files:**
- Modify: `app/api/chickens/[id]/pedigree/route.ts`
- Test: `lib/__tests__/pedigree-route.test.ts` (existing file — check current contents first and extend rather than replace unrelated cases)

**Interfaces:**
- Consumes: `requirePlayer()` (Task 7), `toErrorResponse()` (Task 8).

- [ ] **Step 1: Read the existing test file to understand current coverage**

  Run: `cat lib/__tests__/pedigree-route.test.ts` — match its existing helper/fixture patterns rather than introducing a second style in the same file.

- [ ] **Step 2: Add a failing test for cross-owner denial**

  Append to `lib/__tests__/pedigree-route.test.ts` (using whatever fixture helper the existing file already defines for creating a chicken+player pair — reuse it, do not duplicate):

  ```ts
  test("GET returns 404 when the root rooster belongs to another player", async () => {
    // Reuse this file's existing fixture setup to create ownerPlayer + rootChicken,
    // then create requesterPlayer with a distinct authUserId.
    // Mock "@/lib/auth/player" requirePlayer to resolve requesterPlayer.
    // Call the route's GET with rootChicken.id and assert res.status === 404.
  });
  ```

  Replace the comment scaffold above with real code once Step 1's file contents are known — write the actual fixture calls, mock, and assertion inline using this file's real exported/local helpers.

- [ ] **Step 3: Run test to verify it fails**

  Run: `node --import ./scripts/test-ts-loader.mjs --test lib/__tests__/pedigree-route.test.ts`
  Expected: new test FAILS.

- [ ] **Step 4: Implement ownership check on the root only (spec §8.2 row 2 — private at launch, ancestors/descendants unrestricted by owner)**

  ```ts
  // app/api/chickens/[id]/pedigree/route.ts
  import { NextResponse } from "next/server";

  import { requirePlayer } from "@/lib/auth/player";
  import { toErrorResponse } from "@/lib/auth/responses";
  import { prisma } from "@/lib/db";
  import { buildAncestorTree, computeDescendantStats, type PedigreeChickenRow } from "@/lib/pedigree";

  async function lookup(id: string): Promise<PedigreeChickenRow | null> {
    const chicken = await prisma.chicken.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        sex: true,
        bloodlineId: true,
        generation: true,
        fatherId: true,
        motherId: true,
        record: true,
      },
    });
    return chicken as unknown as PedigreeChickenRow | null;
  }

  async function findChildren(parentId: string): Promise<PedigreeChickenRow[]> {
    const children = await prisma.chicken.findMany({
      where: { OR: [{ fatherId: parentId }, { motherId: parentId }] },
      select: {
        id: true,
        name: true,
        sex: true,
        bloodlineId: true,
        generation: true,
        fatherId: true,
        motherId: true,
        record: true,
      },
    });
    return children as unknown as PedigreeChickenRow[];
  }

  export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
      const player = await requirePlayer();
      const { id } = await params;

      const root = await prisma.chicken.findFirst({ where: { id, playerId: player.id }, select: { id: true } });
      if (!root) {
        return NextResponse.json({ error: "Chicken not found" }, { status: 404 });
      }

      const tree = await buildAncestorTree(id, lookup, 3);
      if (!tree) {
        return NextResponse.json({ error: "Chicken not found" }, { status: 404 });
      }

      const descendants = await computeDescendantStats(id, findChildren);
      return NextResponse.json({ ancestry: tree, descendants });
    } catch (error) {
      return toErrorResponse(error);
    }
  }
  ```

- [ ] **Step 5: Run test to verify it passes**

  Run: `node --import ./scripts/test-ts-loader.mjs --test lib/__tests__/pedigree-route.test.ts`
  Expected: PASS, including all pre-existing tests in the file.

- [ ] **Step 6: Commit**

  ```bash
  git add app/api/chickens/\[id\]/pedigree/route.ts lib/__tests__/pedigree-route.test.ts
  git commit -m "fix(auth): require root-rooster ownership on pedigree route"
  ```

---

### Task 21: Make `GET /api/marketplace` read-only and move restocking to a script

**Files:**
- Modify: `app/api/marketplace/route.ts`
- Create: `scripts/restock-marketplace.ts`
- Test: `lib/__tests__/marketplace-route.test.ts` (existing — extend)

**Interfaces:**
- Consumes: `requirePlayer()` (Task 7), `toErrorResponse()` (Task 8), `generateListing`/`MARKET_STOCK_SIZE` from `lib/marketplace.ts` (unchanged).

Spec §8.2 row 3: "Move restocking out of GET into seed/deployment/admin work; GET must be read-only."

- [ ] **Step 1: Check the existing test file's current assertions**

  Run: `cat lib/__tests__/marketplace-route.test.ts` — note whether it currently asserts GET performs restocking; that assertion must be removed/updated since this is an intentional behavior change per spec.

- [ ] **Step 2: Implement the read-only GET**

  ```ts
  // app/api/marketplace/route.ts
  import { NextResponse } from "next/server";

  import { requirePlayer } from "@/lib/auth/player";
  import { toErrorResponse } from "@/lib/auth/responses";
  import { prisma } from "@/lib/db";

  export async function GET() {
    try {
      await requirePlayer();
      const listings = await prisma.marketListing.findMany({ orderBy: { createdAt: "asc" } });
      return NextResponse.json(listings);
    } catch (error) {
      return toErrorResponse(error);
    }
  }
  ```

- [ ] **Step 3: Create the restock script carrying over the old logic**

  ```ts
  // scripts/restock-marketplace.ts
  import { prisma } from "@/lib/db";
  import { generateListing, MARKET_STOCK_SIZE } from "@/lib/marketplace";

  async function main() {
    const count = await prisma.marketListing.count();
    if (count >= MARKET_STOCK_SIZE) {
      console.log(`Marketplace already has ${count} listings; no restock needed.`);
      return;
    }
    const restock = Array.from({ length: MARKET_STOCK_SIZE - count }, () => generateListing());
    await prisma.marketListing.createMany({ data: restock });
    console.log(`Restocked ${restock.length} listings.`);
  }

  main()
    .catch((err) => {
      console.error(err);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
  ```

- [ ] **Step 4: Add an npm script**

  In `package.json`, add: `"restock-marketplace": "node --import ./scripts/test-ts-loader.mjs scripts/restock-marketplace.ts"`

- [ ] **Step 5: Update the existing test file to match the new contract**

  Update `lib/__tests__/marketplace-route.test.ts` so it seeds listings directly via `prisma.marketListing.createMany` in test setup (instead of relying on GET's old side effect), mocks `requirePlayer`, and asserts GET returns exactly the seeded listings without adding new rows. Run the marketplace count before and after GET and assert it is unchanged.

- [ ] **Step 6: Run tests**

  Run: `node --import ./scripts/test-ts-loader.mjs --test lib/__tests__/marketplace-route.test.ts`
  Expected: PASS

- [ ] **Step 7: Run the restock script locally once so dev data isn't empty**

  Run: `yarn restock-marketplace`

- [ ] **Step 8: Commit**

  ```bash
  git add app/api/marketplace/route.ts scripts/restock-marketplace.ts package.json lib/__tests__/marketplace-route.test.ts
  git commit -m "fix(auth): make marketplace GET read-only, move restocking to a script"
  ```

---

### Task 22: Owner-bind spar sessions

**Files:**
- Modify: `lib/combat/sparSessions.ts`
- Modify: `app/api/spar/start/route.ts`
- Modify: `app/api/spar/[sessionId]/step/route.ts`
- Test: `lib/__tests__/spar-session-ownership.test.ts`

**Interfaces:**
- Produces: `createSparSession(session: BattleSession, ownerPlayerId: string): string`, `getSparSession(id: string, ownerPlayerId: string): BattleSession | undefined` (signature change — Task consumers below must match).

- [ ] **Step 1: Write failing test for owner-bound session lookup**

  ```ts
  // lib/__tests__/spar-session-ownership.test.ts
  import test from "node:test";
  import assert from "node:assert/strict";

  import { createSparSession, getSparSession } from "../combat/sparSessions";
  import { BattleSession } from "../combat/simulator";

  test("getSparSession returns undefined for the wrong owner", () => {
    const fakeSession = {} as BattleSession;
    const id = createSparSession(fakeSession, "player-a");

    assert.equal(getSparSession(id, "player-b"), undefined);
    assert.equal(getSparSession(id, "player-a"), fakeSession);
  });
  ```

- [ ] **Step 2: Run test to verify it fails**

  Run: `node --import ./scripts/test-ts-loader.mjs --test lib/__tests__/spar-session-ownership.test.ts`
  Expected: FAIL (current signature doesn't accept/check an owner).

- [ ] **Step 3: Implement owner binding**

  ```ts
  // lib/combat/sparSessions.ts
  import { BattleSession } from "./simulator";

  type OwnedSession = { session: BattleSession; ownerPlayerId: string };

  const sessions = new Map<string, OwnedSession>();

  let nextId = 1;

  export function createSparSession(session: BattleSession, ownerPlayerId: string): string {
    const id = `spar-${nextId++}-${Date.now().toString(36)}`;
    sessions.set(id, { session, ownerPlayerId });
    return id;
  }

  export function getSparSession(id: string, ownerPlayerId: string): BattleSession | undefined {
    const entry = sessions.get(id);
    if (!entry || entry.ownerPlayerId !== ownerPlayerId) return undefined;
    return entry.session;
  }

  export function endSparSession(id: string, ownerPlayerId: string): void {
    const entry = sessions.get(id);
    if (!entry || entry.ownerPlayerId !== ownerPlayerId) return;
    sessions.delete(id);
  }
  ```

- [ ] **Step 4: Run test to verify it passes**

  Run: `node --import ./scripts/test-ts-loader.mjs --test lib/__tests__/spar-session-ownership.test.ts`
  Expected: PASS

- [ ] **Step 5: Update `app/api/spar/start/route.ts`**

  Replace `import { getOrCreatePlayer } from "@/lib/player";` with `import { requirePlayer } from "@/lib/auth/player";` and `import { toErrorResponse } from "@/lib/auth/responses";`. Replace `const player = await getOrCreatePlayer();` with `const player = await requirePlayer();`, replace the existing `if (!row || row.playerId !== player.id)` 404 check (keep it — it's already correct ownership logic), and change `createSparSession(session)` to `createSparSession(session, player.id)`. Wrap the handler body in `try { ... } catch (error) { return toErrorResponse(error); }`.

- [ ] **Step 6: Update `app/api/spar/[sessionId]/step/route.ts`**

  Add `import { requirePlayer } from "@/lib/auth/player";` and `import { toErrorResponse } from "@/lib/auth/responses";`. Add `const player = await requirePlayer();` at the top of `POST`, change `getSparSession(sessionId)` to `getSparSession(sessionId, player.id)`, and change `endSparSession(sessionId)` (wherever it's called on fight-over) to `endSparSession(sessionId, player.id)`. Wrap the handler body in `try { ... } catch (error) { return toErrorResponse(error); }`. Read the full current file first (`cat app/api/spar/\[sessionId\]/step/route.ts`) to get the exact existing variable names before editing — do not guess at names not shown in this plan.

- [ ] **Step 7: Manually verify session hijack is blocked**

  Run: `yarn dev`, start a spar session as one authenticated user, copy the `sessionId`, attempt to `POST /api/spar/<sessionId>/step` as a second authenticated user (a second browser profile/incognito signed in with a different account), confirm `404`.

- [ ] **Step 8: Commit**

  ```bash
  git add lib/combat/sparSessions.ts app/api/spar/start/route.ts "app/api/spar/[sessionId]/step/route.ts" lib/__tests__/spar-session-ownership.test.ts
  git commit -m "fix(auth): owner-bind in-memory spar sessions"
  ```

---

### Task 23: Lock down dev-only mutation routes

**Files:**
- Modify: `lib/dev.ts`
- Modify: `app/api/dev/pve/route.ts`
- Modify: `app/api/dev/facilities/route.ts`
- Test: `lib/__tests__/dev-mode-guard.test.ts`

**Interfaces:**
- Produces: `isDevModeEnabled(authUserId: string | null): boolean` (signature change — was previously zero-arg and only checked `NODE_ENV`, which spec §8.2 explicitly forbids as the sole gate: "Never authorize merely from `NODE_ENV`").

- [ ] **Step 1: Write failing test**

  ```ts
  // lib/__tests__/dev-mode-guard.test.ts
  import test from "node:test";
  import assert from "node:assert/strict";

  import { isDevModeEnabled } from "../dev";

  test("dev mode is disabled in production regardless of allowlist", () => {
    const original = { ...process.env };
    process.env.NODE_ENV = "production";
    process.env.DEV_MODE_ALLOWLIST = "11111111-1111-1111-1111-111111111111";
    assert.equal(isDevModeEnabled("11111111-1111-1111-1111-111111111111"), false);
    process.env = original;
  });

  test("dev mode requires an allowlisted authUserId outside production", () => {
    const original = { ...process.env };
    process.env.NODE_ENV = "development";
    process.env.DEV_MODE_ALLOWLIST = "11111111-1111-1111-1111-111111111111";
    assert.equal(isDevModeEnabled("11111111-1111-1111-1111-111111111111"), true);
    assert.equal(isDevModeEnabled("22222222-2222-2222-2222-222222222222"), false);
    assert.equal(isDevModeEnabled(null), false);
    process.env = original;
  });
  ```

- [ ] **Step 2: Run test to verify it fails**

  Run: `node --import ./scripts/test-ts-loader.mjs --test lib/__tests__/dev-mode-guard.test.ts`
  Expected: FAIL (current `isDevModeEnabled` takes no arguments and only checks `NODE_ENV`).

- [ ] **Step 3: Implement**

  ```ts
  // lib/dev.ts
  export function isDevModeEnabled(authUserId: string | null): boolean {
    if (process.env.NODE_ENV === "production") return false;
    if (!authUserId) return false;
    const allowlist = (process.env.DEV_MODE_ALLOWLIST ?? "").split(",").map((s) => s.trim()).filter(Boolean);
    return allowlist.includes(authUserId);
  }
  ```

- [ ] **Step 4: Run test to verify it passes**

  Run: `node --import ./scripts/test-ts-loader.mjs --test lib/__tests__/dev-mode-guard.test.ts`
  Expected: PASS

- [ ] **Step 5: Update `app/api/dev/pve/route.ts`**

  Replace `import { getOrCreatePlayer } from "@/lib/player";` with `import { requirePlayer } from "@/lib/auth/player";` and `import { requireAuthClaims } from "@/lib/auth/session";` and `import { toErrorResponse } from "@/lib/auth/responses";`. Change the guard from `if (!isDevModeEnabled())` to check claims first:

  ```ts
  export async function POST(request: Request) {
    try {
      const claims = await requireAuthClaims();
      if (!isDevModeEnabled(claims.authUserId)) {
        return NextResponse.json({ error: "DEV_MODE_DISABLED" }, { status: 403 });
      }
      const body = (await request.json()) as DevPveAction;
      const player = await requirePlayer();
      // ...rest unchanged
    } catch (error) {
      return toErrorResponse(error);
    }
  }
  ```

  Read the full current file (`cat app/api/dev/pve/route.ts`) before editing to preserve the existing `try`/`catch` around `PveError` — merge the new outer `catch` with the existing `PveError` handling rather than replacing it; the `PveError` branch must still run first.

- [ ] **Step 6: Apply the same pattern to `app/api/dev/facilities/route.ts`**

  Read the file first (`cat app/api/dev/facilities/route.ts`) and apply the identical guard change described in Step 5.

- [ ] **Step 7: Set a local allowlist value for manual testing**

  In `.env.local`, add `DEV_MODE_ALLOWLIST=<your test authUserId>` and add `DEV_MODE_ALLOWLIST=` to `.env.local.example` with a comment that it must be empty/unset in production.

- [ ] **Step 8: Run full test suite**

  Run: `yarn test`
  Expected: no regressions in dev-route tests.

- [ ] **Step 9: Commit**

  ```bash
  git add lib/dev.ts app/api/dev/pve/route.ts app/api/dev/facilities/route.ts lib/__tests__/dev-mode-guard.test.ts .env.local.example
  git commit -m "fix(auth): require allowlisted authenticated developer for dev mutation routes"
  ```

---

### Task 24: Bulk-convert remaining `getOrCreatePlayer()` call sites

**Files:**
- Modify (mechanical swap — `import { getOrCreatePlayer } from "@/lib/player";` → `import { requirePlayer } from "@/lib/auth/player";` and every `getOrCreatePlayer()` call → `requirePlayer()`) in exactly these 37 files (the full call-site inventory minus the 6 already converted in Tasks 18–23):

  ```text
  app/api/breed/route.ts
  app/api/chickens/[id]/age-up/route.ts
  app/api/chickens/[id]/fight/route.ts
  app/api/chickens/[id]/medical/route.ts
  app/api/chickens/[id]/opponent/route.ts
  app/api/chickens/[id]/rest/route.ts
  app/api/chickens/[id]/retire/route.ts
  app/api/chickens/[id]/sell/route.ts
  app/api/chickens/[id]/tournament/route.ts
  app/api/chickens/[id]/train/route.ts
  app/api/chickens/[id]/training/redistribute/route.ts
  app/api/chickens/route.ts
  app/api/clinic/route.ts
  app/api/clinic/upgrade/route.ts
  app/api/combat/sessions/[sessionId]/awakenings/route.ts
  app/api/combat/sessions/[sessionId]/begin/route.ts
  app/api/combat/sessions/[sessionId]/commands/route.ts
  app/api/combat/sessions/[sessionId]/route.ts
  app/api/combat/sessions/[sessionId]/sync/route.ts
  app/api/combat/sessions/route.ts
  app/api/eggs/[id]/hatch/route.ts
  app/api/eggs/route.ts
  app/api/facilities/[id]/upgrade/route.ts
  app/api/facilities/route.ts
  app/api/live/bet/route.ts
  app/api/live/matchup/route.ts
  app/api/live/resolve/route.ts
  app/api/marketplace/[id]/buy/route.ts
  app/api/pve/bosses/[bossId]/fight/start/route.ts
  app/api/pve/bosses/route.ts
  app/api/pve/events/route.ts
  app/api/ranch-hub/route.ts
  app/api/tournaments/[id]/advance/route.ts
  app/api/tournaments/[id]/fight/start/route.ts
  app/api/tournaments/[id]/route.ts
  app/api/training-sessions/[id]/cancel/route.ts
  app/api/training-sessions/preview/route.ts
  app/api/training-sessions/route.ts
  ```

- Delete: `lib/player.ts`
- Delete: `lib/__tests__/player.test.ts`

**Interfaces:**
- Consumes: `requirePlayer()` from Task 7.

Every one of these files already passes `player.id` into a service function (confirmed by reading each file's `getOrCreatePlayer` call site) — this is a pure identifier swap, not a logic change. None of them need new ownership predicates beyond what `requirePlayer()`'s thrown `UnauthenticatedError` already provides via each route's existing error handling; where a route has no top-level `try`/`catch`, wrap the body so `toErrorResponse` handles the new possible `UnauthenticatedError`.

- [ ] **Step 1: Apply the mechanical swap file by file**

  For each file in the list above:
  1. Read the file.
  2. Replace `import { getOrCreatePlayer } from "@/lib/player";` with `import { requirePlayer } from "@/lib/auth/player";`.
  3. Replace every `getOrCreatePlayer()` call with `requirePlayer()`.
  4. If the file has no surrounding `try`/`catch` around the handler body, add `import { toErrorResponse } from "@/lib/auth/responses";` and wrap the body, returning `toErrorResponse(error)` in the `catch`. If the file already has a `try`/`catch` (e.g., routes catching a domain-specific error like `CombatServiceError`, `PveError`, `TournamentError`), add a second `catch` clause (or an `else`/fallthrough in the existing one) that calls `toErrorResponse(error)` for anything not matching the domain error type — do not remove the existing domain-error handling.

  Do this file-by-file rather than with a blind global find-replace, since several files (`app/api/facilities/route.ts`, `app/api/training-sessions/preview/route.ts`, `app/api/chickens/[id]/train/route.ts`) have single-line minified handler bodies (`const player=await getOrCreatePlayer();...`) that need careful reading, not pattern-matching, to edit correctly without breaking adjacent code on the same line.

- [ ] **Step 2: Run the full test suite after every 8–10 files to catch mistakes early**

  Run: `yarn test`
  Expected: same or better pass count than the pre-conversion baseline at each checkpoint; investigate immediately if a previously-passing test starts failing.

- [ ] **Step 3: After all 37 files are converted, grep to confirm zero remaining references**

  Run: `grep -rn "getOrCreatePlayer" app lib --include="*.ts"`
  Expected: no output.

- [ ] **Step 4: Delete `lib/player.ts` and its test**

  ```bash
  rm lib/player.ts lib/__tests__/player.test.ts
  ```

- [ ] **Step 5: Run the full test suite and production build**

  Run: `yarn test`
  Run: `yarn next build`
  Expected: both succeed.

- [ ] **Step 6: Commit**

  ```bash
  git add -A
  git commit -m "fix(auth): replace getOrCreatePlayer() with requirePlayer() across all routes"
  ```

---

### Task 25: Two-player route integration test matrix

**Files:**
- Create: `lib/__tests__/two-player-isolation.test.ts`
- Create: `lib/__tests__/helpers/authFixtures.ts`

**Interfaces:**
- Consumes: `prisma` from `lib/db.ts`, `requirePlayer` mocking pattern established in Tasks 18–20.
- Produces: `createTestPlayerPair(): Promise<{ playerA: Player; playerB: Player }>` — a reusable fixture for this and future auth tests.

This is the spec §13.2 mandatory high-risk matrix, run against the actually-converted routes rather than re-described abstractly.

- [ ] **Step 1: Implement the shared fixture helper**

  ```ts
  // lib/__tests__/helpers/authFixtures.ts
  import { randomUUID } from "node:crypto";

  import { prisma } from "../../db";

  export async function createTestPlayerPair() {
    const playerA = await prisma.player.create({ data: { authUserId: randomUUID() } });
    const playerB = await prisma.player.create({ data: { authUserId: randomUUID() } });
    return { playerA, playerB };
  }

  export function mockRequirePlayerAs(player: { id: string }) {
    return {
      namedExports: {
        requirePlayer: async () => player,
      },
    };
  }
  ```

- [ ] **Step 2: Write the cross-owner denial matrix for the highest-risk routes named in spec §13.2**

  ```ts
  // lib/__tests__/two-player-isolation.test.ts
  import test from "node:test";
  import assert from "node:assert/strict";
  import { mock } from "node:test";

  import { prisma } from "../db";
  import { createTestPlayerPair, mockRequirePlayerAs } from "./helpers/authFixtures";

  test("chicken sell: player B cannot sell player A's chicken", async () => {
    const { playerA, playerB } = await createTestPlayerPair();
    const chicken = await prisma.chicken.create({
      data: { id: `chk-${playerA.id}`, playerId: playerA.id, name: "Isolation Test", sex: "MALE" },
    });

    mock.module("@/lib/auth/player", mockRequirePlayerAs(playerB));
    const { POST } = await import("../../app/api/chickens/[id]/sell/route");
    const res = await POST(new Request("http://x", { method: "POST" }), {
      params: Promise.resolve({ id: chicken.id }),
    });

    assert.equal(res.status, 404);
    const unchanged = await prisma.chicken.findUnique({ where: { id: chicken.id } });
    assert.equal(unchanged?.playerId, playerA.id);
  });
  ```

  Add sibling `test(...)` blocks in the same file for the remaining spec §13.2 high-risk cases: chicken retire, chicken age-up, marketplace buy, training-session cancel, live bet, tournament advance, canonical combat session read (`GET /api/combat/sessions/[sessionId]`), and eggs hatch. For each, read that route's current file first to know its exact exported handler name, HTTP method, and params shape (some take `{ id }`, some take `{ sessionId }`), then write the equivalent create-fixture / mock-as-playerB / call-handler / assert-404-and-unchanged-row test — do not guess a route's params shape without reading the file.

- [ ] **Step 3: Run the full matrix**

  Run: `node --import ./scripts/test-ts-loader.mjs --test lib/__tests__/two-player-isolation.test.ts`
  Expected: PASS for every case. Any failure here is a real cross-account leak — fix the route (not the test) before proceeding.

- [ ] **Step 4: Commit**

  ```bash
  git add lib/__tests__/two-player-isolation.test.ts lib/__tests__/helpers/authFixtures.ts
  git commit -m "test(auth): add two-player cross-account isolation matrix"
  ```

---

## Phase 4: Production hardening

### Task 26: Security headers and origin validation

**Files:**
- Modify: `next.config.ts`
- Modify: `proxy.ts`

**Interfaces:**
- Consumes: `NEXT_PUBLIC_APP_URL` from `lib/env.ts` (Task 1).

- [ ] **Step 1: Read the current `next.config.ts`**

  Run: `cat next.config.ts`

- [ ] **Step 2: Add security headers**

  Add a `headers()` async function to the Next config exporting: `Strict-Transport-Security`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, and a report-only `Content-Security-Policy-Report-Only` with `frame-ancestors 'none'` plus `default-src 'self'` and explicit allowances for the game's font/3D asset origins (check `app/layout.tsx` and any `<link>`/font imports for external origins actually in use before writing the policy — do not write a policy that blocks assets you haven't verified are same-origin or explicitly allowed).

- [ ] **Step 3: Add same-origin check for mutations in `proxy.ts`**

  In `proxy.ts`, before the auth check, for any request where `request.method !== "GET"` and `pathname.startsWith("/api/")`, compare the `Origin` header against `NEXT_PUBLIC_APP_URL` from `lib/env.ts`; if present and mismatched, return a `403` JSON response immediately (skip this check when `Origin` is absent, since same-origin browser requests to `/api/*` may omit it depending on fetch mode — same-origin `fetch()` calls typically don't send `Origin` for simple requests, so absence alone must not be treated as cross-origin).

- [ ] **Step 4: Manually verify headers are present**

  Run: `yarn build && yarn start`, then: `curl -I http://localhost:3000/`
  Expected: response includes `Strict-Transport-Security`, `X-Content-Type-Options`, `Referrer-Policy`.

- [ ] **Step 5: Commit**

  ```bash
  git add next.config.ts proxy.ts
  git commit -m "feat(auth): add security headers and cross-origin mutation checks"
  ```

---

### Task 27: Migration B — contract phase

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/<timestamp>_finalize_player_auth/migration.sql`
- Create: `scripts/check-unlinked-players.ts`

**Interfaces:**
- Consumes: `prisma` from `lib/db.ts`.

Do not run this task until Task 24 is complete (all routes converted) and Task 0's data decision (fresh vs. preserved-owner) has actually been executed against the target database — Migration B fails by design if any `Player.authUserId` is still null.

- [ ] **Step 1: Add the preflight check script**

  ```ts
  // scripts/check-unlinked-players.ts
  import { prisma } from "@/lib/db";

  async function main() {
    const count = await prisma.player.count({ where: { authUserId: null } });
    console.log(`Unlinked players: ${count}`);
    if (count > 0) {
      console.error("Migration B cannot run until this is 0. Run scripts/link-legacy-player.ts or delete unlinked rows.");
      process.exit(1);
    }
  }

  main().finally(() => prisma.$disconnect());
  ```

  Add `"check-unlinked-players": "node --import ./scripts/test-ts-loader.mjs scripts/check-unlinked-players.ts"` to `package.json`.

- [ ] **Step 2: Run the preflight against local dev data**

  Run: `yarn check-unlinked-players`
  Expected: exits non-zero if there are unlinked players; resolve them (via Task 10's script or by deleting stale dev rows) before continuing.

- [ ] **Step 3: Update the schema to make `authUserId` required**

  In `prisma/schema.prisma`, change `authUserId String? @unique @db.Uuid` to `authUserId String @unique @db.Uuid`.

- [ ] **Step 4: Generate the migration**

  Run: `yarn prisma migrate dev --name finalize_player_auth --create-only`

- [ ] **Step 5: Add the `auth.users` foreign key via raw SQL in the same migration file**

  Append to the generated `migration.sql`:

  ```sql
  ALTER TABLE "Player"
    ADD CONSTRAINT "Player_authUserId_fkey"
    FOREIGN KEY ("authUserId") REFERENCES "auth"."users"("id")
    ON DELETE RESTRICT;
  ```

- [ ] **Step 6: Apply and validate**

  Run: `yarn prisma migrate dev`
  Run: `yarn prisma validate`
  Expected: both succeed (locally only if there are zero unlinked players; do not run against production without repeating Step 2 there first).

- [ ] **Step 7: Run full test suite and build**

  Run: `yarn test`
  Run: `yarn next build`
  Expected: both succeed.

- [ ] **Step 8: Commit**

  ```bash
  git add prisma/schema.prisma prisma/migrations scripts/check-unlinked-players.ts package.json
  git commit -m "feat(auth): finalize Player-to-auth.users link (migration B)"
  ```

---

### Task 28: Final acceptance pass

**Files:** none (verification only)

- [ ] **Step 1: Run the full pre-deploy check list from the spec (§15)**

  ```bash
  yarn prisma validate
  yarn test
  yarn next build
  yarn prisma migrate status
  yarn check-unlinked-players
  ```

  Expected: all succeed.

- [ ] **Step 2: Walk the spec's acceptance criteria (§16) as a manual checklist**

  Confirm each of the following against the running app (using two real or two local Supabase test accounts):
  - Every active game-data API returns `401` without a session (spot-check 3–4 converted routes with `curl` and no cookie).
  - Two accounts get distinct `Player` rows (`yarn prisma studio`, inspect `Player` table).
  - `grep -rn "findFirst()" lib app --include="*.ts" | grep -i player` shows no player-identity `findFirst()` usage (ownership-scoped `findFirst({ where: { id, playerId } })` calls are fine and expected — only a bare `Player.findFirst()` used for identity is the violation).
  - Signup → confirm → sign-in → deep-link `next` → signout all work against the local Supabase project.

- [ ] **Step 3: Report results to the user**

  Summarize pass/fail for each acceptance item; do not mark the feature complete if any item fails — file it as a follow-up instead of silently skipping it.
