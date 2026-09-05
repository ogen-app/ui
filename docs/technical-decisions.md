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

## A document set is written through its own endpoints, never through the record {#asset-membership}

**Decision.** Attaching and detaching documents goes through four endpoints of
their own (CON-233, [ogen#138](https://github.com/ogen-app/ogen/pull/138)) —
`POST`/`DELETE /api/campaigns/:id/assets` and the same pair on posts — and the
two id lists they write, `campaigns.asset_ids` and `posts.used_asset_ids`, are
**absent from the whole-record PUT payloads**. `campaignToPayload` and
`postToPayload` no longer name them; the server reads them presence-aware and
drops the omitted column from its `UPDATE`, so an ordinary save leaves the
stored set alone.

**Why.** Both fields were being written by read-modify-write over a
whole-resource PUT, which is two bugs. Concurrent writers lost ids — three
uploads finishing together each wrote the set *it* had read — and the client
compensated with a promise queue per resource, a re-read immediately before each
write, and (on posts) a flush-and-verify retry loop. Worse, the field shared a
payload with the editor's autosave: a keystroke inside the 600ms debounce cloned
the pre-attach list and its flush put the document straight back off the post.
None of that is fixable on the client, because the race is between two writers
of one column. Server-side it is one atomic statement — `jsonb_agg` over the
union `WITH ORDINALITY`, or `col - id` — so ids keep their order, a repeat add
is a no-op, and concurrent adds serialize on the row lock.

**The flag is derived, not sent.** `campaigns.use_assets` is maintained by the
same statement: attaching turns it on, detaching the last document turns it off.
It cannot be the client's decision. Generation checks the flag *before* the set
(`resolveAssets` returns early when it is false), so a campaign whose documents
were attached with the flag left off shows a full list and writes from none of
it — and `use_assets: true` over an *empty* list is how the server still spells
"every asset in the workspace", so a client that cleared the set and left the
flag would hand the campaign the whole workspace bank. Both are invisible on
screen.

**Consequences.** The per-resource write queues, the pre-write re-reads and the
retry loop are gone (`lib/campaignMembership.ts`, `lib/postSources.ts`).
Detaching a source is `removePostAsset`, not a `changeDoc` that rides the
autosave — the autosave cannot write the field at all now — though the
optimistic paint still goes through `changeDoc`, because a keystroke inside the
debounce clones the *pending* copy and a cache-only edit would be dropped. For
the same reason a save's response is no longer evidence about the set: it
carries the row as the server read it, *before* an attach that may have landed
since, so `withHeldSources` (`lib/postCache.ts`) keeps what the cache holds over
what the PUT answered. Note that `published_url` sits in the same payload and is
listed rather than omitted (CON-165) — the handler defaults *it* away on
silence. The two fields are opposites, and a payload builder that treats them
alike is wrong about one of them.

**What is left.** One read before each campaign write, to catch a campaign still
in the legacy whole-bank state and pin it to the bank first — otherwise
attaching one document collapses "everything" to that document. The cache
answers only the negative (a campaign can leave that state but never enters it),
so an ordinary set is proof and a cached sentinel is re-read. The pin rides
along with the write as one union rather than being a step that could be
skipped. A sentinel campaign over an *empty* workspace is left as it is: there
is nothing to pin to, and "everything" and "nothing" are the same campaign until
somebody uploads something — which is the visit that pins it. All of it dies
with a backfill of those rows.

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
`media_urls`, so **the leading image never renders in practice today**. The card
is built and correct; lighting it up needs the backend to put a thumbnail URL on
the post list payload — **CON-247**, a backend ticket with no front-end change
expected.

Calendar Settings' *Show cards as image previews* switch is therefore **hidden
behind `calendar-card-images`**. It was on by default and inert, which is the
worst of the three states it could be in: an off switch would read as a setting
to try, an absent one as a feature not built, but a switch already *on* says the
pictures are missing for some other reason and sends the user looking for it in
their posts. The preference itself is untouched — still stored, still defaulted
— so this hides a control rather than changing a setting, and whatever a user
chose comes back when the flag flips.

There is no client-side workaround, and it is worth writing down which one fails
and why. `postToPayload` does round-trip `media_urls`, so the front end could in
principle write a thumbnail URL there on upload — but `PostAttachment.ThumbnailURL`
is a **presigned GET with a 15-minute TTL** (`PresignedURLTTL`, `handlers/post_attachments.go`),
so what would be persisted is a URL that is broken by the time anyone reloads.
The server's own `ListByCampaign` returns bare post rows with no attachment join,
so the payload has no other image in it either. The fix is one of: hydrate a
thumbnail onto the post list rows, or serve attachment thumbnails from a public
key the way `assets` already does (`storage.PublicURL`) so a stored URL would
keep working.

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

## The right sidebar remembers a choice per screen, and derives what's open {#panel-memory}

**Decision.** `settingsStore` persists `panelMemory` — `{ assistantOpen,
scoped: { calendar?, post? } }` — to localStorage, and **never** persists which
panel is open. What's on screen is computed on every read by
`resolveActivePanel(memory, scope)`: the panel remembered for the screen you're
on, else the assistant, else closed. Routes declare their screen with
`usePanelScope('post' | 'calendar', campaignId)`; that is the only thing
navigation is allowed to write.

**Why.** The panels aren't peers. `assistant` renders anywhere; the other six
are portal targets or campaign-scoped views that only exist on one route.
Persisting a single `activeRightPanel` would restore a fact about one screen
onto whichever screen you reloaded on — `postQuality` remembered, campaign list
open, and the rail slides out 480px wide hosting an empty `<div>`. Deriving
instead makes that unrepresentable: a remembered panel the current screen can't
serve simply falls through to the assistant.

The second half matters as much. Before this, leaving the post editor or the
calendar ran a cleanup effect that closed the route's panels by hand
(`$postId.tsx`, `CalendarHeaderActions.tsx`). Those are gone. They had to be:
persisting a value that navigation itself rewrites means saving the *side
effects of moving around* rather than the user's choice, so going away and
coming back could never be a no-op. Now memory is written by clicks alone.

**The assistant is the floor, not a seventh panel.** Every other panel is an
overlay on top of it, so closing one drops back to the assistant rather than
collapsing the rail, and only closing the assistant shuts it. This is a
behaviour change: toggling a post panel off used to close the sidebar and now
reveals the assistant underneath. It also means "open the assistant" has to
clear the current screen's overlay — otherwise the assistant is recorded as
open beneath something still covering it and the trigger looks broken.

It is also **open on first run** (`DEFAULT_PANEL_MEMORY`): the assistant is the
product, and hiding it behind a small mark in the corner buries the thing the
app is for. A default, not a rule — close it once and that sticks, everywhere.
Following a thread's "open the post" link does *not* close it: you asked to see
the post, not to dismiss the assistant that wrote it.

**Rehydration distrusts the blob.** `sanitizePanelMemory` rebuilds the memory
from scratch on load, dropping any panel id this build doesn't have and any
panel filed under a screen that doesn't own it. Persisted enum values outlive
the code that named them; without this, renaming a panel reintroduces the empty
rail through the back door.

**Where.** `lib/rightPanel.ts` holds the model and every state transition as
pure functions (`rightPanel.test.ts` covers them); `stores/settingsStore.ts`
holds them behind `openRightPanel` / `toggleRightPanel` / `closeRightPanel` and
exports `selectActivePanel`, which is how components ask what's open —
`panelMemory` is never read directly. `hooks/usePanelScope.ts` runs as a
*layout* effect so a reload straight into a post paints the restored panel
rather than opening it a frame later. Scope and `campaignId` are session-only:
where you are is not a preference.

## A campaign remembers where you were in its posts {#posts-place}

**Decision.** Each campaign remembers the arrangement its posts were last read
in and the day the calendar was drawn around — `{ view, anchor, granularity }`
per campaign id, in `settingsStore` (localStorage). The post editor's back arrow
and the sidebar's **Posts** row restore all of it, the list included; the entry
points that name the *calendar* — the overview's calendar card, a bare
`/campaigns/:id/calendar` URL — restore the date and granularity but never
redirect to the table.

**Why.** A campaign's posts are usually not in the current week: you plan
September in August. So "today", which every one of those links used to
hard-code, is the one week reliably guaranteed to be empty, and each return trip
through a post cost the user the navigation they had just done.

`granularity` is stored rather than derived because the list is neither
granularity, and something that opens a calendar after a trip through the table
still has to pick one — without it, it would guess "week" at someone who reads
their campaign by the month.

**Why not `history.back()`.** It has nothing to go back to when the post was
opened from a pasted URL or a new tab, and a button is not a link: the arrow
would lose middle-click, right-click and the status-bar preview that every other
navigation in the app has. The cost of keeping a real `<Link>` is that the back
arrow is two branches, since a `<Link>`'s params are typed off a literal `to`.

**Consequences.** The calendar writes the memory on every anchor change, so
`rememberVisit` returns its input unchanged when nothing moved and the store
skips the `set` — otherwise every arrow press would notify the sidebar and the
post header. The default reads the clock and so is a fresh object each call,
which is why the hooks subscribe to the stored entry (stable, or `undefined`)
and derive the default outside the subscription. Views are the only writers: a
redirect or a programmatic navigation must not be saved as the user's choice.
Rehydration distrusts the blob — a malformed anchor here would not render wrong,
it would put the router into `beforeLoad`'s normalising redirect on every
navigation.

`DeletePostDialog` is deliberately **not** wired to this: after deleting a post
it lands on the week that post was going out, which is a different and better
answer than where the user came from.

**Where.** `lib/postsPlace.ts` (pure, with `postsPlace.test.ts`),
`hooks/usePostsPlace.ts`, `stores/settingsStore.ts` (`rememberPostsPlace`),
recorded by the two views and read by `PostDetailsHeader`, `AppSidebar`,
`OverviewCard` and the bare-calendar redirect.

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

## An asset opens as a document only if we know it is one {#asset-opening}

**Decision.** `AssetDocument` asks `opensAsDocument` (`lib/assetCategory.ts`)
before it reaches the editor. `null | MD | PDF | URL` are documents; everything
else — including a `type` this build has never seen — gets `UnsupportedAsset`, a
read-only state, and loses the "Download as Markdown" item with it.

**Why.** The screen used to treat the editor as its fallback: a URL asset still
being scraped got `ScrapeState`, and *anything else* got `AssetEditor`. That is
only safe while every asset is text, and the server's vocabulary grows without
asking the client — `MD | PDF` became `MD | PDF | URL` in CON-222 and takes
`IMG` next. `AssetEditor` seeds BlockNote from `asset.content` and autosaves it
back, so the first asset type whose `content` is not a document is silently
overwritten by anyone who opens it and types. CON-105 writes image assets with
`content = "[]"`, which renders as an editable paragraph reading `[]` over a
field that is meant to hold the image's description (CON-16 D4). Filed as
CON-235.

Two consequences worth keeping:

- **PDF is a document.** What you edit there is the extracted text, and that
  text is what the embeddings are built from — so the rule is about the *body*,
  not about whether bytes sit behind the row.
- **The fallback is a floor, not a destination.** A kind worth showing properly
  gets its own view and stops arriving here, and `IMG` is the first to do it:
  CON-246 settled the DTO field for the original (`AssetFile.url`), so
  `AssetImageView` renders the picture with its alt text and description beside
  it. `opensAsDocument` still answers `false` for an image — it is not a
  document and never opens in the editor — so the two rules compose rather than
  compete. What reaches `UnsupportedAsset` now is only a kind this build has
  genuinely never heard of.

**One further consequence, found while wiring that up.** The asset update is a
whole-resource PUT and the handler assigns `tag_ids` and `alt_text` from the
request unconditionally, so a payload naming only what changed erases the rest.
`AssetDocument` had been sending `{title, content}`, which had been silently
untagging every asset anyone renamed — invisible only because nothing in the app
sets a tag. Every save now goes through `assetToPayload` (`lib/assetPayload.ts`),
the same round-trip `campaignToPayload` does for the same reason. The image
screen debounces the *asset* rather than each field for the matching reason: two
saves in flight each carry a stale copy of the other's field, and the second to
land wins.

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

## A flag can be forced per browser, on staging only {#staging-flag-overrides}

**Decision.** `useFeatureFlag`/`isFeatureEnabled` resolve
`readFlagOverrides()[flag] ?? FEATURE_FLAGS[flag]`. The override set lives in
**localStorage**, is set by a bookmarkable `?ff=tasks,-activity` link or the
unlisted `/flags` panel, and the whole layer is compiled out of any build that
was not made with `VITE_DEV_TOOLS=1`.

**Why.** On a shared staging deploy the two audiences want opposite things: the
back end needs to exercise a half-built feature, and the copy team needs the app
to look like the app — a copywriter seeing unfinished work costs a round of
feedback about a decision nobody has made yet. Before this, the only way to give
one person a different answer was a branch and a deploy of their own, which is
exactly the tedium that stops people testing.

Four things follow, and each was a wrong answer first:

- **localStorage, not `/api/settings`.** That row is tenant-scoped and readable
  by the whole workspace ([user-scoped settings](#user-scoped-settings)), so a
  flag stored there would turn the feature on for the very people it is being
  kept from. Per-browser is the grain the problem has.
- **The link is the feature; the panel is for undoing.** `?ff=` is modelled on
  `?lang=` ([i18n](#i18n)) down to the `replaceState` strip and its position in
  `main.tsx` — read before `createRouter`, because route guards consult flags in
  `beforeLoad`. One bookmark per feature, and they compose.
- **A production build does not contain it.** `DEV_TOOLS` is a build-time
  constant, so the reader folds to `{}`, the panel's `import()` becomes
  unreachable and its chunk is never emitted. Verified by grepping `dist/` both
  ways. This is what makes the promise real: in production, writing the
  localStorage key by hand does nothing. An unlisted URL is not a security
  boundary and is not asked to be one — the protection on staging is that seeing
  unfinished work requires deliberately switching it on.
- **Overrides announce themselves.** `OverrideMarker` sits above the assistant
  trigger (the CON-178 bottom-left corner is only empty in the content column —
  a viewport-fixed badge there lands on the sidebar's account row) whenever
  any flag is forced. Without it, an override left on weeks ago becomes a bug
  report nobody else can reproduce.

**Caveat worth knowing.** A flag hides UI, not data. Tasks writes its list into
the tenant settings row, so a teammate switching it on and creating tasks on
staging puts that data in the shared workspace — others just have no screen for
it. Same rule as always: a flag is not a permission.

**Where.** `config/flagOverrides.ts` (+ its test), the resolver in
`config/featureFlags.ts`, `devtools/FlagsPanel.tsx`, `devtools/OverrideMarker.tsx`,
`routes/flags.tsx`, the `VITE_DEV_TOOLS` build arg in the `Dockerfile`.

## A thread is the body, split {#thread-sequence}

**Decision.** On X and Threads, a `thread` post is written in the same single
Markdown editor as every other post type, and the chain it publishes as is
**derived from the body on every keystroke** — never stored, never edited
separately. A `---` divider is a break; with no divider in the body, blank lines
are; anything still past the platform's per-post ceiling is cut to fit. The only
thing stored beside the body is which post carries which file. Behind the
`thread-sequence` flag (CON-196).

**Why.** Zernio publishes a chain from `platformSpecificData.threadItems` on
both networks: "the first item is the root post and subsequent items become
replies in order", and "when `threadItems` is provided, the top-level `content`
field is used only for display and search purposes, it is **NOT** published"
(docs.zernio.com/platforms/threads, /platforms/twitter). Once that is the wire
format, every ceiling is per part of the chain — 280 characters on X, 500 on
Threads, four images or ten, one video — so the whole body measured against one
of them fails a thread that is fine and stays silent about the one post that is
not.

The first build answered that with a per-post editor: numbered rows, each its
own textarea and its own media, with `content` written back as a derived
summary. It worked and it was wrong. A thread is not a different kind of
document, it is a post that gets cut up on the way out, and turning the editor
into a list of inputs made it a different screen from every other post type for
a difference that belongs at the publish boundary. It also put the words in two
places — the items and the `content` written back from them — and a screen whose
two copies must be kept in step is a screen with a bug waiting in it.

Deriving the chain removes both problems and one more: **there is no "this post
is too long" state left.** A part past the ceiling is cut rather than reported,
so the app fixes the thing it used to complain about, and the preview shows
exactly where.

**What it is not.** It is not the blank-line splitting the X preview card has
always drawn, even though blank lines are still the fallback rule. That was a
guess about what the publisher would do, and the guess was wrong: nothing in the
Go repo has ever sent `threadItems`, so a `thread` post publishes as one post
with the whole body in it. The card's note said the publisher did the splitting;
it never did, and that sentence is gone.

**How.**

- **A divider is a real block, not a convention.** BlockNote parses `---` into
  a `divider` block and serialises it back as `***`, so the author sees the seam
  they typed as a line across the editor. That is why it is the primary rule:
  the split is visible in the document rather than inferred from whitespace.
- **Blank lines are the fallback, and only the fallback.** A body with a divider
  anywhere in it splits *only* at dividers, which is what makes multi-paragraph
  posts expressible. A body with none splits at blank lines, which is the
  convention the preview has always drawn and how people write threads.
- **The ceiling cuts what is left**, on the last sentence end that leaves the
  post reasonably full (`MIN_FILL`), else a line break, else a word. An unbroken
  token longer than the limit — a URL, a pasted key — is cut where the limit
  falls, because there is nowhere better.
- **`lib/threadSequence.ts` owns every rule**, pure and tested, and one
  `planThread` call produces the whole chain. The note under the editor, both
  preview cards and the pre-publish row read that one result, so the screen
  cannot disagree with itself about how many posts this is.
- **Attachments stay post-level rows.** `ThreadAssignment` maps an attachment id
  to a post index, so `post_attachments` needs no column and no migration. The
  rule that makes it safe: *a file with no entry rides the first post.* Uploading
  from the media card, from the assistant, or from an older client needs to know
  nothing about threads and the file still publishes — and it is what the X card
  always drew, where the lead post carries the media. An entry naming a post that
  no longer exists rides the last one, where the reader last saw it.
- **The assignment lives in the tenant key/value store** under
  `thread-sequence.<postId>` (`useThreadSequence`), the same stand-in
  `campaign-accounts` uses while waiting for its column, with the same limits:
  workspace-wide, whole-value writes, last write wins. Losing it is survivable
  by design — see the rule above.
- **The media card is where a file's post is chosen**, because it is where the
  files are. Each thumbnail carries one picker naming the post it rides; the
  card's total cap is dropped for a thread, since `policy.max` is what *one*
  post takes and a five-post thread holds five times it.
- **`content` is never rewritten.** The body is what the author typed, and
  everything downstream — the calendar, the posts table, search, the assistant —
  keeps reading exactly the field it already reads. This is the largest
  behavioural difference from the first build, and the reason the flag now
  changes nothing outside its own screen.
- **The post type is gated on its dictionary entry, not on the slug.**
  `PlatformPostType.flag` withholds *Threads'* `thread`, which is new. X's is
  untouched, because the app has always offered it and a flag may never change
  what happens when it is off.
- **While it is on, that flag also stands in for the publisher's vocabulary.**
  `buildPlatformView` intersects the dictionary with the slugs a publisher
  reports, and `supportedPlatforms` in the Go repo lists `thread` for `twitter`
  only — so the honest intersection hides the feature from the network it is
  named after until the server learns one word. `aheadOfPublishers` lets the
  flag answer in the slug's place: a publisher exists, so the type is allowed;
  it is connected, so it is available. Scoped to *flagged* types, so a slug the
  server genuinely withdraws still disappears from the app, and with the flag
  off the publisher is the whole answer exactly as before. The same trade every
  flagged feature here makes — the UI is reviewable before the endpoint answers
  — applied to a vocabulary rather than to a route.

**The consequence to hand the back end:** because the words live only in
`content`, the publisher has to cut it the same way before filling
`threadItems`, or what goes out is not what the author was shown. That is the
`src/lib/*` arrangement this repo already runs on — the Go rule is the source of
truth, ours mirrors it — and `splitBody`/`splitToLimit` are written to port,
with their tests as the specification.

**Waiting on** the back end: `SubmitRequest` (`publishers/zernio/posts.go`) has
no `platformSpecificData` at all, so nothing sends the chain yet; the same split
implemented server-side; a home for the media assignment; `thread` added to
Threads in `publishers/zernio/platforms.go`, which lists it for `twitter` only
— a *submit* blocker rather than a UI one, since the flag stands in for the
missing slug; and **attachment validation counted per item** — the server measures the files
against the post, so a thread spreading five images over three posts still comes
back "post has 5 image attachments; platform allows up to 4". We pass
`platform_validation` through as written, because until the publisher splits it
is *right*: a thread really does go out as one post with every file on it.

**Where.** `lib/threadSequence.ts` (+ test), `hooks/useThreadSequence.ts`,
`components/posts/sequence/ThreadSplitNote.tsx`, the `thread` branch in
`PostMediaCard`, the `sequence` branch in `lib/postValidation.ts`,
`TwitterPreview` / `ThreadsPreview` / `PostPreviewPanel`, and the
`thread-sequence` flag.

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
- **Content-Bank images have no thumbnail.** An image is a first-class asset now
  (CON-246): it uploads through the same endpoint as `.md` and `.pdf`, stores as
  `IMG`, and opens on its own screen — see [below](#asset-opening). What the
  server does not do yet is render a smaller copy, so the list's preview cell
  draws the full file scaled into 40px. `thumbnail_url` is already preferred
  everywhere it could appear, so the day that job exists nothing on the client
  changes. Also missing: the bridge that attaches a bank image to a post as a
  real `post_attachments` row, which is what the alt text is being collected
  for. AI image *generation* is planned but **secondary** (CON-105/88/83).
