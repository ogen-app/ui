# Server-Sent Events in the UI

What this front end consumes from the API's SSE surface, what it doesn't, and
what has to exist before it can. Written for CON-134; the backend inventory it
is checked against is Serhii's 2026-07-30 survey on that ticket.

Verified against the local API on 2026-08-03 by opening the streams from the
browser and timing what arrived, then checked against `ogen` `origin/main`
(`a2e1435`). Where a claim here is measured rather than read off the code, it
says so.

> **The backend crash that blocked this is fixed** (CON-158). Finding 5 — a
> client disconnecting from `/api/events` panicking the API process — was
> repaired on `ogen` `main` by detaching a logging context before the writer
> goroutine starts, and re-checked on 2026-09-05. The notification stream added
> for CON-242 was written to the repaired pattern, so it never carried the bug.
> Finding 5 at the bottom of this file keeps the diagnosis, because the shape of
> the mistake is easy to make again.

## What the UI consumes today

Six streams. Four are **per-request POST flows** — the request opens a stream,
the stream ends when the work does: 

| Endpoint | Consumer | Events handled |
| --- | --- | --- |
| `POST /api/posts/:id/assistant` | `services/api/assistant.ts` | `content_delta`, `explanation_delta`, `tool_call`, `tool_result`, `complete`, `error` |
| `POST /api/campaigns/:id/assistant` | `services/api/assistant.ts` | same, plus campaign actions |
| `POST /api/posts/:id/assess` | `services/api/quality.ts` | `step`, `complete`, `error` |
| `POST /api/campaigns/:id/generate-draft` | `services/api/contentPlan.ts` | `step`, `post`, `warning`, `complete`, `error` |

The other two are long-lived and carry things the tab did not itself start:

| Endpoint | Consumer | Guarantee |
| --- | --- | --- |
| `GET /api/events` | `stores/eventStreamStore` | at-most-once, no log — a hint that a cache is stale |
| `GET /api/notifications/stream` | `stores/notificationStreamStore` | durable; the table is the log and `Last-Event-ID` replays from it |

The second landed with CON-242 and is the answer to the last item under *Still
open* below: a run that outlives the tab now leaves a record, so "this finished
while you were away" is a row rather than a silent invalidation. The two are
deliberately separate connections — one is an invalidation bus and the other is
an inbox, and the guarantees above are why neither can be a topic on the other.
What they share is the machinery for staying open (`lib/streamConnection`:
backoff, silence watchdog, subscriber counting), written once.

`EventSource` is not used anywhere and can't be: it is GET-only, can't carry a
JSON body, and can't set `X-Workspace-Id` — so all six read the wire format off
a `fetch` response body.

## What it does not consume

- `POST /api/campaigns/:id/enrich-brief`
- `POST /api/campaigns/:id/consistency-check`
- `POST /api/campaigns/:id/assistant/history/:id`
- `POST /api/campaigns/:id/undo`

Four of the six campaign flows stream server-side with no caller here.
`streamDraftPlan` has a client but no caller either — the content-plan UI that
would use it isn't built yet.

## `/api/events`, as measured

`topics` is **required** — without it the endpoint answers `400`:

```
{"error":"topics query param is required (e.g. ?topics=all or ?topics=job:*,entity:post:abc)"}
```

Filter grammar (`src/eventhub/topic.go`): `all`, exact `kind:id`, or prefix
`kind:*` where the `*` is the last segment. Observed namespaces: `zernio:sync`,
and per the error message `job:*` and `entity:post:<id>`.

With `?topics=all` the stream behaves correctly:

- `200`, `content-type: text/event-stream`, `cache-control: no-cache`,
  `x-accel-buffering: no`
- `: ping` heartbeat at 29ms and again at 20.0s — **the 20s heartbeat is real**
- Delivery is **progressive**, not buffered to the end: a real event landed at
  7.5s between two heartbeats

A frame looks like this:

```
id: 
event: zernio.sync.ok
data: {"id":"","topic":"zernio:sync","type":"zernio.sync.ok",
       "payload":{"summary":"upserts=1 soft_deletes=0"},
       "created_at":"2026-08-03T19:27:29.754683178Z"}
```

Note the envelope repeats the event name in `type` and carries `topic`,
`payload` and `created_at`.

## The event catalogue

From `origin/main`. Every publisher and every type:

| Topic | Types |
| --- | --- |
| `entity:post:<id>` | `assistant_completed`, `assistant_failed`, `assessment_completed`, `assessment_failed`, `post_cloned`, `post_restored`, `post_scheduled`, `post.analytics.updated` |
| `entity:campaign:<id>` | `assistant_completed`, `assistant_failed`, `content_plan_completed`, `content_plan_failed` |
| `entity:zernio_account:<id>` | `zernio.account.attached`, `zernio.account.attach_failed`, `zernio.account.updated`, `zernio.account.disconnected`, `zernio.account.revived` |
| `zernio:sync` | `zernio.sync.ok`, `zernio.sync.failed` |

`job:<id>` and `user:<id>` are documented topic shapes with no publisher yet.

Two naming conventions are in play — dotted (`zernio.sync.ok`,
`post.analytics.updated`) and snake_case (`post_cloned`,
`assistant_completed`). Worth settling before the UI hard-codes strings
against both.

## Findings

**1. Replay is not on the table, by design.** The endpoint's own docs are
explicit: delivery is *at-most-once*, the server holds *no event log*, and the
`Last-Event-ID` request header is **accepted and ignored**, reserved for future
replay. So a UI consumer must not be built around resumption. The documented
contract is: **reconnect, then reconcile via REST.** That makes cache
invalidation the recovery path, not event replay.

The empty `id:` I measured is real but narrower than it looks: the two zernio
worker publish sites (`publishAccountEvent`, `publishSyncEvent`) build their
event without an `ID`, while every other publisher mints one with
`models.NewID()`. The writer always prints `id: %s`, so those two produce a
blank line. Cosmetic today given replay is off; worth a one-line backend fix
before ids ever start meaning something.

**2. Nothing here can survive a disconnect.** There is no reconnect or backoff
logic in the repo. For the POST flows that is defensible: a dropped stream is a
failed request and the user retries. For `/api/events` it is disqualifying,
because the hub **deliberately disconnects slow subscribers** as its
backpressure strategy — the docs say in as many words that the client should
reconnect and reconcile. A reconnect loop is not polish on this feature; it is
the feature.

**3. There were two SSE parsers, and they disagreed.** `lib/sse.ts` (assistant,
quality) and `createSSEParser` in `services/api/contentPlan.ts` had been written
separately. **Fixed** — `lib/sse.ts` is now the only one, and the differences
below are its test cases:

- `contentPlan` trims `data:` values; `lib/sse.ts` doesn't. Harmless for JSON,
  wrong for any raw-text delta.
- `lib/sse.ts` drops frames with no `event:` line; the spec defaults those to
  `message`, which is what `contentPlan` does.
- `contentPlan` drops frames with no `data:` line, so an event-only frame is
  lost there.
- `lib/sse.ts` matches `"event: "` **with the space**. The server always emits
  one, so this works, but it breaks on a spec-legal `event:x`.
- Neither reads `id:` or `retry:`.

Both handled the `: ping` heartbeat correctly, one deliberately and one by
accident. None of the four disagreements was visible against today's backend,
which is exactly why they had survived.

**4. The one-flush note in `lib/sse.ts` is about the AI flows, not this
stream.** That comment records the backend delivering a whole turn in a single
flush at the end (first byte ~58s). `/api/events` is measured above as
genuinely progressive, so the note should not be read as applying to it. The
AI-flow timing was **not** re-measured for CON-134 and may well be stale.

**5. A disconnecting client crashes the API — fixed, see the note at the end of
this finding.** Found by running the consumer below against the local stack: the
process died four times, each time with the same panic.

```
panic: runtime error: invalid memory address or nil pointer dereference
fasthttp.(*RequestCtx).UserValue(...)
logging.RequestIDFrom(...)
handlers.(*EventsHandler).Stream.func1 — src/handlers/events.go:154
```

`origin/main` `src/handlers/events.go:154`, inside the `SetBodyStreamWriter`
goroutine:

```go
slog.ErrorContext(c.Context(), "sse write failed", ...)
```

fasthttp releases the `RequestCtx` when the handler returns, so reading a value
off it from the writer goroutine dereferences freed memory. The comment three
lines above the block says exactly this — *"the fiber ctx is cancelled the
moment this handler returns, so the writer goroutine must not depend on it"* —
and captures `sessionID` into a local for that reason; the logging call added
later reaches past it. Line 165's `slog.InfoContext(c.Context(), …)` is the same
bug on the session-expiry path.

It fires on the *error* path, which is why the read-only probes in this document
never hit it and a reconnecting consumer hits it constantly: every client
disconnect is a failed write. A Go panic in a goroutine takes the whole process
down, so **any authenticated client can kill the API by opening `/api/events`
and closing the tab.**

The fix is to log the captured `sessionID` without the request context —
`slog.Error(...)`, or a context built before the handler returns. Backend
change; nothing the UI can work around.

**Fixed, and the fix is worth reading.** `ogen` `main` now builds the logging
context *before* the handler returns and hands the goroutine that instead:
`reqID, _ := logging.RequestIDFrom(c.Context())` on the handler side, then
`logCtx := logging.WithRequestID(context.Background(), reqID)` carrying the user
and tenant, and every `slog.*Context` inside the writer takes `logCtx`. So the
writer-side logs still correlate with the request and nothing reaches the
recycled `RequestCtx`. The comment above it names CON-158 and spells out why —
the panic lands on a goroutine Fiber's recover middleware cannot see, which is
what turned a logging slip into a process kill.

**The notification stream never had it.** `src/handlers/notifications.go`
(CON-242) was written to the repaired pattern: it detaches both a `logCtx` and a
`queryCtx` before `SetBodyStreamWriter`, and the last `c.Context()` in the file
is the call that installs the writer. Checked against `main` on 2026-09-05 by
reading both handlers. This answers the question the `activity` flag comment
recorded as open — the second long-lived stream neither shares the fault nor
needs its own fix.

## What was built

All of it lives behind one mounted hook and touches no existing screen.

| Piece | Where |
| --- | --- |
| The single parser (finding 3) | `lib/sse.ts` + `lib/sse.test.ts` |
| Envelope + connection types | `types/events.ts` |
| Stream client | `services/api/events.ts` |
| Event type → query keys | `lib/eventRouting.ts` + tests |
| Connection manager, backoff, reconcile | `stores/eventStreamStore.ts` |
| Mount point | `hooks/useEventStream.ts`, `routes/_authenticated.tsx` |
| "Reconnecting…" indicator | `components/layout/LiveStatus.tsx` |
| Duplicate-run suppression | `lib/localRuns.ts` |

Decisions worth knowing:

- **It is an invalidation bus, not a notification feature.** Nearly every event
  means "a query you hold is stale", so the default action is
  `invalidateQueries` and no visible UI. Two events toast
  (`zernio.account.disconnected`, `zernio.account.attach_failed`): unexpected,
  actionable, and invisible on whatever screen you're on.
- **Runs this tab owns are muted.** Every AI flow reports twice — once down the
  POST stream the caller is rendering, once over the hub. `localRuns` tracks the
  first so the second is dropped, which keeps a refetch off a cache the running
  flow is still writing.
- **`zernio.sync.ok` is gated on its summary.** It fires on a timer for the
  whole tenant rather than in response to anything a user did, so left ungated
  it would refetch three queries on that schedule in every open tab forever.
  `upserts=0 soft_deletes=0` now invalidates nothing; an unreadable summary
  counts as a change, because being wrong towards a refetch is the cheap
  direction.
- **Reconnect reconciles rather than resumes** (finding 1). `RECONCILE_FILTERS`
  is the union of every target in the routing table, and pending autosaves are
  flushed first so a refetch can't restore pre-edit content over what someone is
  typing.
- **A silence watchdog, not just an error handler.** Verified on the local
  stack: killing the API left the `fetch` pending indefinitely with the UI still
  looking healthy — no error, no close. Three missed heartbeats (65s) now force
  the reconnect.
- **The indicator stays quiet for the first two retries**, and there is no
  "connected" state. A green light people learn to ignore doesn't make its red
  twin any louder.

### Still open

- **The naming conventions are still mixed** — dotted (`zernio.sync.ok`) and
  snake_case (`post_cloned`). `eventRouting.ts` matches both literally. Worth
  settling backend-side rather than normalising at this boundary forever.
- **Topics are `all`.** Narrowing to the mounted screens would mean
  re-subscribing on every navigation for no privacy gain, since the server
  already scopes to the tenant. Revisit if event volume grows.
- **`id:` is parsed and unused on `/api/events`.** The hub reserves the field
  and ignores what is sent back, so there is nothing to resume into. The
  notification stream is where replay actually happens.
- **`id:` is `0` on every replayed notification frame**, and `seq` is `0` on
  every row `GET /api/notifications` returns — the column is right, and a
  *live* frame is right, but anything the server reads back loses it
  (`bun:"seq,scanonly"` keeps it out of the generated `SELECT`). So the replay
  cursor can only ever be 0, which `parseCursor` reads as "no cursor": the
  durable half of the inbox is unreachable except while already connected.
  Measured 2026-09-04 against ogen@e722bab; the client is written for the
  fixed server and the reconnect refetch is what covers for it meanwhile.
- **A user gets 10 concurrent hub subscriptions, across both streams**
  (`eventhub.Config.MaxSubscribersPerUser`), and a dead connection keeps its
  slot until the next heartbeat write fails — up to 20s. So a reload orphans
  two slots where it used to orphan one, and both streams answer 429 until
  they free. Reproduced on `/api/events` alone, so it predates the second
  stream; the shared backoff rides it out. A cheaper reap, or a cap counted
  per topic rather than per user, would remove the wait.

### Closed since

- **A run that outlives the tab has no UI.** Closed by CON-242: the notification
  table records what finished, `GET /api/notifications/stream` replays it from
  `Last-Event-ID`, and Activity renders it (`docs/activity.md`). The hub still
  only invalidates, which is now the right division of labour rather than a gap.
