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

Last reviewed 2026-09-06.

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

Both share only the machinery for staying open (`lib/streamConnection`:
backoff, silence watchdog, subscriber counting) and the one frame parser
(`lib/sse.ts`).

> **Both are closed by the server every 30 minutes** to reclaim their slot, and
> say so first — `event: recycle`, deliberately without an `id:` line. That is a
> handover rather than a drop: `lib/streamConnection` reconnects on the spot and
> the status holds at `open`. The per-user cap is **30** across both streams and
> every device. Was CON-286, where it was a leak that killed both streams for a
> user permanently; fixed 2026-09-08 and 2026-09-14, recorded in
> [`sse.md`](./sse.md).

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
| `entity:post:<id>` | `assistant_completed` / `assistant_failed` | A post-assistant run ends | Invalidate the post; muted for the tab that started it |
| | `assessment_completed` / `assessment_failed` | A quality assessment ends | Invalidate the post's quality; muted for the starting tab |
| | `post_cloned` | A post is duplicated | Invalidate the campaign's post list |
| | `post_restored` | A post version is restored | Invalidate the post |
| | `post_scheduled` | A post is scheduled | Invalidate the post and its campaign's list |
| | `post.analytics.updated` | The Zernio refresh sweep writes new figures for the post | Invalidate that post's analytics |
| `entity:campaign:<id>` | `assistant_completed` / `assistant_failed` | A campaign-assistant run ends | Invalidate the campaign; muted for the starting tab |
| | `content_plan_completed` / `content_plan_failed` | Content-plan generation ends | Invalidate the campaign's posts |
| `entity:zernio_account:<id>` | `zernio.account.attached` / `.updated` / `.revived` | A social account is connected or changes state | Invalidate the accounts list |
| | `zernio.account.attach_failed` | Connecting an account failed | **Toasts** — unexpected, actionable, invisible on whatever screen you are on |
| | `zernio.account.disconnected` | An account was disconnected | **Toasts**, same reason |
| `zernio:sync` | `zernio.sync.ok` | The per-tenant sync worker finishes a pass | Invalidate posts/accounts — **but only if the summary says something changed**. `upserts=0 soft_deletes=0` invalidates nothing; it fires on a timer for the whole tenant, so left ungated it would refetch in every open tab forever |
| | `zernio.sync.failed` | A sync pass failed | Invalidate; see also the planned `zernio.sync_failed` **notification** below — the two are different transports for the same fact, and only the notification survives a closed tab |

`job:<id>` and `user:<id>` are documented topic shapes. `user:<id>` is what the
notification service took for waking live streams; `job:<id>` still has no
publisher.

**Naming is mixed** — dotted (`zernio.sync.ok`, `post.analytics.updated`) and
snake_case (`post_cloned`, `assistant_completed`), matched literally in
`eventRouting.ts`. The notification vocabulary settled on dotted, so the hub is
the odd one out. Open question X1.

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

**Decided 2026-09-06:** a failed publish is workspace business, not the author's
private problem — `post.publish_failed` fans out to the workspace, as FR8 says
and as the Phase 1 derived entry it replaces already did. The shipped producers
emit to `post.CreatedBy` only, so this is decided-and-unimplemented, tracked on
CON-285.

### Shipped today (CON-242)

| Type | Class | Trigger | Recipients — shipped | Recipients — decided |
| --- | --- | --- | --- | --- |
| `post.published` | Exception¹ | A post reaches `published` | `post.CreatedBy` | **Workspace** |
| `post.publish_failed` | Exception | Zernio rejects, or the poll lands on `failed` | `post.CreatedBy` | **Workspace** |
| `asset.ready` | Resolution | An asset finishes processing | Initiator | Initiator ✓ |
| `asset.ingest_failed` | Resolution | Asset processing failed | Initiator | Initiator ✓ |
| `campaign.content_plan_ready` | Resolution | Content-plan generation succeeded | Initiator | Initiator ✓ |
| `connection.expiring_soon` | Exception | The expiry sweep finds a connection near its end | Owners (CON-219) | Owners ✓ |
| `connection.action_required` | Exception | A connection needs reauthorisation | Owners (CON-219) | Owners ✓ |

¹ `post.published` is filed as an exception by its `post.*` prefix, which is
exactly why it is contentious: it is the highest-volume *success* in the
product, and workspace fan-out multiplies it by the member count. **Decided
2026-09-06: keep it.** A system that is silent when scheduling works cannot be
trusted to be loud when it doesn't — the silence is indistinguishable from a
broken scheduler. The volume problem is real and belongs to notification
preferences and digests (CON-242 §12), not to dropping the event.

### Planned (CON-285, not yet emitted)

| Type | Class | Trigger | Recipients |
| --- | --- | --- | --- |
| `assistant.completed` / `assistant.failed` | Resolution | A post- or campaign-assistant run ends | Initiator |
| `content_plan.failed` | Resolution | The failure twin of `campaign.content_plan_ready` | Initiator |
| `assessment.completed` / `assessment.failed` | Resolution | A post quality assessment ends | Initiator |
| `url_asset.crawled` / `url_asset.failed` | Resolution | A URL asset finishes crawling (CON-222) — branched off `asset.*` by kind so the copy can differ | Initiator |
| `video.probed` / `video.probe_failed` | Resolution | A video probe ends (CON-148) — same branch | Initiator |
| `post.not_published` | Exception | The poll lands on the `not_published` terminal state | Workspace |
| `post.manual_publish_due` | Exception | **Net-new sweep**: a post in `scheduled_for_manual_publishing` whose `scheduled_at` has passed. Hourly River job, `dedupe_key = manual_publish:<post_id>` so it fires once | Workspace |
| `zernio.sync_failed` | Exception | A sync pass failed — the durable twin of the bus's `zernio.sync.failed` | Workspace |

Every key here is **API surface**: adding one is a coordinated change, because
the client renders its copy from the catalogue and a type with no entry falls
back to the server's English.

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
  and `GET /api/activity/reports`, both requiring an IANA `tz`; neither exists
  yet (CON-285). The client half is built and waiting behind the `activity`
  flag.

---

## Keeping this current

A new producer changes three things at once: a type in the tables above, a copy
entry in `src/i18n/resources/en.ts` (and every other catalogue), and a routing
decision in `lib/eventRouting.ts` or `lib/notifications.ts`. Add the row here in
the same change — a catalogue that lags the code is worse than none, because it
is the thing people check instead of reading the producer.
