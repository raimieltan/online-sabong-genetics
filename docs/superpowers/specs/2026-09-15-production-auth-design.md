# Production Authentication and Account Isolation — Design Spec

**Status:** Implementation specification  
**Date:** 2026-09-15  
**Priority:** P0 production launch blocker  
**Owner:** Application/backend  
**Parent spec:** `docs/superpowers/specs/gamefowl_dynasty_full_mechanics.md`, especially starter-account anti-abuse (§2), server authority (§50), and player profiles (§54)  
**Companion spec:** `docs/superpowers/specs/2026-09-15-new-player-onboarding-design.md` owns the starter grant, first-run state machine, and post-confirmation onboarding experience
**Target stack:** Next.js 16 App Router, Supabase Auth, Supabase Postgres, Prisma 6, Vercel

---

## 1. Decision summary

Cockfight Chronicles will use Supabase Auth as the identity provider and cookie-backed SSR session provider.

Launch authentication supports:

- email and password;
- mandatory email confirmation before game access;
- password reset;
- sign out from the current browser.

Google OAuth and account linking are post-launch additions. Anonymous/guest accounts are not part of launch because starter assets and currency make disposable accounts an abuse vector.

Every authenticated Supabase user maps one-to-one to one application `Player`. The application continues to access game data through Prisma. Supabase Auth proves identity; the server-side data-access layer resolves that identity to a `Player`; existing services continue to receive an explicit `playerId` and enforce resource ownership.

`proxy.ts` refreshes auth cookies and performs optimistic page redirects. It is not an authorization boundary. Every protected Route Handler must call the server-only auth/data-access layer before reading or mutating player data.

---

## 2. Launch blocker and current state

The application has no authentication package, auth routes, auth UI, or request principal today.

`lib/player.ts#getOrCreatePlayer()` currently runs `prisma.player.findFirst()` and creates a blank row only if no player exists. Consequently:

- every browser operates the same first database account;
- a newly created second `Player` can never be selected by normal requests;
- possession of a chicken, tournament, live-match, or session identifier is often enough to attempt access;
- route-level ownership checks compare against a shared player rather than the caller;
- starter grants cannot be made safely per person;
- audit events cannot identify a real account.

Existing strengths to retain:

- most game services already accept `playerId` explicitly;
- many mutations already verify `row.playerId === playerId`;
- canonical combat persists `ownerPlayerId` on encounters and sessions;
- economy, training, clinic, PvE, and tournament mutations generally use database transactions.

Known adjacent launch blockers discovered during this audit:

- `prisma/schema.prisma` defines `MarketListing` twice and currently fails `prisma validate` with P1012. This must be fixed before the auth migration can be generated or deployed.
- the local `.env` contains a live-looking database credential. It is ignored by Git, but the credential must be rotated before production and removed from any logs, shell history, or copied artifacts.
- several legacy combat registries are process-local. Auth does not make those durable across Vercel instances. Canonical persisted combat is the production path; non-canonical stateful routes must be retired or explicitly treated as non-durable exhibition features.

---

## 3. Goals

1. Identify the caller of every game request with a verified, server-trusted subject.
2. Guarantee that a caller can read and mutate only their own private game state.
3. Preserve current game data and foreign-key relationships during account migration.
4. Make account provisioning idempotent and safe under concurrent first requests.
5. Keep authentication concerns centralized instead of duplicating cookie/JWT code in handlers.
6. Produce consistent `401`, `403`, and non-enumerating `404` responses.
7. Support secure login, confirmation, recovery, refresh, and logout on Vercel.
8. Add enough telemetry and tests to prove account isolation before launch.
9. Prevent a newly registered user from inheriting the existing singleton/dev player.

## 4. Non-goals

This implementation does not add:

- roles, staff administration, or an admin dashboard;
- guest/anonymous play or guest-to-account merging;
- Google/Apple/Facebook OAuth at launch;
- MFA at launch;
- public player or public chicken profiles;
- direct browser access to game tables through Supabase Data APIs;
- a rewrite of Prisma services to the Supabase client;
- cross-device “sign out everywhere” UI;
- sanctions, age verification, KYC, payments, or wagering compliance;
- a general application rate-limiting platform.

Real-money wagering remains outside launch scope. Authentication does not resolve the legal and platform-policy requirements described in the baseline mechanics spec.

---

## 5. Security invariants

The following are release-blocking invariants:

1. No production code may select a player with `findFirst()` or infer a player from global database state.
2. A `playerId`, `ownerPlayerId`, email, or auth subject supplied in request JSON, query parameters, or headers is never trusted.
3. The only source of caller identity is a verified Supabase access-token claim read from the server-side cookie client.
4. `supabase.auth.getSession()` must not be used for authorization. Use `getClaims()` to verify identity; use `getUser()` only when a fresh Auth user record is required.
5. Every private resource lookup includes the caller's `playerId` in the database predicate where practical. Do not fetch by ID and authorize only in the UI.
6. A resource belonging to another player returns the same `404` response as a nonexistent resource. This prevents ID enumeration.
7. Authenticated-but-disallowed operations return `403`; missing/invalid/expired authentication returns `401` from APIs and redirects to `/login` from protected pages.
8. Mutations do not rely on `proxy.ts` for security. Route Handlers authenticate again through the data-access layer.
9. Supabase publishable keys may be exposed to the browser; Supabase secret/service-role keys and `DATABASE_URL` must never be included in client bundles or `NEXT_PUBLIC_*` variables.
10. Development mutation routes are unavailable in production regardless of authentication.
11. A starter roster/currency grant occurs at most once for each `Player`, inside one transaction.
12. Session and encounter IDs are always owner-bound, including in-memory exhibition/spar sessions.

---

## 6. Identity and account model

### 6.1 Source of truth

Supabase `auth.users.id` is the immutable external identity. `Player.id` remains the internal game-account ID so existing foreign keys and game services do not need a high-risk primary-key rewrite.

Add these fields to `Player`:

```prisma
model Player {
  id              String    @id @default(uuid())
  authUserId      String    @unique @db.Uuid
  displayName     String?
  onboardingState String    @default("PENDING")
  provisionedAt   DateTime?
  lastSeenAt      DateTime?
  createdAt       DateTime  @default(now())
  credits         Int       @default(1000)
  // existing fields and relations unchanged
}
```

The migration adds a raw SQL foreign key from `public."Player"."authUserId"` to `auth.users(id)` with `ON DELETE RESTRICT`. Account deletion must be an explicit application workflow that first archives or deletes game data; deleting an Auth user must never silently erase a dynasty.

Do not duplicate email as an authoritative identifier. The login UI may display the verified email from Supabase. If a contact email is later persisted on `Player`, treat it as a cache that may change, not an ownership key.

### 6.2 Two-phase migration

Because existing databases may contain a singleton development player, ship the schema change in two migrations:

**Migration A — expand**

- add nullable `authUserId UUID`, `displayName`, `onboardingState`, `provisionedAt`, and `lastSeenAt`;
- add a partial/unique index for non-null `authUserId`;
- deploy code that can resolve only linked accounts;
- do not auto-link an unclaimed row to the first person who signs in.

**Data decision — explicit and audited**

Before production cutover, choose exactly one:

- Fresh production: delete/reseed development game rows, then create players only through authenticated provisioning.
- Preserve an owner account: create/identify the intended Supabase Auth user and run a one-time script with explicit `AUTH_USER_ID` and `PLAYER_ID` arguments. The script fails unless both records exist and neither is already linked.

The script must print the IDs being linked, require a production confirmation flag, make one transactional update, and write an audit record or deployment log. It must never use `findFirst()`.

**Migration B — contract**

- verify `COUNT(*) WHERE authUserId IS NULL = 0`;
- make `authUserId` non-null;
- add the foreign key to `auth.users(id)`;
- remove the old singleton helper and its tests.

### 6.3 Provisioning

Implement `getOrProvisionPlayer(authUserId)` as an idempotent transaction:

1. look up `Player` by unique `authUserId`;
2. if present, return it;
3. otherwise create the `Player`, versioned onboarding progress, starter pair, starter facilities, trade locks, entitlements, and provisioning marker defined by the onboarding companion spec in one transaction;
4. on unique-conflict from concurrent requests, re-read and return the winning row;
5. never accept starting credits, assets, or identity fields from the browser.

Provision on the first authenticated request after email confirmation, not from a database trigger on `auth.users`. This keeps game defaults in versioned application code and prevents a failed game-data trigger from blocking Auth signups.

---

## 7. Auth architecture

### 7.1 Dependencies and files

Add:

```text
@supabase/supabase-js
@supabase/ssr
```

Create:

```text
lib/supabase/client.ts          browser client; publishable values only
lib/supabase/server.ts          request-scoped cookie server client
lib/supabase/proxy.ts           token refresh/cookie propagation helper
lib/auth/errors.ts              typed Unauthenticated/Forbidden errors
lib/auth/session.ts             requireAuthClaims(), optionalAuthClaims()
lib/auth/player.ts              requirePlayer(), getOrProvisionPlayer()
lib/auth/responses.ts           consistent API error mapping
proxy.ts                        Next.js 16 proxy and matcher
app/(auth)/login/page.tsx       sign-in/sign-up screen
app/(auth)/forgot-password/page.tsx
app/(auth)/reset-password/page.tsx
app/auth/confirm/route.ts       email confirmation/PKCE exchange
app/auth/signout/route.ts       POST-only logout
```

All files that read cookies or secrets are marked `server-only` where applicable.

### 7.2 Required server APIs

```ts
type AuthClaims = {
  authUserId: string;
  email?: string;
};

async function requireAuthClaims(): Promise<AuthClaims>;
async function optionalAuthClaims(): Promise<AuthClaims | null>;
async function requirePlayer(): Promise<Player>;
async function getOrProvisionPlayer(authUserId: string): Promise<Player>;
```

`requireAuthClaims()`:

- creates the request-scoped Supabase server client;
- calls `auth.getClaims()`;
- validates the `sub` claim as a UUID;
- rejects absent, invalid, or expired claims with `UnauthenticatedError`;
- never returns access or refresh tokens to application code.

`requirePlayer()` calls `requireAuthClaims()` and resolves/provisions the unique player. Route handlers call it once and pass `player.id` into services.

### 7.3 Proxy behavior

Next.js 16 uses `proxy.ts`, not a new `middleware.ts`.

The proxy:

- runs Supabase token refresh using `getClaims()` and copies refreshed cookies to both request and response;
- redirects unauthenticated page requests to `/login?next=<relative path>`;
- redirects authenticated visits to `/login`, `/forgot-password`, or the signup state back to `/`;
- does not perform Prisma queries or player provisioning;
- does not redirect `/api/*`; APIs return JSON `401` from their handlers;
- excludes static assets, image optimization, favicon, robots, and other immutable public files;
- allows `/login`, `/forgot-password`, `/reset-password`, `/auth/confirm`, and `/auth/signout` as appropriate.

Validate `next` as a same-origin relative path beginning with `/` and reject `//`, schemes, and encoded external URLs to prevent open redirects.

### 7.4 Cookie and request protections

Use the cookie behavior supplied by the official Supabase SSR client and verify production cookies are `Secure`, `HttpOnly` where supported by the flow, and explicitly `SameSite=Lax` or stricter. Production is HTTPS-only.

All state-changing application endpoints remain non-GET. In addition to SameSite cookies, reject cross-origin mutation requests by validating `Origin` against the configured canonical app origin. Auth callback redirects are the narrow documented exception. Do not enable wildcard CORS.

Set security headers at the application/platform layer: HSTS, `X-Content-Type-Options: nosniff`, a restrictive `Referrer-Policy`, frame protection through CSP `frame-ancestors`, and a CSP compatible with Next.js and required game assets. Roll CSP out in report-only mode first because the game loads fonts and 3D assets.

---

## 8. Route authorization policy

### 8.1 Default policy

Launch is account-gated. Every page and every `/api/*` route is private unless explicitly listed as public below.

Public routes:

- `/login`
- `/forgot-password`
- `/reset-password`
- `/auth/confirm`
- static assets and framework assets
- a future minimal `/api/health` that exposes no database contents or secrets

`/auth/signout` requires a valid same-origin POST. There is no unauthenticated game-data API.

### 8.2 Existing Route Handler conversion

Replace every call to `getOrCreatePlayer()` with `requirePlayer()`.

Handlers already passing `player.id` into services retain that shape. Service functions remain responsible for ownership checks, transaction rules, and domain errors.

The following handlers require specific remediation:

| Route or group | Required behavior |
|---|---|
| `GET /api/chickens/[id]` | Require player and query with `{ id, playerId }`; return `404` for foreign or absent rooster. |
| `GET /api/chickens/[id]/pedigree` | Private at launch. Require ownership of the root rooster. Ancestors/descendants returned by the tree may span historical owners later, but launch data remains private and DTO-limited. |
| `GET /api/marketplace` | Require player. Move restocking out of GET into seed/deployment/admin work; GET must be read-only. |
| `POST /api/spar/[sessionId]/step` | Require player and bind each in-memory spar session to `ownerPlayerId`; foreign/absent sessions return `404`. Prefer migration to canonical durable combat after launch. |
| `POST /api/dev/facilities` | Keep the production hard-disable and also require an authenticated allowlisted developer in non-production, or remove the route from launch builds. Never authorize merely from `NODE_ENV`. |
| `POST /api/dev/pve` | Same policy as all development mutation routes. |
| archived combat step/start routes | Keep `410` without touching game data. They may remain unauthenticated to preserve deterministic retirement behavior, but must disclose no account data. Removing them is preferable. |
| canonical combat session routes | Require player on create, read, begin, sync, command, and awakening; resolve through `ownerPlayerId` for every operation. |
| tournament/PvE fight step routes | Archived `410` routes stay inert; active start and settlement paths require player and owner-bound session/context IDs. |
| live matchup/bet/resolve | Require player. All match lookup/update predicates include `playerId`; settlement stays transactional and idempotent. |
| breed, egg, chicken lifecycle, training, clinic, facilities, tournament | Require player and retain service-level ownership checks. |
| `GET /api/player` and ranch hub | Return only the current player's DTO; never the Supabase token, auth metadata, or another player's identifiers. |

### 8.3 Query shape

Prefer owner-scoped queries:

```ts
const chicken = await prisma.chicken.findFirst({
  where: { id: chickenId, playerId: player.id },
});

if (!chicken) throw new NotFoundError("CHICKEN_NOT_FOUND");
```

For updates, use owner-scoped `updateMany` plus a count check, or lock and verify ownership inside the same transaction before changing currency, inventory, health, session state, or fight state. A pre-transaction ownership check followed by an unscoped mutation is insufficient for high-value operations.

### 8.4 DTO policy

Do not return raw Prisma models by default. Add DTOs for player and rooster responses that omit:

- `authUserId`;
- internal ownership IDs unless the client requires them;
- private combat seeds/checkpoints;
- idempotency and settlement keys;
- provider/session metadata.

---

## 9. Auth user experience

Auth screens must follow the game's cinematic visual system rather than a generic SaaS card. They should use the existing warm-black environment, smoked glass, brass/gold accents, and display typography while keeping the form readable and keyboard accessible.

### 9.1 Login/signup screen

One `/login` screen supports two explicit modes:

- Sign in: email, password, submit, forgot-password link.
- Create account: email, password, password confirmation, terms/privacy acknowledgement, submit.

Requirements:

- neutral error copy for invalid credentials and password-reset requests;
- visible loading state and duplicate-submit protection;
- password rules shown before submission and enforced server/provider-side;
- no indication whether a reset email address exists;
- confirmation-pending state with resend action and cooldown;
- preserve only a validated relative `next` route;
- accessible labels, error association, focus management, and live status messages;
- auth forms usable without the authenticated `TopBar`.

### 9.2 Confirmation and recovery

`/auth/confirm` exchanges the provider token/code, then redirects to the validated destination. Failure renders a recoverable state with a new-link action.

Password reset emails redirect to `/reset-password`. After a successful reset, refresh/rotate the session using provider-supported behavior and redirect to `/`.

### 9.3 Authenticated shell

- replace the mock name/avatar in `TopBar` with the current player's display data, retaining gameplay-level placeholders only where no system exists;
- add a settings/account menu with sign out;
- sign out through a POST action/route, clear auth state, reset `playerStore`, and redirect to `/login`;
- on `401` from background client fetches, clear stale player state and navigate to `/login` without an infinite retry loop.

---

## 10. Supabase production configuration

Required environment variables:

```text
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
NEXT_PUBLIC_APP_URL=https://<canonical-production-host>
DATABASE_URL=<pooled-runtime-connection>
DIRECT_URL=<direct-migration-connection>
```

Rules:

- use the publishable key in browser/server SSR clients;
- do not add a Supabase secret key unless a concrete server-only admin feature requires it;
- use `DIRECT_URL` for Prisma migrations and `DATABASE_URL` for pooled runtime traffic;
- configure exact production and preview redirect allowlists in Supabase Auth;
- set the Supabase Site URL to the canonical production HTTPS origin;
- require email confirmation in production;
- configure a real SMTP provider, branded templates, SPF, DKIM, and DMARC; do not launch on best-effort development email delivery;
- enable Supabase Auth rate limits and CAPTCHA on signup/sign-in/reset if public signup is open;
- set separate Supabase projects or at minimum separate databases/auth tenants for local, preview, and production;
- rotate the currently exposed local database password before launch;
- run secret scanning against Git history and deployment logs even though `.env` is currently ignored.

Game tables are accessed only by the trusted Next.js/Prisma backend at launch. Do not expose them through browser Supabase queries. If the Supabase Data API remains enabled, revoke `anon`/`authenticated` table privileges or enable deny-by-default RLS on all game tables. RLS is defense in depth, not a replacement for Prisma ownership predicates.

---

## 11. Abuse controls

The baseline spec explicitly calls out new-account farming, bots, multi-account abuse, and starter-chicken marketplace flooding.

P0 controls:

- confirmed email required before provisioning;
- CAPTCHA and provider rate limits on account creation and recovery;
- starter grant recorded transactionally and issued once;
- starter chickens marked non-tradable until the existing game design defines an earned unlock;
- server-side idempotency for provisioning and high-value settlement;
- no client-selected credits, assets, rewards, ownership, fight results, or tournament results;
- structured security events for repeated cross-owner lookups and mutation conflicts, without logging tokens or passwords.

These controls reduce casual abuse but do not prove one-human-one-account. Stronger device/risk scoring is a separate system and should be added only from observed abuse data.

---

## 12. Errors and observability

API envelope:

```json
{
  "error": {
    "code": "UNAUTHENTICATED",
    "message": "Sign in to continue.",
    "requestId": "..."
  }
}
```

Required stable codes:

- `UNAUTHENTICATED` — `401`;
- `FORBIDDEN` — `403`;
- existing resource-specific not-found codes — `404`;
- `ACCOUNT_PROVISIONING_FAILED` — `503`, safe retry;
- `AUTH_PROVIDER_UNAVAILABLE` — `503`, safe retry;
- `INVALID_AUTH_REDIRECT` — `400`.

Log structured events for login callback failure, logout failure, provisioning create/race/failure, authorization denial, and provider outage. Include request ID, internal player ID when known, route, status, and a hashed or otherwise non-PII auth subject correlation value. Never log passwords, codes, cookies, JWTs, refresh tokens, full email addresses, `DATABASE_URL`, or Supabase secret keys.

Metrics/alerts:

- auth callback and login failure rate;
- `401`/`403` rate by route;
- player provisioning failures and latency;
- unique-constraint races during provisioning;
- cross-owner denial events;
- Supabase Auth latency/error rate;
- unexpected creation of multiple Players for one auth subject (must remain zero).

---

## 13. Test plan

### 13.1 Unit tests

- valid claims resolve the correct `Player`;
- missing, malformed, and expired claims return `UNAUTHENTICATED`;
- `getSession()` is not used by authorization modules;
- concurrent provisioning returns one `Player` and one starter grant;
- open-redirect variants are rejected;
- auth error mapping never leaks provider internals;
- DTOs omit `authUserId`, tokens, combat seeds, and settlement keys.

### 13.2 Route integration tests

Create two Supabase-auth-subject fixtures, Player A and Player B, each with distinct roosters and resources. For every API route:

1. no cookie/token produces `401` unless the route is explicitly public/inert;
2. Player A can access Player A's valid resource;
3. Player A receives `404` for Player B's resource ID;
4. Player B's database row is unchanged after Player A's attempt;
5. request-body `playerId`/`ownerPlayerId` spoofing has no effect;
6. wrong-origin mutations are rejected;
7. expired session behavior is deterministic.

High-risk mandatory cases:

- buy/sell and all credit/token changes;
- breed/hatch/retire/age-up;
- clinic and facility upgrades;
- training start/cancel/redistribution;
- live bet/resolve;
- tournament start/advance/settlement;
- PvE start/step/settlement;
- canonical combat create/read/begin/sync/command/awakening;
- chicken detail and pedigree reads;
- spar session hijack attempt.

### 13.3 Browser tests

- signup → confirmation → first player provisioning → resumable onboarding → ranch;
- sign in, refresh, token refresh, and sign out;
- forgot/reset password;
- protected deep-link round trip through `next`;
- malicious external `next` cannot redirect off-site;
- two isolated browser contexts never see each other's roster/currency;
- session expiry during a mutation returns to login without duplicate mutation;
- auth pages pass keyboard and basic accessibility checks.

### 13.4 Migration tests

- Migration A applies to a database containing the current singleton player and game data;
- explicit claim script links only the requested auth user and player;
- first unrelated signup creates a new blank/starter player rather than claiming legacy data;
- Migration B refuses to apply with unlinked Players;
- rollback of application code remains possible while Migration A is deployed;
- schema validates and all existing tests/build pass after removing the duplicate `MarketListing` model.

---

## 14. Implementation sequence

### Phase 0 — stop-ship hygiene

1. Rotate the database credential found in the local environment.
2. Scan Git history and deployment logs for secrets.
3. remove the duplicate `MarketListing` schema declaration and make `yarn prisma validate` pass;
4. create separate production Supabase Auth configuration and SMTP;
5. decide explicitly whether existing production-like game data is deleted or linked to a named auth user.

### Phase 1 — identity foundation

1. Add Supabase dependencies and environment validation.
2. Add Migration A and the explicit legacy-link script.
3. Add browser/server/proxy Supabase clients.
4. Implement claims verification, player provisioning, auth errors, and DTOs.
5. Add focused unit and migration tests.

### Phase 2 — auth UX and shell

1. Build login/signup, confirmation, forgot/reset, and signout flows.
2. Add `proxy.ts` refresh and protected-page redirects.
3. Exclude authenticated shell components from auth pages.
4. Replace mock player identity in `TopBar` and handle client `401` cleanly.

### Phase 3 — route conversion and isolation

1. Replace `getOrCreatePlayer()` with `requirePlayer()` in all active handlers.
2. Repair chicken detail, pedigree, spar ownership, and dev-route policies.
3. Make marketplace GET read-only.
4. Owner-scope high-value database predicates and verify transaction boundaries.
5. Add the two-player route integration matrix.
6. Delete `getOrCreatePlayer()` and singleton assumptions from tests/seeds.

### Phase 4 — production hardening

1. Add origin checks, security headers, auth rate-limit/CAPTCHA configuration, and redacted observability.
2. Verify Data API/RLS/privilege posture.
3. Run Migration B after the unlinked-player preflight reaches zero.
4. Run full tests, Prisma validation, migration deploy rehearsal, production build, and browser smoke tests.
5. Deploy behind a maintenance window or launch flag; monitor auth and authorization metrics.

---

## 15. Deployment and rollback

Use expand/migrate/contract deployment. Do not combine nullable-column creation, data linking, and non-null enforcement in one irreversible production step.

Pre-deploy checks:

```text
yarn prisma validate
yarn test
yarn next build
yarn prisma migrate status
unlinked Player count == expected value for current phase
Supabase Site URL and redirect allowlist verified
SMTP delivery, confirmation, and reset tested on production-like host
production secrets present; preview secrets isolated
```

Rollout:

1. database backup and restore point;
2. Migration A;
3. auth-capable application with account gate disabled for operators only;
4. explicit legacy-data action;
5. enable account gate;
6. smoke test two real accounts and cross-account denial;
7. Migration B after validation;
8. monitor for at least one full access-token refresh cycle.

Rollback before Migration B: disable the account gate and roll back application code while leaving additive nullable columns in place. Do not restore the production singleton behavior for public traffic. If auth is unavailable, place the game in read-only maintenance mode instead of mapping everyone to one player.

After Migration B, rollback means deploying a forward fix or restoring the database/application pair from the coordinated restore point.

---

## 16. Acceptance criteria

Auth is launch-ready only when all are true:

- [ ] `yarn prisma validate`, the complete test suite, and the production build pass.
- [ ] Every active game-data API returns `401` without a verified session.
- [ ] Two real accounts receive distinct `Player` rows, starter grants, rosters, facilities, currencies, progress, tournaments, live matches, and combat sessions.
- [ ] A newly confirmed account receives exactly one onboarding progress row and follows the companion spec's isolated, resumable first-dynasty flow before the ranch becomes its default destination.
- [ ] The two-player integration matrix proves no cross-account read or mutation across every route group.
- [ ] No runtime production path calls `Player.findFirst()` to determine identity.
- [ ] No handler accepts caller ownership from request data.
- [ ] Chicken detail, pedigree, spar step, and all combat session operations are owner-bound.
- [ ] Marketplace GET is read-only and dev mutation routes are inaccessible in production.
- [ ] Signup, email confirmation, sign-in, refresh, password reset, deep-link return, and signout work on the production domain.
- [ ] Legacy data was explicitly deleted or linked; no first-user implicit claim is possible.
- [ ] All Players have a unique, non-null `authUserId` after Migration B.
- [ ] Production SMTP, exact redirect URLs, CAPTCHA/rate limits, HTTPS, cookie flags, and security headers are verified.
- [ ] The exposed database credential was rotated and secret scanning is clean.
- [ ] Logs and monitoring contain no credentials, cookies, tokens, or raw sensitive auth payloads.
- [ ] An Auth/provider outage fails closed into a retryable maintenance/error state, never a shared or anonymous player.

---

## 17. Reference guidance

- [Supabase SSR client setup for Next.js](https://supabase.com/docs/guides/auth/server-side/creating-a-client?framework=nextjs&package-manager=npm&queryGroups=framework&queryGroups=package-manager) — use cookie-based browser/server clients, refresh in Proxy, and verify identity with `getClaims()` rather than trusting `getSession()`.
- [Supabase user-data guidance](https://supabase.com/docs/guides/auth/managing-user-data) — link application data to the stable `auth.users` primary key and protect public-schema data.
- [Next.js authentication guide](https://nextjs.org/docs/app/guides/authentication) — centralize secure authorization in a data-access layer and treat Proxy checks as optimistic only.
- [Next.js 16 Proxy convention](https://nextjs.org/docs/app/getting-started/proxy) — use `proxy.ts`; do not perform slow database authorization there.
- [OWASP Session Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html) — HTTPS, Secure/HttpOnly/SameSite cookie controls, rotation, and session handling.
