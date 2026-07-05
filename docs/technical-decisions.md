# Technical Decisions

The choices in this codebase that are non-obvious or easy to undo incorrectly,
with the rationale. Read this before "simplifying" any of them — most encode a
constraint that isn't visible at the call site. Each entry cites where the
decision lives.

## Decoupled SPA + same-origin `/api` proxy _(CON-98)_

**Decision.** The UI is its own repo and deploys independently; the Go API no
longer embeds it. All requests use app-relative `/api/...` paths, proxied
same-origin (Vite dev server locally, Caddy in the container).

**Why.** Independent build/deploy cadence for front-end and back-end. Keeping
requests same-origin means **no CORS** and the `HTTPOnly` session cookie flows
normally. A direct cross-origin wiring is still supported by setting
`VITE_API_URL` at build time, but then the API must allow the origin via CORS
with credentials and share the registrable domain for the `SameSite=Lax` cookie.

**Where.** `README.md`, `services/api/base.ts`, `vite.config.ts` proxy,
`Caddyfile`.

## Server-down vs. not-authenticated are distinguished

**Decision.** A rejected `fetch` (network/DNS/refused, or HTTP ≥ 500 on the
session probe) throws a dedicated `ServerUnavailableError`; an HTTP 401 does not.
The root guard routes the former to `/server-unavailable` and the latter to
`/auth/login`.

**Why.** "The backend is down" and "you're logged out" are different states with
different UX. Collapsing them would bounce users to the login screen during an
outage. The session probe is also memoized and **never caches a failure**, so a
transient blip doesn't stick.

**Where.** `services/api/errors.ts`, `services/api/sessions.ts`,
`routes/__root.tsx` `beforeLoad`.

## Post status machine mirrors the server {#status-machine}

**Decision.** `lib/postStatusMachine.ts` re-implements the server's
`ValidPostTransitions` and per-edge action metadata on the client.

**Why.** The UI must gate buttons, labels, and blockers without a round-trip.
The server stays the source of truth and rejects any unlisted edge with a 400,
so the client copy is an optimization, not the authority.

**Contract.** When `models/post.go` changes its transitions or the
platform-required rule, update this file to match. The same "mirrors a Go file"
contract applies to `lib/assetStatus.ts` (upload limits + error strings) and
`buildPlatformViews` gating.

## Cancel is not a status transition {#cancel-vs-transition}

**Decision.** Unscheduling a `scheduled` post calls
`POST /api/posts/:id/cancel` (a `cancel` mechanism), **not** a `PUT` that flips
the status. The post stays `scheduled` until the Zernio cancel job confirms;
the UI learns the new status by polling.

**Why.** A plain status `PUT` would flip the local status while the auto-publish
job keeps running — the publisher would then publish a post the user believed
was unscheduled. The `mechanism: 'cancel'` vs `'transition'` split in
`ACTION_META` encodes exactly this, and `usePost`/`usePostStatusActions` route
by it.

**Where.** `lib/postStatusMachine.ts`, `hooks/usePost.ts` (`cancelScheduled`),
`services/api/posts.ts`.

## The Query cache doubles as the post editor's document store

**Decision.** `usePost.changeDoc()` mutates the cached post in place
(`structuredClone` → mutate → `setQueryData`) and debounces the PUT (600ms),
rather than holding editor state in a separate store.

**Why.** One source of truth for the open post, instant local echo, and free
reuse of Query's caching/polling. A **generation counter** prevents a slow,
in-flight save from clobbering a newer edit, and pending saves **flush on
unmount** so navigation never drops an edit.

**Where.** `hooks/usePost.ts`. Campaign forms use the analogous autosave in
`components/forms/campaignBriefForm/shared.ts` (500ms, version-tracked).

## Poll narrowly, only while a backend job is in flight

**Decision.** Polling is enabled conditionally, not globally: post refetch runs
only while `scheduled` (5s), asset rows poll only while `processing` (2s), and
Zernio health polls only while `degraded` (60s).

**Why.** These are the only windows where a status changes without user action
(publisher worker, PDF/embedding pipeline, integration recovery). Polling
outside them would waste requests. Global `refetchOnWindowFocus` is off for the
same reason.

**Where.** `hooks/usePost.ts`, `components/uploads/UploadRow.tsx`,
`hooks/useZernio.ts`.

## Platform display metadata lives on the client

**Decision.** The API supplies platform **IDs, publishers, cadence, and
constraints**; the user-facing **names, icons, brand colors, and post-type
labels** are hardcoded in `lib/platformDictionary.ts`. Platforms not in the
dictionary are dropped from the UI.

**Why.** Full control over wording and branding without a backend round-trip or
deploy, and a stable icon/color mapping. The trade-off: adding a platform
requires a UI change, not just a backend one.

## Two form systems, on purpose

**Decision.** Auth forms use the minimal `useFormValidation` hook + plain
inputs; feature forms use full react-hook-form + the `ui/form.tsx` shadcn
abstraction with autosave.

**Why.** Auth forms are simple, submit-once, and need live password-rule
feedback — the heavyweight abstraction buys nothing there. Feature forms need
accessibility wiring (`aria-describedby`/`aria-invalid`), field-level control,
and autosave. Pick per the form's needs; don't unify them reflexively.

**Where.** `hooks/useFormValidation.ts` + `lib/auth-validation.ts` vs
`components/ui/form.tsx` + the `components/forms/*` feature forms.

## Routing conventions that look like accidents but aren't

- **`page.tsx` is ignored by the router** (`routeFileIgnorePattern`). The
  `index.tsx` (routing) / `page.tsx` (presentation) split is intentional — don't
  put `createFileRoute` in a `page.tsx`.
- **Trailing-underscore segments** (`$campaignId_`, `content-bank_`) escape the
  parent layout so a child can render fullscreen. Removing the underscore
  re-nests it under the tab bar.
- **Auth is guarded only at the root**, not on `_authenticated`. Adding a
  per-layout guard would duplicate (and could diverge from) the root logic.

**Where.** `vite.config.ts` router plugin, `routes/__root.tsx`,
`routes/_authenticated.tsx`.

## Styling is CSS-first (Tailwind v4)

**Decision.** No `tailwind.config.js`; the theme, palette, and semantic tokens
live entirely in `src/index.css` via `@theme inline`. Z-index is centralized in
`config/zIndex.ts` and applied through inline `style`, not `z-[…]` classes.

**Why.** Tailwind v4's CSS-first model; a single styling source of truth. The
inline-`zIndex` rule exists because Tailwind's JIT can't compile a templated
`z-${…}` class.

## Centralized credentials & the SaaS multi-tenancy transition

**Decision.** Ogen is moving to multi-tenant SaaS with **naive pooled
multi-tenancy** (CON-97): a shared DB, `tenant_id` on every tenant-owned row, and
central fail-closed scoping on the API. Third-party credentials — **Claude,
Zernio, and object storage** — are the deliberate exception: **one Ogen-wide,
KEK-encrypted set, encapsulated in the API and shared by all tenants** (CON-97
§10.3, CON-99). Tenants never see or configure them.

**Front-end consequences.**

- The **Instance Settings → API Keys** UI (`ApiKeysSection` + `useSecrets`) is
  **legacy** — it configures per-instance Anthropic/Zernio keys that are now
  platform-managed. It is slated for removal as the migration completes; don't
  build new features on it.
- **Account connection stays** and is **per-tenant**: each tenant has its own
  Zernio profile (`Ogen #{tenant_id}`) over the shared key (CON-102, CON-100).
  `PlatformsSection` / `useZernio` remain the surface for it.
- **Tenant isolation is server-enforced**, not a front-end concern: the API scopes
  every read/write, job, and SSE stream by the session's tenant. The UI neither
  passes nor reasons about `tenant_id`; it simply receives tenant-scoped data.

**Where.** `src/components/instance-settings/{ApiKeysSection,PlatformsSection}.tsx`,
`hooks/{useSecrets,useZernio}.ts`, `services/api/{secrets,zernio}.ts`. See
[`product.md`](./product.md#direction--current-priorities).

## Known gaps (intentional to flag, not yet resolved)

- The **Instance Settings API-key config** (Anthropic/Zernio) is **legacy** under
  the SaaS model — keys are centralized; that surface is slated for removal
  (account connection stays). See the SaaS-transition section above.
- `users.getMe()` is a **hardcoded placeholder** pending a real `GET /api/me`.
- **Dark mode** is scaffolded (`.dark` block) but effectively empty.
- The **Imagery** Content-Bank tab renders nothing yet (`assetCategory.ts`); AI
  image generation + storage there is planned but **secondary** (CON-105/88/83).
- **Lint/format configs** (eslint/prettier/stylelint) are installed but not
  committed to this repo.
