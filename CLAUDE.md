# CLAUDE.md

Guidance for working in this repository. Keep it accurate — update it when the
conventions below change.

## What this is

The React + Vite single-page app for **Ogen**, a multi-tenant, AI-assisted
platform for planning, generating, and publishing social-media content. This
repo is **front-end only**; it talks to the Go API (`ogen-app/ogen`) over
app-relative `/api` requests. Split out of the `ogen` monorepo (CON-98).

**Direction:** Ogen is transitioning to a multi-tenant SaaS where **Claude and
Zernio run centrally "under the hood"** — their keys are platform-managed, not
tenant-configured (CON-97 §10.3, CON-99); tenants still connect their own social
accounts. The front-end multi-tenancy cutover landed 2026-07 (real
`current_user` identity, workspace settings, per-instance API-key config
removed — see [`docs/onboarding.md`](./docs/onboarding.md)). **Current
front-end priority:** the **Post Assistant + post-editing UIs** (CON-42/61).
Content-Bank AI images are secondary. See
[`docs/product.md`](./docs/product.md#direction--current-priorities).

- **Product & domain:** [`docs/product.md`](./docs/product.md)
- **Front-end architecture:** [`docs/architecture.md`](./docs/architecture.md)
- **Technical decisions & rationale:** [`docs/technical-decisions.md`](./docs/technical-decisions.md)
- **Onboarding, auth & tenancy flow:** [`docs/onboarding.md`](./docs/onboarding.md)
- **Campaign "needs attention" rule set:** [`docs/attention-rules.md`](./docs/attention-rules.md)
- **Campaign stages — how they work & proposal:** [`docs/campaign-stages.md`](./docs/campaign-stages.md)
- **Activity feed & daily report — proposal:** [`docs/activity.md`](./docs/activity.md)
- **Tasks — proposal:** [`docs/tasks.md`](./docs/tasks.md)
- **Run & deploy:** [`README.md`](./README.md)

Requirements live in Linear under the **`CON-`** project (the app's internal
name is "Content Control Center"). There is no PRD checked into this repo.

## Commands

```bash
pnpm install
pnpm dev           # Vite dev server on http://localhost:9002, proxies /api → :9001
pnpm build         # tsc (type-check) && vite build → dist/
pnpm preview       # serve the production build

pnpm typecheck     # tsc --noEmit
pnpm lint          # eslint .            (--fix to repair what is mechanical)
pnpm format        # prettier --write .  (format:check to only report)
pnpm test          # vitest run
pnpm knip          # unused files, exports and dependencies — a report, not a gate
```

CI runs every one of those except `knip` on each PR into `develop`
(`.github/workflows/ci.yml`). What each tool is for, and why some rules are
warnings rather than errors:
[`docs/quality-tooling.md`](./docs/quality-tooling.md).

Run the API separately from the `ogen` repo (`make run`) or via
`docker compose up`. See [`docs/architecture.md`](./docs/architecture.md#build--tooling).

## Conventions & gotchas

Most of these are load-bearing — see `docs/technical-decisions.md` for the why.

- **`src/routeTree.gen.ts` is generated.** Never edit it. It regenerates from
  `src/routes/` via the Vite router plugin.
- **Route file split:** `index.tsx` owns routing (`createFileRoute`,
  `beforeLoad`, `validateSearch`); the co-located **`page.tsx` is
  intentionally invisible to the router** and holds the presentational
  component.
- **Trailing-underscore route segments** (`$campaignId_`, `content-bank_`)
  deliberately escape the parent layout to render fullscreen.
- **Auth is guarded once, in `routes/__root.tsx`** `beforeLoad` — not on
  `_authenticated`. Distinguish `ServerUnavailableError` (→ `/server-unavailable`)
  from a 401 (→ `/auth/login`).
- **Server state → TanStack Query; UI/session state → Zustand.** Don't hold
  fetched data in a store. Query keys are co-located per hook and exported when
  another hook must invalidate them. Note the post editor (`["post", id]`) and
  post list (`["campaigns", id, "posts"]`) are separate namespaces.
- **The Campaigns list reads one batched query, never one per card.**
  `useCampaignSummaries` (`["campaigns","summaries"]`) returns a slim
  `PostSummary` per post for the whole workspace; `CampaignCard` runs the same
  `lib/campaignReadiness` rules over it. Never reintroduce a per-card fetch —
  that was the N+1 CON-152 removed. See
  `docs/technical-decisions.md#batched-summaries`.
- **The post editor autosaves through the Query cache** (`usePost.changeDoc`,
  600ms debounce, generation-counter guarded, flush-on-unmount). Campaign forms
  autosave similarly. Prefer these patterns over new local edit stores.
- **Unscheduling a post is a `cancel`, not a status `PUT`** — see
  `lib/postStatusMachine.ts` and `docs/technical-decisions.md#cancel-vs-transition`.
  Getting this wrong can publish a post the user thought was cancelled.
- **Scheduling a post is a `schedule`, not a status `PUT`** — it goes through
  `POST /api/posts/:id/schedule` (server validates the date and routes
  auto/manual); the PUT path skips date validation. `scheduled_at` is locked
  while `scheduled`/`published` (`canEditScheduledAt`). See
  `docs/technical-decisions.md#schedule-endpoint`.
- **`src/lib/*` mirrors Go server rules** (`postStatusMachine`, `assetStatus`,
  platform gating). The server is the source of truth; keep these in sync when
  the backend changes.
- **Video uploads take a different path from images and PDFs** — presign →
  direct PUT to storage → finalize, so multi-hundred-megabyte files never
  buffer in the API. Routed by kind inside `usePostAttachments.upload`; the
  finalize response is the same shape an image upload returns. Video *rules*
  come off `GET /api/platforms` (`video_constraints`) rather than the
  `lib/platformMedia.ts` override table — but the size cap does not: 500 MB
  (`MAX_VIDEO_UPLOAD_BYTES`) is ours, and always wins over the seeded ceiling.
  A probed-but-zero `duration_ms` means video-service was down, not a
  zero-length file. See `docs/technical-decisions.md#video-ingest`.
- **An asset only opens in the editor if `opensAsDocument` says it is one.**
  `AssetDocument`'s editor is the last branch, never the fallback: `null | MD |
  PDF | URL` are documents, and anything else — a `type` the build predates —
  gets the read-only `UnsupportedAsset`. Never restore "everything else gets
  `AssetEditor`". It seeds BlockNote from `content` and autosaves it back, so
  the first type whose `content` isn't a document is overwritten by anyone who
  opens it and types (CON-235; `IMG`'s `content` is its description). PDF *is*
  a document — its extracted text is what the embeddings are built from. An
  image is not, and has its own screen rather than the fallback
  (`AssetImageView`, CON-246), so `UnsupportedAsset` is now only reached by a
  kind this build has never heard of. See
  `docs/technical-decisions.md#asset-opening`.
- **An asset update is presence-aware, and a campaign's is not.** Since CON-279
  the asset PUT reads `alt_text` and `tag_ids` as optional: omit one and the
  stored value is left alone, send it — including `""` or `[]` — and it is
  replaced. So a screen sends the fields it owns and nothing else: the document
  editor sends `{title, content}`, the image screen sends the four fields it
  shows. `assetToPayload` is gone with the bug it existed for; do not
  reintroduce a helper that round-trips fields the screen cannot see, because
  that is exactly what put a stale copy of the tags back over a bulk re-tag.
  The image screen still debounces the whole asset rather than each field, for
  the unrelated reason that two saves in flight each carry a stale copy of the
  other's field.
- **Tags are filed over a selection, not on a row** (`POST
  /api/content-bank/assets/tags`, CON-279). Each asset keeps what it has, minus
  `remove`, plus `add`, so the client never has to say what an asset already
  carries and two people filing at once don't overwrite each other. The server
  refuses a tag named in both lists rather than picking a winner.
- **A campaign update is a whole-resource PUT, and the server defaults every
  field the payload omits.** Leaving `publishing_days` out does not preserve the
  campaign's publishing days — it resets them to all seven, same for the rest of
  the CON-181/182 columns. Always build the payload through `campaignToPayload`
  (`lib/campaignPayload.ts`), which round-trips the server's own values and
  takes only the fields you mean to change as overrides.
- **A campaign is archived or deleted — it has no status** (CON-156). `draft`
  and `active` both meant active and nothing ever showed either, so the client
  no longer models `status` at all and the server creates every campaign
  active. What replaced it is a lifecycle with its own endpoints: `POST
  …/:id/archive` and `…/unarchive` (204, idempotent, deliberately not a field on
  the PUT so archiving can't ride along with an edit), and `GET /api/campaigns`
  which returns the active set unless asked for `?archived=true`. The two lists
  are separate query keys — an archived campaign must never reach the sidebar
  or seed `useCampaign`. `DELETE` is a soft delete server-side, but that row is
  our safety net and not an undo: there is no restore anywhere, so never write
  copy that hints at one.
- **The campaign's `estimated_post_count` is a rate, not a total.** Since
  CON-182 it means "this many posts per `goal_cadence` period" (`week`/`month`),
  and the server backfilled every campaign to `month` — so an old total of 12 on
  a three-month campaign now plans 36 posts. Read it through `lib/postGoal`
  (`postGoalTotal`), never as a campaign total.
- **`/api/settings` is tenant-scoped, not user-scoped.** Every key is visible
  to the whole workspace via `GET /api/settings`. Personal preferences get
  their identity from the key (`userScopedKey` →
  `calendar.<userId>.<campaignId>`, `postsTable.<userId>`); never put anything
  sensitive there. Use it for working habits that should follow the user
  between devices — the posts table's sort order
  (`docs/technical-decisions.md#posts-table-sort`) — and localStorage for
  per-device display state. See `docs/technical-decisions.md#user-scoped-settings`.
- **Every user-facing string is a catalogue entry — never a literal in a
  component.** New UI adds its keys to `src/i18n/resources/en.ts` *and* its
  translation to every other catalogue, and reads them through `t()`. This
  covers all of it, not just the obvious labels: button and menu text, headings,
  placeholders, empty and error states, toast and validation messages, tooltips,
  and the accessible strings nobody sees — `aria-label`, `title`, `alt`, visually
  hidden text. Editing a screen that still holds hard-coded English? Move the
  strings you touch into the catalogue rather than adding a literal beside them.
  Genuinely exempt: developer-facing text (`console.*`, thrown `Error` messages,
  test fixtures), `src/devtools/` (staging-only screens that a production build
  compiles out — see `docs/technical-decisions.md#staging-flag-overrides`), and
  `i18n/bootMessages.ts` — see the next bullet.
- **How the catalogues work.** English is bundled and is the fallback; `en.ts`
  is the shape everything else is typed against, so a key missing from `es.ts`
  is a compile error (a key missing from `en.ts` is a compile error at the call
  site). Keys name the place, never quote their own English; keep one key per
  sentence and reach for `<Trans>` when a link or `<strong>` sits inside one —
  never assemble a sentence from fragments in JSX. Plurals use i18next's
  `_one`/`_other` with each form written out whole. Destructive-action labels
  keep their literal capitals in **every** language. Anything that bakes copy in
  at construction takes `t` and is built per render instead: Zod schemas are
  `(t) => schema` factories (`hooks/useAuthSchemas.ts`), and the same goes for
  label maps and `const` option arrays — a module-level constant freezes
  whichever language loaded first. Where a table of *keys* is the natural
  shape, keep the table and translate at the point of use
  (`PostsEmptyState`'s `COPY`); where the values are something `Intl` already
  knows, drop the table (Calendar Settings' weekday names, and the analytics
  heatmap's). **A pure function that produces words takes `t` as its first
  argument** — `components/analytics/format.ts` is the worked example, and it
  is what lets the same helper be called from a component and from a view
  mapper without either of them holding a frozen label. The auth screens,
  sidebar, Profile, Workspace Settings, the campaign calendar and the analytics
  surfaces are converted (CON-174); the rest is still hard-coded English and
  renders fine — that is legacy to be converted, not a precedent to copy. See
  `docs/technical-decisions.md#i18n`.
- **A conversion is only proved by rendering in another language.** In an
  English test a literal in a component and a catalogue entry are the same
  string, so an English-only suite cannot tell a converted screen from an
  unconverted one. `components/analytics/localisation.test.tsx` is the pattern:
  load Spanish, switch to it, render, and assert both that the Spanish copy is
  there *and* that the specific English words that used to be literals are not.
  Spanish being gated off does not matter — the gate is on the entry points
  that choose a locale, never on i18next.
- **A language is released by one boolean.** `LOCALES` in `i18n/config.ts`
  carries `enabled` per locale; only enabled ones are offered in the picker,
  accepted from `?lang=` or restored from a previous visit — and a stored
  preference for a gated locale is cleared rather than left to reactivate on
  the deploy that releases it. The gate sits on those entry points, not on
  `setLocale`, so the switching machinery stays exercised by its tests while
  nothing but English is released. Spanish is complete and gated today.
- **Dates, times and numbers go through `lib/intl.ts`** — `formatDate`,
  `formatNumber`, `formatRelative` — never `toLocaleDateString(undefined, …)`
  or a bare `new Intl.DateTimeFormat`. The bare forms mean the *browser's*
  language, and the app's is a separate choice the user makes in Workspace
  Settings; a Spanish UI printing "Aug 20" is the same bug as an English one
  printing "20 ago". These helpers read the active language at call time and
  cache the formatter per locale, so nothing is hoisted to module scope where
  it would freeze the first language loaded. Three deliberate exceptions:
  `lib/timeZones.ts` pins `en-US` because it *parses* `formatToParts` rather
  than showing it, `PostCard`'s clock pins `hour12: false` because the card
  gives the time one fixed-width slot, and `docsTable`'s `stamp()` pins
  `en-GB` because day-first `01 Aug 26` is the format that column was asked
  for. That last one is the only exception that is a *display* choice rather
  than a mechanical one, so it is the one to revisit first — the app now has
  the date convention its comment says it was waiting for. The analytics
  surfaces used to hold a fourth and a fifth (`format.ts` pinning `en-GB` for
  the axis, `en-US` for thousands, and two mappers pinned to agree with it);
  they came out together in the i18n pass, because pins that exist only to
  agree with each other agree just as well when all of them read the active
  language. Formatting without reading `t()`
  means nothing re-renders the component on a switch — the overlay covers the
  app but doesn't remount it — so subscribe with `useLocale()` (or take
  `i18n.language` off a `useTranslation()` you already have) and pass it in.
- **The language switch is covered by a 2-second full-screen loader**, and
  `?lang=es` forces one for a page load then persists it. The waiting screen's
  own copy is the one string that must *not* come from the catalogue — it lives
  in `i18n/bootMessages.ts`, in the main chunk, because it renders while the
  catalogue is being fetched. Keep that file to those two lines.
- **The right sidebar never stores which panel is open.** It persists one
  remembered choice per screen (`panelMemory` in `settingsStore`) and derives
  the rest: ask `selectActivePanel`, never `panelMemory` directly. A route makes
  its panels reachable by calling `usePanelScope('post' | 'calendar', campaignId)`
  — that is the *only* write navigation is allowed, and it's why routes no
  longer close their own panels on unmount. Never add such a cleanup effect
  back; it would save the side effects of navigating instead of the user's
  choice. New panels go in `PANEL_SCOPE` (`lib/rightPanel.ts`), which won't
  compile until they say which screen they belong to. The assistant is the
  rail's floor — open on first run, closing another panel reveals it rather
  than collapsing the rail, and navigating never closes it. See
  `docs/technical-decisions.md#panel-memory`.
- **Explanatory copy goes in `<Explainer>`**, which the user can close for
  good (`settingsStore.dismissedNotes`, device-local — display noise doesn't
  belong in the workspace-wide `/api/settings`). The rule that makes it safe:
  an Explainer holds **teaching only** — never a count, warning, validation
  message, or link the user needs while working, because all of it disappears
  for anyone who closes the note. Check the screen still reads correctly with
  the Explainer deleted. See `docs/technical-decisions.md#explainers`.
- **Anything the API doesn't support yet ships behind a feature flag** — see
  the global rule at the bottom of this file. Flags are declared in
  `config/featureFlags.ts` (a constant today, flipped by editing that file) and
  read with `useFeatureFlag(id)` (`isFeatureEnabled(id)` outside React), never
  from the `FEATURE_FLAGS` record directly: the hook is the seam where
  server-driven values will land, and going through it keeps every call site
  untouched when they do. A flag is not a permission.
- **A flag's life ends at the second merge, not the first.** Turning one on is
  a deliberate step; deleting it is the *next* one, once the feature has
  survived one real deploy and nobody has reached for the switch. A flag left
  on is a branch nobody takes, and every reader of its call sites has to answer
  "and when this is false?" about code that has not run since it shipped.
  **The `true` entries are the ones on a clock — the `false` ones are the
  mechanism working**, holding unshippable work on `develop`, and their number
  is not a problem to solve. Reviewed on the first working day of each month:
  every flag that is on and has had a deploy goes, with its off-branch, in a
  commit that touches nothing else.
- **On staging and in dev, a flag can be forced for one browser.** A
  `?ff=tasks,-activity` link or the unlisted `/flags` panel writes an override
  to localStorage, so one teammate can exercise a half-built feature on the
  shared deploy while everyone else sees the app as it ships. Deliberately
  *not* in `/api/settings` — that row is workspace-wide, which is the opposite
  of what this is for. The whole layer is compiled out unless the build sets
  `VITE_DEV_TOOLS=1`, so in production the key is inert and the panel's chunk
  does not exist; keep it that way, and never link `/flags` from the app. See
  `docs/technical-decisions.md#staging-flag-overrides`.
- **The analytics dashboard can be served simulated numbers, for the same
  browser and behind the same gate.** `?analytics=demo` (or the panel at
  `/flags`) points `/overview`, `/performers` and `/learnings` at
  `services/api/analytics.demo.ts`, because a local API answers
  `available: false` for all three — nothing in a dev database has been through
  a refresh sweep — so the cards are otherwise only ever seen in their setup
  state. `empty` and `unavailable` produce the other two answers the endpoints
  give. It is **not** the `STUBBED` pattern: these endpoints exist and ship, so
  the demo is off by default even in dev, has to be asked for, folds away
  entirely without `VITE_DEV_TOOLS=1`, and is announced in the corner for as
  long as it is on — invented figures about a workspace's own posts are
  indistinguishable from real ones, and somebody would act on them.
- **What the workspace's tier allows is `useEntitlement(key)`, never a flag**
  (CON-232). A flag says whether a feature is *built*; a tier says whether this
  workspace *bought* it — per workspace, and therefore the server's answer. Four
  rules make the seam safe. **Unknown key allows**: a feature the tier settings
  don't mention is one nobody decided to charge for, so it works the day it
  ships instead of going dark until every tier is taught about it. **Unresolved
  decides nothing** — `pending` is a state in the union, because rendering a
  lock while the plan is in flight tells a paying customer they didn't pay.
  **The client never maps a tier name to a number**: tiers are versioned and
  configurable and a workspace keeps the version it bought, so two "Pro"s can
  hold different allowances and only the server's resolved snapshot is true.
  **Dates are display data** — never an input to a decision, or a wrong system
  clock becomes a billing one. It is a hook rather than a `<Gate>` wrapper
  because *hidden* is a legitimate answer and a wrapper can't remove the `<li>`
  around it: the call site chooses hide / lock / lock-with-upgrade, and only the
  renderings are shared (`components/entitlements`).
- **A downgrade suspends; the server picks what.** Nothing is deleted, and the
  new tier only lands at the next billing boundary. A workspace that drops to
  one campaign and has two keeps both, with one flagged read-only *by the
  server* — never worked out on the client by counting against a limit, which
  would pick a different victim than the server did and a different one per tab.
  So gating applies to **creating and choosing**, never to displaying what
  exists: suspended things stay in their lists and still open, and every picker
  has to tolerate a current value that is no longer among its options.
- **Two long-lived streams, and they are not interchangeable.** `/api/events`
  is an invalidation bus — at-most-once, no log, `Last-Event-ID` ignored — so an
  event is a *hint* that a cache is stale and the recovery path is refetch.
  `/api/notifications/stream` is an inbox: the table is the log, the stream
  replays from `Last-Event-ID`, and a row survives the tab being closed. Put a
  fact somebody must not miss on the second one and a cache hint on the first;
  neither can be a topic on the other. They share only the machinery for staying
  open (`lib/streamConnection`: backoff, silence watchdog, subscriber counting)
  and the one frame parser (`lib/sse.ts`) — keep both single. And notification
  copy comes from the **catalogue**, keyed off `type` + `data`, never from the
  `title`/`body` the server composes; those are the fallback for a `type` this
  build predates (`lib/notifications.ts`, `docs/activity.md`).
- **All API calls go through `services/api/`** with `credentials: "include"`.
  Use `apiJson`/`apiVoid` from `http.ts` unless a resource needs progress
  (`uploads` uses XHR) or typed errors (`zernio`).
- **A feature waiting on the back end is stubbed with a JSON seed, never with
  MSW.** When a flagged feature needs data the server cannot answer for yet,
  write the normal `services/api/<thing>.ts` with the signatures the endpoint
  will have, and back them with a `.seed.json` plus `localStorage` and a small
  delay — `services/api/brand.ts` is the pattern. A service worker buys wire
  fidelity for a contract nobody has agreed, and the mock ends up inventing the
  API; a plain module is one readable file, and swapping each body for an
  `apiJson` call leaves the hook, the routes and the components untouched. Rules
  that make it safe: the stub is reached only through its hook, its doc comment
  names what it is, and it stays behind the feature's flag like everything else
  the API can't back.
- **A workspace is the tenant and a member is a user.** Inside a workspace,
  `services/api/workspaces.ts` is a façade over `/api/tenants/current`,
  `/api/users` and `/api/invitations` (CON-26); the account-level
  `/api/workspaces` routes (list/create/switch/delete, CON-147) are the one
  place a workspace is a resource of its own. The two roles it deals in are
  the server's: `owner | member`, nothing else.
  **`DELETE /api/users/:id` removes a membership, and only from the active
  workspace** — the account and its other workspaces survive, but the cascade
  from `created_by` destroys the campaigns, posts and assets that membership
  created *here*, so every caller confirms both halves in those words. The
  server guards the ≥1-owner invariant (409). There is **no account deletion
  on the API** — Profile's Danger Zone is "leave this workspace". And a
  `users.id` is a **per-workspace membership id**: `current_user`'s id names
  the *default* workspace's membership, so identity checks across workspaces
  go by email (`listMembers`' `is_self`), never by id. See
  [`docs/workspace-api.md`](./docs/workspace-api.md) §4a.
- **Which workspace a request acts in is named per request, not per session**
  (CON-147). The tab's workspace lives in `lib/activeWorkspace.ts` —
  **`sessionStorage`, never `localStorage`**, or two tabs could not sit in two
  workspaces, which is the whole feature — and `services/api/base.ts` attaches
  it as `X-Workspace-Id`. Anything that reaches the API with a bare `fetch`
  goes through **`scopedFetch`** so a scoped call can't quietly land in
  whichever workspace the account defaults to; XHR paths call
  `workspaceHeader()` after `open()`. Account-level routes
  (`/api/workspaces…`, `/api/current_user`, `/api/sessions`, the public
  `/api/invitations/accept/:token`) deliberately send **no** header — they are
  the calls a tab makes to recover when its own workspace stops answering. Two
  more consequences: `user.role` from `/api/current_user` is the role in the
  *default* workspace, so read the active one through `useWorkspace()`; and a
  403 is not proof of a stale pin (owner-only routes answer 403 too), which is
  why `lib/staleWorkspace.ts` verifies before it acts.
- **Switching workspace is client-side.** `useSwitchWorkspace` re-pins the tab,
  clears *this tab's* Query cache and navigates; it does not reload, does not
  rebind the session and must not touch another tab. `POST …/:id/switch` is
  fire-and-forget — it only sets the account's default for the next fresh tab.
  See `docs/workspace-api.md` §3.
- **Styling is CSS-first:** the theme and tokens live in `src/index.css`; there
  is no `tailwind.config.js`. Use `cn()` from `lib/styles.ts`. Apply z-index
  from `config/zIndex.ts` via inline `style={{ zIndex }}`, not `z-[…]` classes.
  Colors only via semantic tokens (`bg-primary`, `text-tertiary-foreground` —
  never `bg-white`, palette steps, or raw hex/oklch): see
  [`docs/colors.md`](./docs/colors.md).
- **Screen corners have fixed jobs — top is about the object, bottom is about
  the work** (CON-178). Top-left: where you are and how you get back.
  Top-right: **views only** — anything that opens or switches a representation,
  never anything that changes the document. Top-centre (`PageHeader`'s `center`
  slot): passive status, in practice just `SaveStatus`, non-interactive by
  rule. Bottom-centre: the commit, on `PageActionBar`. Bottom-right: the
  assistant trigger. Bottom-left stays empty. A bar belongs to **editor**
  screens only (post, asset, brief, settings) — a list has creation, not
  commit, so `ADD CAMPAIGN` stays top-right. The bar must anchor to the
  *content column*, not the scroller (it would scroll away) and not the
  viewport (it would drift off the column when the right rail opens); pages
  using one leave `PAGE_ACTION_BAR_INSET` at the bottom of their content. `h-12`
  and `bottom-4` are shared with the assistant trigger so the bottom edge is one
  line; the trigger's `right-4` against the 24px content gutter is the one
  deliberate break-out.
- **A control that doesn't govern the whole page doesn't go in the corner.**
  The top-right rule above says what *may* sit there, not that every view
  switch must. Analytics' period and platform controls sit in a scope bar above
  the cards (`WorkspaceScopeBar`) because neither reaches all three: the period
  does not reach the all-time lessons card, and only `/performers` takes a
  `platform`. What makes that safe is that the cards answer back —
  `SectionCard`'s `scope` and `everyPlatform` print one line under the heading
  naming the controls that do *not* reach it. A card silently ignoring a
  control above it is worse than not offering the control.
- **Charts are hand-rolled SVG, except the two full-card plots.**
  `components/analytics/charts.tsx` draws sparklines, heatmaps, the decay
  curve, the publication rail and the rank bars itself — every shape is a
  polyline, a band or a grid of rectangles, and rolling them keeps the colours
  on semantic tokens. `TrendChart` and `ColumnChart` go through `plot.tsx`,
  which measures real pixels and owns the scale (`@visx/scale`), the pointer
  (`@visx/event`) and the hover card; only the line itself is `@visx/shape`.
  Two things not to undo: the plot is **measured, not stretched** — the old
  `preserveAspectRatio="none"` viewBox made the focus dot an ellipse and every
  pointer coordinate a conversion — and it measures with its **own**
  `useMeasuredWidth`, not `ParentSize`, which never observed a plot mounted
  after the first paint and left every switched measure blank. Sparklines keep
  the stretched viewBox; they have no pointer and nothing round.
- **A measure is drawn in one shape, decided in one place.** `drawnSeries`
  (`analytics/format.ts`) says whether a series is accumulated, and both the
  tile's sparkline and the chart under it ask it. They used to each hold a
  copy and drifted — per-day bars under a label reading "Cumulative reach",
  above a chart drawing the running total.
- **Two form systems by design:** lightweight `useFormValidation` for auth
  forms, full RHF + `ui/form.tsx` for feature forms.
- **Destructive-action labels are written in literal capitals** — `DELETE
  CAMPAIGN`, not `Delete campaign` with a `uppercase` class. The caps are part
  of the copy (they survive copy/paste, screen readers, and any restyle), so
  never swap them for CSS casing and never "sentence-case" them back. Applies
  to every Danger Zone / irreversible action across the app. Leave the button
  styling alone — this is a copy rule, not a style rule.
- **Design harnesses live on `design/*` branches, never on `develop`.** A
  harness is a `/design/<feature>` route rendering every state of a component
  from fixtures, and it needs an exemption in `__root.tsx` `beforeLoad` to open
  without a session — which is why it must not sit in `develop`. Each harness is
  one commit on top of `develop` on its own long-lived branch (e.g.
  `design/post-quality`), rebased forward when `develop` moves. To use one,
  check its files into your working tree and **don't commit them**:
  `git checkout design/<name> -- src/routes/design src/routes/__root.tsx`.
  Expect `routeTree.gen.ts` to regenerate with the extra route — that edit is
  part of the same don't-commit set.
- Import with the `@/` alias (→ `src/`). **Extension-less specifiers are the
  convention** (`@/stores/toastStore`, `./base`) — barrels like `@/lib` can't
  take an extension at all. `allowImportingTsExtensions` means the explicit
  `.ts`/`.tsx` form found in some files also resolves; leave existing imports
  as they are and don't flag the difference in review. TS is strict — no
  unused locals/params.

## Known stubs / gaps

Inviting teammates is live end to end (People, in Workspace Settings; the
emailed link lands on `/invite?token=…`, which is public, and accepting either
creates the account or adds the workspace to one that already exists) ·
**multi-workspace is live, unflagged** — [ogen#109](https://github.com/ogen-app/ogen/pull/109)
merged 2026-08-14; the `multi-workspace` flag and its off-branch were deleted
once the client was re-tested against the shipped API (CON-147) ·
dark mode is scaffolded but empty · **calendar cards have never shown a
picture** — the card's only image source is `post.media_urls` and nothing writes
it; editor uploads land in `post_attachments`, whose thumbnails are 15-minute
presigned URLs the client cannot persist. Needs a thumbnail on the post list
payload — CON-247. Calendar Settings' *Show cards as image previews* switch is
hidden behind `calendar-card-images` until then; it was on by default and inert,
which read as a broken calendar rather than an unbuilt feature
(`docs/technical-decisions.md#calendar-card-media`) ·
**a Content-Bank image has no thumbnail** —
images upload, store as `IMG` and open on their own screen (CON-246), but the
server renders no smaller copy, so the list's preview cell draws the full file
scaled into 40px; `thumbnail_url` is preferred wherever it appears, so nothing
here changes when that job lands. The other half still missing is the bridge
that attaches a bank image to a post (CON-16) — which is what the alt text is
being collected for · **the React Compiler lint rules are warnings, not errors** —
`react-hooks` v7 reports 123 of them against code that predates it, and each is
a judgement call about a component rather than a mechanical fix
([`docs/quality-tooling.md`](./docs/quality-tooling.md)) · **i18n covers the auth screens, sidebar,
Profile, Workspace Settings, the campaign calendar** (its week, month and
list views, the cards, both rail panels and the posts table) **and the
analytics surfaces** (the workspace dashboard, the campaign composition, a
post's own numbers, and the three view mappers behind them) — everything else
is still hard-coded English (CON-174) · **English is the only released language**: Spanish is
translated and tested but gated by `enabled: false` in `i18n/config.ts`, so the
picker shows one option.

**A thread publishes as one post, not as a thread** (CON-196,
`thread-sequence`, off). X has offered a `thread` post type all along and the
preview card has always drawn a chain, but `SubmitRequest` in the Go repo's
`publishers/zernio/posts.go` carries no `platformSpecificData`, so nothing ever
sent Zernio's `threadItems` — the whole body goes out as a single post. Behind
the flag the chain is **derived from the body** rather than composed in
separate inputs: the editor stays the one Markdown card every post type uses, a
`---` divider is a break, blank lines are the break where the body has no
divider, and anything still past the per-post ceiling is cut to fit. So there
is no "this post is too long" to report — it is cut instead — and `content` is
never rewritten, which is why nothing outside the flag is touched. The one
thing a body cannot say is which post carries which file, so that map alone
sits in the tenant key/value store and is chosen on each thumbnail in the media
card. Threads gains the type too (Zernio takes the same field on both).
**Waiting on** that field in the submit path, **the same split implemented
server-side** (the words live only in `content`, so the publisher must cut it
the way `splitBody`/`splitToLimit` do), a home for the media assignment,
`thread` added to `threads` in `publishers/zernio/platforms.go` — a submit
blocker only, because while the flag is on `aheadOfPublishers` lets it stand in
for the slug the publisher has not learned yet — and
**attachment validation counted per item** — the server measures files against
the post, so five images spread over three posts still warns "platform allows
up to 4". That message is passed through as written because until the publisher
splits it is right. See `docs/technical-decisions.md#thread-sequence`.

**The Profile marketing-email switch is built but flagged off**
(`email-preferences` in `config/featureFlags.ts`). CON-155 shipped the server's
token-gated unsubscribe pages, not a session-authenticated one, so
`GET`/`PUT /api/users/:id/email-preferences` still has to be written. The
contract is in `services/api/emailPreferences.ts` and asserted by its test.
Flip the flag when the handler answers. See
`docs/technical-decisions.md#email-preferences`.

**Workspace tiers run on a local stub** (`workspace-tiers`, CON-232). The seam
— `types/entitlements.ts`, `lib/entitlements.ts`, `useEntitlement`, the shared
renderings in `components/entitlements` — is written and tested, and two
surfaces talk *about* the plan rather than being gated by it: the **Plan &
billing card** in Workspace Settings (`components/workspace-settings/
PlanSection`) and **`/plans`** behind its CHANGE PLAN. Choosing a tier
re-answers every `useEntitlement` in the app, which is how the gating gets
looked at before the API exists. **Waiting on** `GET /api/entitlements`,
`GET /api/tiers`, `POST /api/workspace/plan`, `GET /api/billing` and
`POST /api/billing/portal` — contracts in `services/api/entitlements.ts`,
`tiers.ts` and `billing.ts`, all asserted by their tests, and all tested
against the *wire* path (`fetchWorkspacePlan`, `fetchBilling`) so the stub
can't make a contract go dark. CON-208 (tenant tiers and groups) and CON-86
(usage metering) are done server-side, so the tiers and the counters exist;
what is missing is a workspace-scoped REST read that puts them together, plus a
`suspended` flag on the resources a downgrade makes read-only.

**`/plans` deliberately sits outside `_authenticated`**, like `/workspaces`: it
reads as a full-screen modal — one X, top right — because it is a detour every
entry point returns from, and the sidebar's items belong to the work it is a
detour from. The X goes *back* rather than to a fixed address. Two consequences
of living out there: the broadcast stream closes while it is open, and the
reference caches warm again on the way back.

**Ogen sells through Lemon Squeezy as merchant of record, so the app holds no
billing fields.** Lemon Squeezy is the legal seller: it takes the card, holds
the billing address and tax id, works out and remits VAT/GST, and issues the
invoice. Every editable billing field therefore already has a hosted, PCI-scoped
form we neither write nor answer for — so our side is a *report and a door*. No
address, no tax id, no card, no cancel endpoint; a second copy here is one that
can disagree with the invoice. **And no billing screen**: once the provider has
taken everything editable, what is left to state is a plan, a card's last four
and one sentence naming where the rest lives, which is a card in Workspace
Settings rather than a page — a page of that is white space with two buttons on
it. The door is
`POST /api/billing/portal`, which mints a **signed link that expires within the
day** — never cache, store or put it in a `href` at render time, and open the
tab synchronously on the click (a `window.open` after an `await` is blocked).

The stub is `services/api/tiers.stub.ts` — a JSON seed of the decided tier
matrix plus `localStorage`, with `STUBBED` switching the call sites, and it
answers the billing read too (no provider is connected, so: no subscription and
no portal). It does two things the client is forbidden to do, and says so:
it **ranks** tiers (to decide upgrade from downgrade, hence `direction` on the
wire) and it **reads the clock** (to date the renewal, which is also the
boundary a downgrade lands on). Neither may leak out — `rank` is stripped before
anything leaves the file, and its test asserts that.

No feature is gated yet. Which of hide / lock / lock-with-upgrade each key gets
is decided and recorded on `EntitlementKey` in `types/entitlements.ts`; wiring
the call sites is the remaining half. An entitlement nothing consults is the
same as no entitlement — but note the flag now also switches on a screen, so it
stays **off** on `develop` until the endpoints answer.

## Global rules

Do not keep backwards compatibility unless explicitly required.

**Front-end runs ahead of the back end, behind feature flags.** Build the UI
when the design is ready, not when the API is. If the server can't back it yet
— no endpoint, no column, a field that means something else — the feature ships
to `develop` with its flag **off**, so `develop` is always shippable and the
work is reviewable instead of parked on a branch.

The rules that make that safe:

1. **Declare the flag in `config/featureFlags.ts`** and gate the whole feature
   on it — every entry point, not just the main screen. With the flag off the
   app must behave exactly as it did before the feature existed.
2. **Nothing outside the flag may depend on the feature's data.** A half-backed
   field is worse than a missing one: don't let other screens, readiness rules
   or the assistant read a value the feature is still redefining. (Why
   `campaignReadiness` stopped reading `estimated_post_count` while CON-182 was
   redefining it from a campaign total into a per-period rate.)
3. **Say what is missing** in the flag's doc comment: which endpoint, column or
   decision the feature is waiting on. That comment is the hand-off to the
   back end.
4. **When the API lands, re-test the feature against the real thing** — a UI
   built against an assumed contract usually needs a pass — and only then
   decide the flag's fate. Turning it on and deleting the flag (with its
   off-branch) is a deliberate step, never a side effect of the endpoint
   appearing.

A flag is for "not built yet", never for who is allowed to see what — that is
the server's business.
