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

## Scheduling uses the dedicated endpoint, not the status PUT {#schedule-endpoint}

**Decision.** The `ready_for_publish → scheduled` edge calls
`POST /api/posts/:id/schedule` (a `schedule` mechanism), not a `PUT` that flips
the status. The server validates `scheduled_at` there (required, in the
future) and routes auto- vs manual-publish through the workspace allowlist;
the response carries the routed status, which the UI adopts as-is.

**Why.** The PUT path also accepts this edge, but its server side
(`schedule.Service.RouteAndPersist`) deliberately skips the date validation —
"the PUT path keeps its historical, narrower behaviour". A dateless or past
`scheduled_at` through PUT enqueues a Zernio submit that publishes almost
immediately (the submit job falls back to `now + 1min` when the date is nil).
The dedicated endpoint rejects both with a 400. The FE additionally blocks
the action client-side (`getTransitionBlockers` requires a future date on
both schedule edges).

Two deliberate asymmetries:

- **"Schedule for manual publish" stays a plain PUT.** The schedule endpoint
  always routes by the allowlist, so it would send an allowlisted platform to
  auto-publish against the user's explicit manual choice. The PUT edge is
  respected by the server (no routing, no Zernio job); its date is a reminder,
  validated client-side only.
- **`scheduled_at` is locked while `scheduled` and once `published`**
  (`canEditScheduledAt`). The Zernio submission is handed the publish time
  right after scheduling, so a later PUT would change the displayed date
  without moving the actual publish — the calendar drag and the settings-form
  date picker both refuse. Unschedule (cancel), then re-schedule.

**Where.** `services/api/posts.ts` (`schedulePost`), `hooks/usePost.ts`
(`schedule`), `lib/postStatusMachine.ts` (`mechanism: 'schedule'`,
`getTransitionBlockers`, `canEditScheduledAt`),
`components/campaigns/calendar/PostCard.tsx` / `WeeklyCalendar.tsx`,
`components/forms/postSettingsForm/PostSettingsForm.tsx`. Server:
`src/handlers/posts.go` (`Schedule`), `src/post_actions/schedule/schedule.go`.

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

## The calendar card reads the post row and nothing else {#calendar-card-media}

**Decision.** `PostCard` draws its leading image from `post.media_urls[0]` and
its problem flag from `hasVisibleProblem(post)` — status, platform, post type.
Neither fetches anything.

**Why.** A week view renders a card per post from the list payload. Anything
needing a per-post request (`GET /api/posts/:id/attachments`, the server's
post-type rules) would cost one round-trip per card, so the card shows the
subset of `evaluatePost` that the list already answers. Everything it flags is
also a `fail` in the full check set; the reverse does not hold, so a clean card
is not a promise the post will publish — it understates rather than cries wolf.

**Known gap.** The editor's uploads go to the `post_attachments` table, whose
presigned/thumbnail URLs are hydrated per post at response time. Nothing writes
`media_urls`, so **the leading image never renders in practice today.** The
card is built and correct; lighting it up needs the backend to put a thumbnail
URL on the post list payload. Backend ticket, not a front-end change.

**Where.** `components/campaigns/calendar/PostCard.tsx`,
`lib/postValidation.ts` (`hasVisibleProblem`).

## Personal preferences namespace themselves into the tenant settings table {#user-scoped-settings}

**Decision.** Calendar preferences (first day of week, hidden days) are stored
per user *and* per campaign, under the key
`calendar.<userId>.<campaignId>` in the backend's `/api/settings` key/value
store. They used to be a `persist`ed Zustand store; they are server state now,
so they live in the Query cache like everything else fetched.

**Why.** The API has no user-scoped store — `settings` is **tenant-scoped**
(`tenant_id` + `key` as the primary key) and `users` has no preferences
column — so the only identity available is the one we put in the key. This
buys preferences that follow the user to another browser without a backend
change. The cost is real and bounded: `GET /api/settings` lists every key in
the tenant, so anything written this way is readable by every teammate. **Do
not** store anything sensitive behind `userScopedKey`. A proper
`user_settings` table is the eventual fix.

**Where.** `services/api/settings.ts` (`userScopedKey`, `getSetting`,
`putSetting`), `hooks/useCalendarSettings.ts`. Writes paint from the cache
first and the PUT is debounced 500ms behind them — flipping six day switches
costs one request — with a flush on unmount, the same shape as the post
editor's autosave.

## Explanatory copy is dismissible, and dismissal is permanent {#explainers}

**Decision.** Copy that teaches how a screen works goes in an `<Explainer>`,
not in a bare `<p>`. It carries a close button; closing it is remembered and
the note never comes back. Dismissals are a `dismissedNotes: string[]` field on
the persisted `settingsStore` — device-local, in `localStorage`.

**Why.** Text that is exactly right on a user's first visit is furniture by
their tenth, and no single wording is both. Rather than pick one and lose the
other, the copy is written for the first read and the user is given the way to
end it.

**Why local rather than `userScopedKey`.** The first version put dismissals in
`/api/settings`, so a closed note stayed closed on the user's other machine.
That is the wrong trade for this: the table is
[tenant-scoped](#user-scoped-settings), so every teammate would read a row
recording which tips you closed, and the note could not render until a request
resolved — a fetch, a loading gate, and a rollback path, all to remember that
someone clicked an ✕. Seeing a tip once more on a new laptop is a smaller cost
than any of that. Preferences that carry real content (calendar layout) still
belong in `userScopedKey`; display noise does not.

**Consequence — the constraint to hold.** An Explainer may only ever contain
*teaching*. Anything a user needs while working — a count, a warning, a
validation message, a link they'd look for twice — must live outside it, or it
vanishes for everyone who closed the note. When adding one, check the screen
still reads correctly with it deleted.

**Where.** `components/page-primitives/Explainer.tsx`,
`stores/settingsStore.ts` (`dismissedNotes`, `dismissNote`). First use is the
campaign Assets page (`campaign-content-sources`). Ids are stable identifiers —
renaming one un-dismisses it for everyone who already closed it. There is no
"show help again" control; `resetAllSettings()` clears the set, and for
testing, `localStorage.removeItem('settings-store')` does it from the console.

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

- This client has **no key-management surface**: the former Instance Settings
  → API Keys UI (`ApiKeysSection` + `useSecrets` + `services/api/secrets`) was
  **removed** (2026-07) once keys became platform-managed. Don't reintroduce
  per-tenant key config.
- **Account connection stays** and is **per-tenant**: each tenant has its own
  Zernio profile (`Ogen #{tenant_id}`) over the shared key (CON-102, CON-100).
  `ConnectPlatformsSection` runs the in-app connect flow (connect link → new
  tab → poll until the sync mirrors the account); `PlatformsSection` shows
  connected platforms with status. Both sit on `useZernio`.
- **Tenant isolation is server-enforced**, not a front-end concern: the API scopes
  every read/write, job, and SSE stream by the session's tenant. The UI never
  sends `tenant_id`; the tenant object it holds (from `GET /api/current_user`,
  shown in the sidebar and Workspace Settings) is display data only.

**Where.** `src/components/workspace-settings/{WorkspaceSection,PlatformsSection,ConnectPlatformsSection}.tsx`,
`hooks/{useTenant,useZernio}.ts`, `services/api/{tenants,zernio}.ts`. See
[`product.md`](./product.md#direction--current-priorities) and
[`onboarding.md`](./onboarding.md).

## Known gaps (intentional to flag, not yet resolved)

- **No invite-teammate UI** — `users.register()` (`POST /api/users`) is the
  ready building block; real invitations (email loop) await backend support
  (CON-26).
- **No account disconnect** — the API has no disconnect endpoint and tenants
  can't reach the platform-owned Zernio dashboard, so the Disconnect button
  in Platform Settings renders disabled until the backend grows one.
- **Dark mode** is scaffolded (`.dark` block) but effectively empty.
- The **Imagery** Content-Bank tab renders nothing yet (`assetCategory.ts`); AI
  image generation + storage there is planned but **secondary** (CON-105/88/83).
- **Lint/format configs** (eslint/prettier/stylelint) are installed but not
  committed to this repo.
