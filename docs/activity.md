# Activity — proposal

The design behind **Activity**, the workspace's answer to *"what happened since
I last looked?"* Requirements live in
[CON-225](https://linear.app/ogen/issue/CON-225) (this repo) and
[CON-242](https://linear.app/ogen/issue/CON-242) (the backend subsystem it
consumes — it superseded CON-224, which is archived); this file is the
reasoning — what the surface is for, what it
deliberately is not, and which decisions are load-bearing enough that changing
one means revisiting the rest.

**What exists today:** Phase 2, behind the `activity` flag. The sidebar item
with its count, `/activity`, the day cards and the full-screen report at
`/activity/$date` are built; the feed reads the recorded notifications CON-242
landed (`GET /api/notifications`, live over
`GET /api/notifications/stream`), and the day reports are still computed from
the batched campaign summaries. `lib/activityFeed.ts` is the whole rule set,
pure and tested. What is left before the flag can flip is in the flag's own
comment — it is about coverage on the *server* side, not about this screen.

**Tasks are a separate feature** (CON-234, [`tasks.md`](./tasks.md)), a module
of their own next door in the rail rather than a card on this screen. "Edges and
levels" below is the distinction the two rest on, and it is the reason this one
ships with read and unread as its only verbs.

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
instantly**. A client that was offline catches up over REST. The hub reserved `user:<id>` as a documented
topic shape with no publisher; CON-242 took that seat — the notification service
publishes to `notification:user:<uid>` purely to wake live connections, and
durability comes from the table either way.

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
- **The counter is the inbox's own unread count**, `GET
  /api/notifications/unread-count`. A "7" means seven things happened that you
  have not seen — never "you published seven posts". Only recorded rows can be
  unread: a day report is arithmetic and a task entry belongs to the module next
  door, so neither carries a dot, and Phase 1's "the report counts as one until
  opened" went with the timestamp it was built on.
- **The count is one small request, and never the page.** It spans the whole
  inbox where the feed holds only the newest hundred rows, so it cannot be a
  length — and the sidebar is on every screen, which is why it does not pull the
  rows down with it. Between refetches it is nudged by the stream and by the
  reads themselves rather than re-asked per change.

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

**Phase 1 needed no backend.** Sidebar item, `/activity`, computed daily
reports, the full-screen report view, with the feed's own entries *derived* from
current post state and unread kept as a last-seen timestamp under
`userScopedKey('activity')`.

**Phase 2 is the live feed**, and it landed with CON-242. Recorded entries
replaced the derived ones, read state is per row and server-side, and the
Phase 1 timestamp is deleted — so is `unreadCount`/`isUnread`, and so are the
derived `failed` / `not_published` feed entries, which were a stand-in for
`post.publish_failed`. Keeping both would have reported one failure twice: once
as a record, once as a re-reading of current state that disappears the moment
the post is edited.

Two consequences worth stating rather than discovering:

- **The feed starts empty.** Nothing was recorded before the table existed, so
  the entries only go back as far as CON-242's deploy. The reports do not — they
  are computed from posts and reach as far back as the posts do.
- **A recorded row has one recipient.** The producers write to the thing's
  `created_by`, so a post failing is news to whoever made it and to nobody else,
  where the derived entry was visible to the whole workspace. That is a fan-out
  question for the back end, not something to paper over here; it is written up
  in the `activity` flag's comment.

Both phases sit behind one flag in `config/featureFlags.ts`; Phase 1 can flip on
without Phase 2. **Tasks are a separate feature with a separate flag** (CON-234,
[`tasks.md`](./tasks.md)) on its own timetable: they are stored rather than
derived, so they wait on a table rather than on CON-242, and either can ship
without the other.

## Open dependencies

- ~~**A disconnecting SSE client panics the API process**~~ — closed
  2026-09-05. Finding 5 in [`sse.md`](./sse.md) was fixed under CON-158 by
  detaching a logging context before the writer goroutine starts, and
  `handlers/notifications.go` was written to that pattern from the first commit,
  so the second stream never shared the fault. Neither is blocked on it now.
- **The copy still arrives as prose.** CON-242 sends a server-rendered `title`
  and `body` alongside `type` and `data`, rather than the type-plus-vars this
  document asked for. The client renders from `type` and `data` where it knows
  the type and falls back to the server's English where it doesn't
  (`lib/notifications.ts`), which is the honest shape of the compromise: a
  producer can ship before its copy does, and its rows are untranslatable until
  a key is added.
- **Event naming is still mixed** — dotted (`zernio.sync.ok`) and snake_case
  (`post_cloned`), matched literally in `lib/eventRouting.ts`. The notification
  vocabulary settled on dotted (`post.publish_failed`), so the hub is now the
  odd one out.
