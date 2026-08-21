# Activity — proposal

The design behind **Activity**, the workspace's answer to *"what happened since
I last looked?"* Requirements live in
[CON-225](https://linear.app/ogen/issue/CON-225) (this repo) and
[CON-224](https://linear.app/ogen/issue/CON-224) (the backend subsystem it
consumes); this file is the reasoning — what the surface is for, what it
deliberately is not, and which decisions are load-bearing enough that changing
one means revisiting the rest.

**What exists today:** Phase 1, behind the `activity` flag. The sidebar item
with its counts, `/activity`, the day cards and the full-screen report at
`/activity/$date` are built and derive everything from the batched campaign
summaries — `lib/activityFeed.ts` is the whole rule set, pure and tested. The
live feed is Phase 2 and waits on CON-224; until then the only post entries a
reader sees are outcomes and the daily reports, and they are *derived* rather
than recorded, which the flag's own comment spells out.

**Tasks are a separate feature** (CON-234), a module of their own next door in
the rail rather than a card on this screen. "Edges and levels" below is the
distinction the two rest on, and it is the reason this one ships with read and
unread as its only verbs.

## The gap

A lot happens without the user watching. Posts publish on schedule. Tokens
lapse. Assistant turns, content-plan generation, quality assessment and asset
processing finish minutes after the tab that started them was closed. None of it
is visible anywhere afterwards.

Four surfaces already exist and each answers a different question:

| Surface | Answers | Persists? |
| --- | --- | --- |
| Toasts (`stores/toastStore`) | *this just happened, while you watched* | no — gone in 5s |
| Attention rail (`lib/campaignReadiness`) | *what does this campaign need from me?* | no — derived from current state |
| Email (CON-219) | *act on this while you're away* | in the inbox; owners only, one type |
| `/api/events` SSE | *your cache is stale* | no — at-most-once, no log |

The missing one is the log: **what occurred, in time order, across the
workspace.** [`sse.md`](./sse.md) closes on exactly this — *"A run that outlives
the tab has no UI… Telling the user 'this finished while you were away' is the
next visible feature."*

## Edges and levels

The single idea the whole design rests on.

> **An edge is a fact with a timestamp that stays true forever. A level is a
> condition that stops being true when it is fixed.**

|  | Level | Edge |
| --- | --- | --- |
| Reads | *"LinkedIn's connection expires in 4 days"* | *"LinkedIn's connection expired — Aug 18, 09:14"* |
| Tomorrow | *"…in 3 days"* — it rewrites itself | unchanged, forever |
| You fix it | disappears | stays, now history |
| Two of them | one row: *"2 connections expire soon"* | two entries, at two times |
| Built from | a pure function over current data | a persisted record |
| Lives in | the attention rail → **tasks**, later | **Activity** |

The test for any candidate entry: **write the sentence with a timestamp on it.
Does it still read correctly a week later?** *"Your post failed to publish at
09:00"* — yes. *"3 posts need scheduling — Aug 18"* — no, that is a snapshot of
a list that has since changed.

One condition legitimately appears in both places saying different things. The
rail says *fix this*; Activity says *this is when it broke*. That is not
duplication, and it is why `account-expiring` stays in
[`attention-rules.md`](./attention-rules.md) after Activity exists.

Getting this wrong produces the failure everyone recognises: a notification list
with stale items you cannot clear because the underlying problem is still there,
sitting next to real history.

### What the distinction fixes here: read/unread and nothing else

Level-type items are what the system will raise **tasks** from later (CON-234),
and `attention-rules.md` is already most of a task-generator spec — every rule
has an id, a severity, an aggregation rule, and rule 5: *exactly one
destination, or it is two rules*. That last property is precisely what a task
needs and a notification does not. The rail is not something a task system
replaces; it is the catalogue it grows out of.

Which fixes a concrete decision in this feature:

**The feed ships with read/unread and nothing else.** No dismiss, no resolve,
no snooze, no per-entry "mark handled". Every one of those is a task verb, and
putting them on notifications teaches users that clearing a notification fixes
something, which it never does. They would all have to be taken back when tasks
land, and the seam to tasks stays clean without them: a task appearing is itself
an edge, so it becomes a feed entry and nothing built here is rewritten.

## Why this cannot be built on the event hub

`/api/events` already broadcasts most of the interesting facts, which makes it
look like the foundation. It is not, and the reasons are in its own docs and
measured in [`sse.md`](./sse.md):

- delivery is **at-most-once**,
- the server holds **no event log**,
- `Last-Event-ID` is accepted and **ignored**,
- the hub **deliberately disconnects slow subscribers** as backpressure.

Every one is correct for a cache-invalidation bus and disqualifying for a
notification. The premise of the feature is *you were not looking* — anything
delivered only over the stream is lost for exactly the users it is meant for.

So the table is the source of truth and **SSE only makes an entry appear
instantly**. A client that was offline catches up over REST. The hub already
reserves `user:<id>` as a documented topic shape with no publisher; that is the
seat this takes.

## What the feed carries

Two classes, and only two.

**Resolutions** — something a person started that finished without them:
assistant turns, content-plan generation, quality assessment, asset processing,
URL-asset crawls, video probes. These do **not** wait for the daily report even
though most are successes: they are the thing the user is waiting on. Learning
tomorrow that your content plan finished defeats the point.

**Exceptions** — something went wrong or now needs a person: publish failed,
never published, manual-publish due, connection expired or expiring, sync
failed.

Everything else routine goes to the report.

Two exclusions worth recording, because both look like obvious inclusions:

**Approaching publish dates.** A future date is a level, and if every scheduled
post pings on approach the feed becomes a calendar with worse ergonomics. Only
the cases where a *person* must act survive — a manual-publish post coming due,
and eventually a post due within the hour that fails its channel's validation
(blocked on the per-post publish verdict, ask #1 in `attention-rules.md`).
Auto-publish approach is not news; its result is.

**Live teammate activity.** There is **no `updated_by` column anywhere in the
schema** — `updated_at` records when, never who. *"Ana edited your post"* is not
expressible at any price without backend work. `created_by` does exist on Post,
Campaign, Asset and Attachment, so authorship lands in the report instead, which
is the better home for it anyway.

## The report

Successful auto-publishing is the highest-volume thing that happens and the
lowest-value thing to list. A workspace posting three times a day across five
channels generates fifteen "it worked" entries daily, which trains people to
ignore the badge — the one outcome that makes the whole feature worthless.

So routine success rolls into **one computed entry per day**, opening as a
full-screen report.

**Always computed, never written.** Deterministic counts: *"6 posts published: 3
LinkedIn, 2 Instagram, 1 X. 4 created by Ana. 1 failed."* Always correct, always
instant, no running cost. If an AI narrative is ever wanted it sits on top of
these numbers rather than replacing them.

### It needs no backend

`useCampaignSummaries` already returns, in one batched request the Campaigns
list makes anyway, every post in the workspace with `status`, `published_at`,
`scheduled_at`, `created_at`, `updated_at` and `platform_id`. The report is a
**pure function over data already fetched** — the same shape
`campaignReadiness` has, and it belongs in `src/lib/` on the same terms: pure,
`now` injected, no fetching inside it, unit-tested for the populated and the
empty day.

Two consequences:

- Any historical day is available as long as its posts are, and the report can
  never drift from the data. Better than a stored digest, not worse.
- **The day boundary is the client's local one.** There is no timezone to hand
  the server — the same reason the clock-dependent readiness rules stayed
  client-side ([`technical-decisions.md#batched-summaries`](./technical-decisions.md#batched-summaries)).

What it cannot reach until the backend widens: *why* a post failed (no error
text in the projection), asset-processing and AI-run history (nothing persists
them), and workspace-wide authorship (`created_by` is not in `PostSummary` — one
field). So v1 is honestly a **publishing report** that widens later.

### The boundary with Analytics

Campaigns already have an Analytics sub-item. **Analytics answers *how did it
perform*** — reach, engagement, numbers from the platforms. **The report answers
*what happened*** — published, created, failed. These blur fast, so the line is
worth naming before it is crossed: if the report starts carrying engagement
numbers, it should become part of Analytics instead of growing into a second,
cruder one.

## Placement

**First item in the sidebar's Modules section**, above Campaigns, with an
unread counter.

Not the top-right, and not the right rail. The corner contract (CON-178)
reserves top-right for *views only* — things that switch a representation of the
object on screen — and the right rail is panel-scoped per screen with the
assistant as its floor ([`technical-decisions.md#panel-memory`](./technical-decisions.md#panel-memory)).
Activity is global and cross-object, so it belongs where the other global
destinations are.

Three details that follow from the sidebar being what it is:

- **Collapsed, the count is a dot.** There is no room for a number beside a 20px
  icon, and the collapsed rail is label-free by design.
- **The counter counts unread entries**, with the day's report counting as one
  until opened. A "7" means seven things happened that you have not seen — never
  "you published seven posts". Informational entries appear in the list without
  raising it.
- **The count never costs its own request.** It rides on the list response and
  is bumped live by SSE.

The report opens as a **route-backed** full-screen modal (`/activity/$date`), so
a day can be linked and shared. A plain overlay forecloses that, and for a daily
report that seems like most of the point. The feed stays mounted underneath it,
so closing the report puts the reader back where they were rather than
refetching the page they came from.

## Copy comes from the catalogue, not the wire

Every user-facing string in this app is a catalogue entry. A title the server
composed can never be translated, never be restyled, and never be re-worded
without a deploy on both sides.

So the API sends a **type plus structured vars** — `type:
"post.publish_failed"`, `vars: {platform, post_title, reason_code}` — and the
client renders through `t()`. `vars` carries data, not prose: ids, names,
counts, enum codes. A `reason_code` is fine; a `reason` sentence is not.

This is cheap to specify now and a migration later, which is why it is the first
thing in the backend issue rather than a footnote.

## Phasing

**Phase 1 needs no backend.** Sidebar item, `/activity`, computed daily reports,
the full-screen report view. The feed contains report entries only. Unread state
is a last-seen timestamp under `userScopedKey('activity')`, so it follows the
user between devices rather than marking everything unread on the second machine
(precedent: the posts-table sort order,
[`technical-decisions.md#user-scoped-settings`](./technical-decisions.md#user-scoped-settings)) —
it is a date, nothing sensitive.

**Phase 2 is the live feed**, once CON-224 lands. Real entries join the reports,
read state moves server-side per entry, and the Phase 1 timestamp is deleted.

Both phases sit behind one flag in `config/featureFlags.ts`; Phase 1 can flip on
without Phase 2. **Tasks are a separate feature with a separate flag** (CON-234)
on its own timetable: they are stored rather than derived, so they wait on a
table rather than on CON-224, and either can ship without the other.

## Open dependencies

- **A disconnecting SSE client panics the API process** — `events.go:154`,
  finding 5 in [`sse.md`](./sse.md), recorded 2026-08-03. The live half cannot
  deploy until it is fixed. Phase 1 does not touch SSE.
- **Event naming is still mixed** — dotted (`zernio.sync.ok`) and snake_case
  (`post_cloned`), matched literally in `lib/eventRouting.ts`. Worth settling
  before a whole notification-type vocabulary is minted on top of it.
