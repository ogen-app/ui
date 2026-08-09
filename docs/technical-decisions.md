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

## The Campaigns list batches posts instead of moving the rules {#batched-summaries}

**Decision.** The list gets its post data from one shared query —
`GET /api/campaigns/summaries` via `useCampaignSummaries` — returning a slim
projection (`PostSummary`) of every post in the tenant, grouped by campaign.
Each `CampaignCard` reads `data?.[campaign.id] ?? []` and runs the unchanged
`lib/campaignReadiness` rules over it (CON-152, fixing the N+1 in CON-127).

**Why not compute the verdict server-side.** That is the endgame
([attention-rules.md](./attention-rules.md#asks-for-the-backend) §6), not this
change. Aggregate counts cannot reproduce the badge — `manual-publish-due`,
`slot-collision`, `pipeline-gap`, `behind-pace` and the drift family all need
per-post `scheduled_at` / `platform_id` / `platform_post_type` and the *local*
clock. A reduced server-side set would make the list disagree with the Overview
behind it, and would hand the server a timezone problem the client doesn't have.

**Why a sibling endpoint, not fields on `GET /api/campaigns`.** Campaign
metadata and post state go stale on different events; the query keys are
already split for that reason (`campaignPostsKey` vs `campaignOverviewKey`).
`CAMPAIGN_SUMMARIES_KEY` is workspace-wide, so `invalidateCampaignPosts` fires
it once for every card rather than per campaign.

**Consequences.** `contentSnapshot` is generic in its post type rather than
merely widened: its counts work off a projection, but `upNext` /
`recentlyPublished` hand posts back out and the Overview renders their titles,
so it returns `T[]`. Campaign detail views (list, calendar, overview) keep
`useCampaignPosts` — they genuinely need full posts. The list does not fold in
assistant-streamed drafts the way `useCampaignPosts` does; new posts appear on
the next invalidation. Accepted: streaming is a detail-view concern.

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

## The posts table's sort order follows the user, not the device {#posts-table-sort}

**Decision.** The posts list defaults to **schedule date, earliest first**, with
unscheduled posts last. Whatever the user sorts by instead is stored server-side
under `postsTable.<userId>` and applies to every campaign's list (CON-170).
`usePostsTableSort` owns it; `VirtualTable` gained an optional controlled
`sorting` / `onSortingChange` pair so a caller can persist an order the table
knows nothing about.

**Why schedule date.** A content calendar is read forwards — what goes out next.
The previous default was title A–Z, which is the one order nobody plans in.
Nulls sort last in *both* directions: "not scheduled yet" is not "scheduled at
the beginning of time", which is what a raw `null` compares as. The column
therefore maps `null → undefined` in its accessor so TanStack's
`sortUndefined: 'last'` can take it.

**Why the server, when the right sidebar's memory is in localStorage.** These
look like the same problem and aren't. Panel memory is about the shape of one
window — it is display noise, it is genuinely per-device, and putting it in the
tenant-wide settings table would broadcast it to the workspace for no gain
([#panel-memory](#panel-memory)). A sort order is a working habit: someone who
reads this table newest-first wants that on their laptop and their desktop, and
CON-170 asked for the `tenant_id : user_id_{KEY}` shape explicitly. The cost is
the one documented at [#user-scoped-settings](#user-scoped-settings) — every
key is readable by the whole workspace — and a column id is not sensitive.

**Account-wide, not per campaign.** A per-campaign key would make the same list
arrive sorted differently depending on which campaign you opened, which reads as
a bug rather than a memory.

**The table waits for it.** `isPending` holds the skeleton rows until the stored
order has been read, rather than drawing the default and re-sorting a moment
later. Rows jumping after paint looks broken, and on a long list it loses the
row the reader was looking at.

**Stored values are distrusted on the way in.** `parsePostsSort` drops entries
that don't name a column in `SORTABLE_POST_COLUMNS` and falls back to the
default, so renaming or retiring a column can't leave someone's saved preference
pointing at a column that no longer exists. The parser is where this feature's
tests are (`usePostsTableSort.test.ts`) — the stored blob is its only input the
app doesn't control.

**Where.** `hooks/usePostsTableSort.ts`, `components/tables/VirtualTable.tsx`
(controlled sorting), `components/tables/postsTable/index.tsx`,
`routes/_authenticated/campaigns/$campaignId/list.tsx`.

## The marketing-email opt-out gets its own endpoint {#email-preferences}

**Decision.** The Profile switch reads and writes
`GET`/`PUT /api/users/:id/email-preferences`, a route that does not exist yet —
`services/api/emailPreferences.ts` carries the contract and
`emailPreferences.test.ts` states it executably. The section ships behind the
`email-preferences` feature flag, off, so `develop` doesn't carry a card that
can only fail. It is **not** a `userScopedKey` in `/api/settings`.

**Why.** CON-154/CON-155 built the entire suppression engine server-side, but
every endpoint it exposes is public and token-gated: it verifies a signature
lifted from an email footer, not a session, so none of them can answer "is the
person on this page subscribed?". Routing the switch through `/api/settings`
instead would have avoided the new endpoint and been wrong twice over — that
store is tenant-scoped and readable by every teammate (see
[#user-scoped-settings](#user-scoped-settings)), and it would have created a
*second* record of subscription state that the emailed unsubscribe link doesn't
update. One `email_suppressions` row, two ways to reach it.

**The two booleans.** `marketing` is the subscription; `delivery_blocked`
reports a `scope='all'` suppression, the row a hard bounce or spam complaint
writes through the Resend webhook. They have to be separate because
`RemoveMarketing` doesn't touch an `all` row: a bounced address can be
subscribed and still receive nothing. The UI disables the switch and says so
rather than offering a toggle that can't take effect.

**Where.** `services/api/emailPreferences.ts`, `hooks/useEmailPreferences.ts`,
`components/profile/EmailPreferencesSection.tsx`. The switch sits outside the
Profile page's `SettingsSaveProvider` — it applies on flip, because a control
that looks applied and is actually queued behind a header Save button would let
someone leave believing they had unsubscribed.

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

## Disconnect is per account, and the scary confirm is earned {#disconnect}

**Decision.** The Disconnect control hangs off each **account row** in Platform
Settings, not off the platform row, and its dialog is two-step: the first
confirm attempts a plain `DELETE
/api/integrations/zernio/accounts/:id`; only if the server answers `409
account_has_scheduled_posts` does the dialog show the count and offer
`?force=true` (CON-133).

**Why.** The endpoint takes an account id, and since CON-150 a platform can hold
several accounts — a per-platform button would have had nothing unambiguous to
delete. The two-step exists because the count lives *only* in that 409: there is
no "posts by account" query to ask beforehand. Attempting first means the
alarming screen is shown exactly when it's warranted, instead of warning about
scheduled posts on every disconnect.

**Consequences.** A forced disconnect strands those posts: a soft-delete does
not clear their `social_account_id`, so they keep naming an account that is no
longer in the platform's active set — which is precisely the `mismatched` state
`resolvePublishingAccount` already reports. Recovering means unscheduling the
post (the account is locked while `scheduled`, see
[`#status-machine`](#status-machine)). Disconnect invalidates the **platform**
list, not post queries, because that list is what both the settings rows and the
composer's picker read.

## Video uploads bypass the API, and its rules come off the wire {#video-ingest}

**Decision.** A video attachment does not go through the upload endpoint the
way an image or PDF does. It is three steps — `POST
…/attachments/presign` for a short-lived PUT URL, a direct `PUT` of the bytes
to object storage, then `POST …/attachments/finalize` — and the third answers
with the same `attachmentResponse` an image upload returns, so everything
downstream treats the two alike (CON-148). `usePostAttachments.upload` picks
the path by `attachmentKind(file.type)`; nothing above it knows the difference.

Separately, the per-platform video rules are read straight off `GET
/api/platforms` (`video_constraints`), **not** mirrored into
`lib/platformMedia.ts` the way image and PDF rules are.

**Why.** The API buffers an upload in memory and caps it at 100 MB; video is
an order of magnitude larger, so the bytes must not touch the API process at
all. And `platformMedia.ts` exists only because the seeded image/PDF values
disagree with what the platforms accept — the video values were seeded by
CON-148 from the same Zernio docs that table is sourced from, so a second copy
would be two sources of truth and no correction.

**Consequences.**

- The PUT is cross-origin. `withCredentials` stays **off** — the URL carries
  its own signature — and the storage bucket must allow `PUT` from the app's
  origin, which is the first thing to check when an upload fails with a network
  error rather than a status.
- `Content-Type` on the PUT must match what presign was told; it is part of
  what the signature covers.
- The file-size ceiling is the one number we do *not* take from the server.
  `MAX_VIDEO_UPLOAD_BYTES` (500 MB, `lib/platformVideo.ts`) is Ogen's own
  ingest budget, far under both the API's 5 GiB cap and the seeds (YouTube is
  64 GB); the effective limit is always the stricter of the two, and
  `cappedByOgen` records which one bound so the rejection can name the right
  culprit.
- `duration_ms: 0` / `codec: ''` / a missing poster mean **video-service was
  unreachable**, not a zero-length file — the server accepts the upload
  unprobed by design. Anything rendering these has to omit rather than show a
  `0:00` that reads as a broken upload, and the duration rules simply don't
  fire on an unprobed video.
- Publishing a video with an empty title is blocked where
  `requires_video_title` is set (YouTube). Mirrored from
  `platforms.ValidatePostType`, and the field is the post's existing title —
  there is no separate video-metadata form, because the Zernio submit request
  models nothing else yet (CON-159).

## English is bundled, every other language is a chunk {#i18n}

**Decision.** i18next + react-i18next, one namespace, with English statically
imported into the main bundle (`i18n/resources/en.ts`) and every other locale
behind an `import()` (`i18n/index.ts`, `LAZY_RESOURCES`). The chosen language
lives in `localStorage`, not in `/api/settings`. `?lang=es` forces one for a
page load and is then persisted like any other choice. Any load or switch that
actually has to fetch a locale is covered by a full-screen waiting screen held
for a minimum of two seconds (`MIN_LOCALE_SWITCH_MS`).

**Why each half of that.**

- **English bundled** — the app has to paint before any network request
  resolves, and it is the fallback for every key, so a translation that misses
  one shows real copy rather than a raw dotted path. It is also the
  overwhelmingly common case: opening the app in English costs nothing and
  shows no loader at all.
- **`localStorage`, not `/api/settings`** — the login screen has no session to
  read tenant settings with, and this is a per-device preference, not a
  workspace one. It sits alongside `dismissedNotes` in kind, though not in
  file: `bootstrapLocale` needs it *synchronously*, before React mounts, to
  decide whether the first paint is the app or the waiting screen, so it is
  read directly rather than through zustand's `persist` middleware.
- **`?lang=` is read and stripped before the router is created** — routes here
  declare strict `validateSearch` schemas that would drop an unknown key on the
  next navigation anyway. Stripping it with `replaceState` (not a navigation)
  keeps Back from landing on the same URL with the parameter still attached.
  Precedence is `?lang=` → stored choice → English; there is deliberately no
  `navigator.language` step, because inferring a language nobody asked for
  hides the fact that a translation exists behind a loader on first load.
- **The two-second floor** — a locale chunk arrives in well under a frame on a
  warm connection, and a UI that swaps language between two paints reads as a
  glitch rather than as something you did. The floor and the fetch race
  together (`Promise.all`), so a slow connection costs its own time, not that
  time plus two seconds.
- **Nothing unmounts** — the waiting screen is an opaque `fixed` panel over a
  still-mounted app, so a switch keeps scroll position, the query cache and any
  in-flight edit.

**The one screen that can't read from the catalogue.** `i18n/bootMessages.ts`
holds the waiting screen's own two lines for *every* language, in the main
chunk. It is what covers the fetch, so on a reload by someone whose language is
Spanish the Spanish bundle is precisely what has not arrived — read through
`t`, it would greet them in English on every single page load. Keep that file
to those two lines; everything else belongs in `resources/`.

**Zod schemas are factories, not constants.** A schema bakes its messages in at
construction, so a module-level `loginSchema` would freeze English forever. Each
is now `(t) => schema`, memoised on `t` by the hooks in
`hooks/useAuthSchemas.ts` — which also means a language switch rebuilds any
validation error already on screen.

**What has to be a key.** Every string the user can read: button and menu
labels, headings, placeholders, empty and error states, toast and validation
messages, tooltips, and the strings only assistive tech reads — `aria-label`,
`title`, `alt`, visually hidden text. The accessible ones are the ones that get
missed, because nothing looks wrong on screen when they stay English. Exempt:
developer-facing text (`console.*`, thrown `Error` messages, test fixtures) and
`bootMessages.ts`. A string that has to be picked before render — a status
label map, a `const` array of select options — moves inside a `(t) => …`
factory or a hook rather than sitting at module level; see the Zod note above,
which is the same failure in a different shape.

**Catalogue conventions** (also stated at the top of `en.ts`): keys name the
place, never quote their own English; one key per sentence the user reads, with
`<Trans>` for a sentence that has a link or emphasis inside it; plurals use
i18next's `_one`/`_other` and spell out each form whole, because English
pronouns and Spanish agreement do not survive being stitched at runtime. Even
the list separators are translated — English writes "a, b, c, and d" where
Spanish writes "a, b, c y d". Destructive-action labels keep their literal
capitals in every language (`DELETE ACCOUNT` / `ELIMINAR CUENTA`).

**Where.** `src/i18n/` (config, resources, boot messages),
`stores/localeStore.ts`, `components/layout/{AppLoader,LocaleSwitchOverlay}.tsx`,
`components/settings/LanguageSection.tsx`, `hooks/useAuthSchemas.ts`.

**A release gate per language, not per feature.** `LOCALES` carries an
`enabled` flag on each row. A disabled locale still compiles, still type-checks
against `en.ts` and still ships its chunk — it is simply not offered in the
picker, not accepted from `?lang=`, and not restored from a previous visit;
a stored preference for one is cleared, so it cannot lie dormant and switch
someone's language by itself on the deploy that releases it. The gate is on
those entry points rather than on `setLocale`, which keeps the switch covered
end to end by its tests while nothing but English is out. Per language rather
than one flag for i18n as a whole, because a locale is finished, reviewed and
released on its own schedule.

**Scope today (CON-174).** The machinery plus real conversion of the auth
screens, the sidebar, Profile and Workspace Settings. The rest of the app —
campaigns, posts, calendar, content bank, the assistant — is still hard-coded
English and reads correctly, because English is what `t` falls back to.
Converting a surface is per-area work, not a flag day. Spanish is translated in
full for those surfaces and gated: with the app only part-converted, choosing
it today would yield a half-Spanish UI, and the copy has had no native review.
Releasing it is `enabled: true`.

## Two form systems, on purpose

**Decision.** Auth forms use the minimal `useFormValidation` hook + plain
inputs; feature forms use full react-hook-form + the `ui/form.tsx` shadcn
abstraction with autosave.

**Why.** Auth forms are simple, submit-once, and need live password-rule
feedback — the heavyweight abstraction buys nothing there. Feature forms need
accessibility wiring (`aria-describedby`/`aria-invalid`), field-level control,
and autosave. Pick per the form's needs; don't unify them reflexively.

**Where.** `hooks/useFormValidation.ts` + `lib/auth-validation.ts` (whose
schemas are `t`-taking factories — see [i18n](#i18n)) vs `components/ui/form.tsx`
+ the `components/forms/*` feature forms.

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
- **Dark mode** is scaffolded (`.dark` block) but effectively empty.
- The **Imagery** Content-Bank tab renders nothing yet (`assetCategory.ts`); AI
  image generation + storage there is planned but **secondary** (CON-105/88/83).
- **Lint/format configs** (eslint/prettier/stylelint) are installed but not
  committed to this repo.
