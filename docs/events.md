# Events and notifications — what fires, and who hears it

One catalogue for both long-lived streams: every event and notification type,
what triggers it, which transport carries it, **who receives it**, and what this
client does when it arrives.

Written because the recipient question kept being answered per-type in three
places — the `activity` flag comment, [`sse.md`](./sse.md) and CON-285's FR8 —
and a fan-out rule you cannot see whole is a fan-out rule nobody can review.
This file is the whole. It is a **catalogue, not a design doc**: the reasoning
for a rule lives in [`activity.md`](./activity.md) and the flag comments, and
the wire detail lives in [`sse.md`](./sse.md).

Last reviewed 2026-09-18.

---

## The two transports are not interchangeable

| | `GET /api/events` | `GET /api/notifications/stream` + `GET /api/notifications` |
| --- | --- | --- |
| **What it is** | A cache-invalidation bus | An inbox |
| **Durability** | At-most-once, no log, `Last-Event-ID` ignored | The table is the log; the stream replays from `Last-Event-ID` |
| **Survives a closed tab** | No | Yes |
| **Addressed to** | The **tenant** — every open tab in the workspace gets every event it subscribed to | A **user** — one row per recipient, with its own read state |
| **Client action** | `invalidateQueries`; two types also toast | Renders a feed row and counts toward the unread badge |
| **If it is missed** | Nothing is lost — the recovery path is a refetch | The row is still there on next load |

So the same fact cannot be a topic on both, and the choice of transport *is* the
choice of who hears it. A cache hint goes on the first; something a person must
not miss goes on the second.

Since CON-285 spelled both vocabularies the same way, a few names now appear on
**both** streams — `assistant.completed` is a bus event *and* a notification
type. That is not a contradiction and not duplication to remove: the bus copy
says *every tab in this workspace should refetch that post*, and it is gone the
moment nobody is listening; the inbox copy says *the run you started finished*,
to one person, and it is still there next week. Same fact, two jobs. The client
handles them in two files that never meet — `lib/eventRouting.ts` and
`lib/notifications.ts`.

Both share only the machinery for staying open (`lib/streamConnection`:
backoff, silence watchdog, subscriber counting) and the one frame parser
(`lib/sse.ts`).

> **Closed defect, affecting both** (CON-286). `eventhub` capped a user at 10
> concurrent subscriptions across both streams and never reclaimed the slots,
> so ten leaks silenced both until the API restarted. ogen#142 made the cap
> self-healing — the oldest subscription is evicted at the limit, and every
> connection is recycled after ~30 minutes — and ogen#152 raised the cap to 30
> and announced each recycle with an `event: recycle` frame. Nothing in
> `lib/streamConnection` listens for that frame yet, so a recycle still runs
> the full reconnect path. See `docs/sse.md` for what remains.

---

## 1. `/api/events` — the invalidation bus

Tenant-scoped: the server filters by tenant, and the client subscribes with
`?topics=all` rather than narrowing per screen (no privacy gain — the server
already scoped it — and re-subscribing on every navigation would cost more than
it saves). Routing table: `lib/eventRouting.ts`.

**Recipients: every open tab in the workspace**, with one deliberate exception —
a run *this tab started* is muted by `lib/localRuns.ts`, because the POST stream
the caller is already rendering reports the same outcome, and a refetch over a
cache the running flow is still writing loses the newer copy.

| Topic | Type | Trigger | Client does |
| --- | --- | --- | --- |
| `entity:post:<id>` | `assistant.completed` / `assistant.failed` | A post-assistant run ends | Invalidate the post; muted for the tab that started it |
| | `assessment.completed` / `assessment.failed` | A quality assessment ends | Invalidate the post's quality; muted for the starting tab |
| | `post.cloned` | A post is duplicated | Invalidate the campaign's post list. The topic names the **clone**, not its source — `payload.sourcePostId` is the post it came from |
| | `post.restored` | A post version is restored | Invalidate the post |
| | `post.scheduled` | A post is scheduled | Invalidate the post and its campaign's list |
| | `post.analytics.updated` | The Zernio refresh sweep writes new figures for the post | Invalidate that post's analytics |
| `entity:campaign:<id>` | `assistant.completed` / `assistant.failed` | A campaign-assistant run ends | Invalidate the campaign; muted for the starting tab |
| | `content_plan.completed` / `content_plan.failed` | Content-plan generation ends | Invalidate the campaign's posts |
| `entity:zernio_account:<id>` | `zernio.account.attached` / `.updated` / `.revived` | A social account is connected or changes state | Invalidate the accounts list |
| | `zernio.account.attach_failed` | Connecting an account failed | **Toasts** — unexpected, actionable, invisible on whatever screen you are on |
| | `zernio.account.disconnected` | An account was disconnected | **Toasts**, same reason |
| `zernio:sync` | `zernio.sync.ok` | The per-tenant sync worker finishes a pass | Invalidate posts/accounts — **but only if the summary says something changed**. `upserts=0 soft_deletes=0` invalidates nothing; it fires on a timer for the whole tenant, so left ungated it would refetch in every open tab forever |
| | `zernio.sync.failed` | A sync pass failed | Invalidate; see also the planned `zernio.sync_failed` **notification** below — the two are different transports for the same fact, and only the notification survives a closed tab |

`job:<id>` and `user:<id>` are documented topic shapes. `user:<id>` is what the
notification service took for waking live streams; `job:<id>` still has no
publisher.

**Naming is settled: dotted, on both streams.** Nine bus types were snake_case
until CON-285 (ogen#161, 2026-09-17) renamed them — `assistant_completed` →
`assistant.completed`, `post_cloned` → `post.cloned`, and so on — so one
convention now spans the bus and the inbox and no future type has to guess. It
was a coordinated wire change with no compatibility window on either side: the
client matches these literally, and a drifted literal raises nothing and breaks
nothing on screen, it is an invalidation that silently stops happening.

The server's **persisted** taxonomies did not move: `post_logs.event_type` and
the `tenant_activity_events` rows (CON-125) keep `post_cloned` /
`post_restored` / `post_scheduled`, because renaming those would split
backfilled history across two spellings. So the wire name and the history name
differ on purpose for those three, and neither is wrong.

---

## 2. Notifications — the inbox

Durable rows, one per recipient, each with its own read state. Copy is rendered
by the client from `type` + `data` through the i18n catalogue, **not** from the
`title`/`body` the server composes — those are the fallback for a type this
build predates (`lib/notifications.ts`).

### The recipient rule (CON-285 FR8, plus the 2026-09-06 ruling)

Two classes, and they fan out differently:

- **Resolutions** — something a person started that finished without them.
  → **the initiator.** The client suppresses the *live* echo for the tab that
  started it (`lib/localRuns.ts`); the durable row remains for other devices and
  for a later return.
- **Exceptions** — something went wrong or now needs a person.
  → **workspace members with access to the subject.** No actor-suppression: an
  exception is not a routine echo of your own click.

**Decided 2026-09-06, shipped 2026-09-17:** a failed publish is workspace
business, not the author's private problem. `post.published` and
`post.publish_failed` now go out through `EmitToUsers` to every workspace
member (ogen#161), where they used to reach `post.CreatedBy` alone.

### Shipped (CON-242, completed by CON-285)

Every row below has a live producer *and* a catalogue key in
`lib/notifications.ts` — the two halves of supporting a type, and the reason
adding one is a coordinated change.

| Type | Class | Trigger | Recipients |
| --- | --- | --- | --- |
| `post.published` | Exception¹ | A post reaches `published` | **Workspace** |
| `post.publish_failed` | Exception | Zernio rejects, or the poll lands on `failed` | **Workspace** |
| `post.manual_publish_due` | Exception | An hourly sweep finds a post in `scheduled_for_manual_publishing` whose `scheduled_at` has passed. `dedupe_key = manual_publish:<post_id>`, so it fires once | **Workspace** |
| `asset.ready` | Resolution | A non-URL asset finishes processing | Initiator |
| `asset.ingest_failed` | Resolution | Asset processing failed | Initiator |
| `url_asset.crawled` | Resolution | A URL asset finishes crawling (CON-222) — branched off `asset.*` by kind so the copy can say *link* | Initiator |
| `url_asset.failed` | Resolution | The crawl failed | Initiator |
| `campaign.content_plan_ready` | Resolution | Content-plan generation succeeded | Initiator |
| `content_plan.failed` | Resolution | Its failure twin | Initiator |
| `assistant.completed` / `assistant.failed` | Resolution | A post- or campaign-assistant run ends. The campaign flow **skips the success** when the run generated a content plan — `campaign.content_plan_ready` already says that, better | Initiator |
| `assessment.completed` / `assessment.failed` | Resolution | A post quality assessment ends | Initiator |
| `connection.expiring_soon` | Exception | The expiry sweep finds a connection near its end | Owners (CON-219) |
| `connection.action_required` | Exception | A connection needs reauthorisation | Owners (CON-219) |

Nearly all of these carry a `dedupe_key` — usually `<type>:<entity id>`, but
`manual_publish:<post_id>` and `conn:<account id>:<stage>` for the two that
predate the convention — which collapses repeats **while the previous row is
still unread**, so an iterating edit session leaves one row per outcome rather
than forty (FR7). `campaign.content_plan_ready` is the one without: generating
a plan is rare and deliberate, and two of them are two facts.

¹ `post.published` is filed as an exception by its `post.*` prefix, which is
exactly why it is contentious: it is the highest-volume *success* in the
product, and workspace fan-out multiplies it by the member count. **Decided
2026-09-06: keep it.** A system that is silent when scheduling works cannot be
trusted to be loud when it doesn't — the silence is indistinguishable from a
broken scheduler. The volume problem is real and belongs to notification
preferences and digests (CON-242 §12), not to dropping the event.

### Named, with nothing to raise them

Three types survived CON-285 unimplemented, and each for the same kind of
reason: the trigger or the recipient does not exist. They are listed so nobody
re-derives them, **not** as work queued up — and deliberately absent from
`lib/notifications.ts`, because copy written ahead of a producer is copy nobody
can read.

| Type | Why not | What would change it |
| --- | --- | --- |
| `video.probed` / `video.probe_failed` | There is no `AssetTypeVideo`. A video is attachment metadata from an external service, with no async event surface to end | CON-148, if video ever becomes an asset kind |
| `post.not_published` | Nothing in the server transitions a post into `not_published` | A publisher that gives up on a window rather than failing |
| `zernio.sync_failed` | The only sync failure is a global, tenant-less `list_accounts` call: no tenant, so no recipient. The bus's `zernio.sync.failed` is not affected — it is tenant-scoped and fires today | A per-tenant sync pass, or an operator surface instead of an inbox |

Every key in either table is **API surface**: adding one is a coordinated
change, because the client renders its copy from the catalogue and a type with
no entry falls back to the server's English — correct, and untranslated.

---

## 3. What deliberately produces nothing

- **Approaching publish dates.** A future date is a *level*, not news; if every
  scheduled post pinged on approach the feed would be a calendar with worse
  ergonomics. Only the cases where a person must act survive —
  `post.manual_publish_due`, and eventually a post due within the hour that
  fails its channel validation (blocked on a publish-verdict surface that does
  not exist; ask #1 in [`attention-rules.md`](./attention-rules.md)).
  Auto-publish approach is not news; its result is.
- **Teammate edits.** There is **no `updated_by` column anywhere** —
  `updated_at` records when, never who. *"Ana edited your post"* is not
  expressible at any price without backend work. `created_by` exists on Post,
  Campaign, Asset and Attachment, so authorship lands in the daily report
  instead. Open question X2.
- **Everything else routine** goes to the **daily report** rather than the feed
  — deterministic counts for a local day, recomputed from live data, never
  stored and never AI-written. The endpoints are `GET /api/activity/report/:date`
  and `GET /api/activity/reports`, both requiring an IANA `tz`, and both
  **landed 2026-09-17** (ogen#161). The client reads them as of 2026-09-18
  (`services/api/activity.ts`, shapes pinned by its test); it had been built
  against CON-225's client-side computation, which CON-285 reversed. What is
  still owed is rule 4's round trip — the counts read across a real local
  midnight — not the wiring.

---

## Keeping this current

A new producer changes three things at once: a type in the tables above, a copy
entry in `src/i18n/resources/en.ts` (and every other catalogue), and a routing
decision in `lib/eventRouting.ts` or `lib/notifications.ts`. Add the row here in
the same change — a catalogue that lags the code is worse than none, because it
is the thing people check instead of reading the producer.
