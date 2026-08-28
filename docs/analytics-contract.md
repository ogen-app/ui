# Analytics: the front end against the real API

What the back end actually serves as of `d7a8e88` (CON-236–239, merged
2026-08-27), what this repo assumed, and where the two disagree.

Everything below was read off the Go source — `src/handlers/analytics*.go`,
`src/analytics/{overview,performers,learnings,timeframe,insights}`,
`src/models/post_analytics.go`, `src/repository/post_analytics.go` — and off
`http-client/analytics/analytics.http`. **Nothing here has been exercised
against a running server**; the last section says what that still owes.

The wire shapes are now typed in `src/types/analytics.ts`, the clients are in
`src/services/api/analytics.ts`, and `src/services/api/analytics.test.ts` is the
executable statement of the contract.

## 1. What is unchanged

`GET /api/analytics/posts` — the only analytics endpoint the app reads today —
came through CON-236's storage rework field for field. `PostAnalyticsItem`,
`PostAnalyticsOverview` and `AnalyticsPagination` in `types/analytics.ts` match
`repository.PostAnalyticsListItem`, `repository.PostAnalyticsOverview` and the
handler's `analyticsPagination` exactly, including `published_at` and
`metrics_last_updated` being nullable and `last_refreshed_at` not being.

`last_refreshed_at` now maps to the internal `last_checked_at`, which is bumped
on **every** check rather than only on a change. That makes it a better answer
to "how fresh is this" than it was, and it changes nothing for the client: the
field name and meaning on the wire are the same. `lib/campaignAnalytics.ts` uses
it to pick the newest fetch, and that stays correct.

The sort vocabulary (`PostAnalyticsSort`), the 100-row clamp
(`ANALYTICS_PAGE_LIMIT`) and the 503 message matched verbatim by
`isAnalyticsUnavailable` are all still true.

**No mismatch in half the surface.** What follows is all about the three new
endpoints and the un-wired design surfaces on this branch.

## 2. The mismatches

### 2.1 The 503 is no longer the only way to say "nothing here"

`isAnalyticsUnavailable` (`services/api/analytics.ts`) reads unavailability as
*503 with the exact message `analytics is not available`*. That is still right
for `/posts`, and it is wrong for everything else: `/overview`, `/performers`
and `/learnings` answer **200** with `{available: false, reason, data: null}`
when the analytics DB is absent, and the same shape with `reason: "no_data"`
when the workspace has simply published nothing in the window
(`analytics_overview.go:40,95`, `analytics_performers.go:44,75`,
`analytics_learnings.go:40,62`).

Two consequences. A screen reading both kinds has to ask two questions —
`isAnalyticsUnavailable(error)` and `envelopeUnavailable(response)`, both now
exported. And `no_data` is a **new reason value**: `types/analytics.ts`
documented `not_configured` and `addon_required` only.

*Fixed:* both helpers exist; the envelope's doc names all three reasons and says
the list is open.

### 2.2 The design surfaces' view models are not wire shapes

`src/components/analytics/types.ts` is a display vocabulary, built before the
API existed, and nothing on this branch fetches into it. Field by field, against
what the server now sends:

| `components/analytics/types.ts` | The wire | Note |
| --- | --- | --- |
| `MeasureId` — 9 measures | `OverviewMetric` — 5 | No series for `impressions`, `saves`, `clicks`, `views` |
| `'published'` | `'posts_published'` | Renamed |
| `MeasureReading.series: Point[]` | `Series.{buckets,current}` | Parallel arrays; a mapper has to zip them |
| `MeasureReading.previousSeries` | `Series.previous` | **Index-aligned to the current window's buckets**, so its points must not be labelled with `buckets[i]` |
| `MeasureReading.expected {low, high}` | `Series.band: [{lower, upper}]` | Per bucket, not per period — and omitted from every response until baselines exist |
| `MeasureReading.previous` | — | Derive: the last element of `series.previous` |
| `Insight.tone: positive/negative/neutral` | `severity: info/note` | **Not the same axis.** Severity is loudness, not polarity; nothing on the wire says whether the news is good |
| `Insight.basis` | `note` | Renamed |
| `Coverage.measured / published` | — | Only the `posts_published` card, and only for the window |
| `Coverage.nextRefreshIn` | — | No source; the refresh cadence is server config |
| `Period.label` | — | Server sends `from`/`to`/`days` (+`granularity` on `/overview`) |

Performers:

| `RankedPost` | The wire (`PerformerRow`) | Note |
| --- | --- | --- |
| `account.platform` | `PerformerRow.platform` | **One level up.** `PerformersSection.tsx:242` reads `post.account.platform`, which does not exist on the wire |
| `account.name` | `account.username` / `display_name` | Both omitted when empty; `display_name` is filled from the username today |
| `account.avatarUrl` | `account.avatar_url` | Declared, never populated — enrichment from `social_accounts` is a follow-up |
| `pace` | `against_typical` | Same idea, renamed; `null` under three posts on that platform, with `baseline: "insufficient_history"` instead of a `direction` |
| `share` | `period_share` | Renamed, same 0–1 |
| `matured` | — | **No source.** The server sends `reach_still_accruing` (age < 3 days) and `age_days` |
| `metrics: Partial<Record<MeasureId, number>>` | `reach` + `metrics{impressions,likes,comments,shares,engagement_rate}` | No saves, clicks, views or follows per post |
| `publishedAt` (human), `age` (human) | `published_at` (RFC3339), `age_days` | Formatting is ours |
| `PerformersView.posts` — every post in the period | `best` + `worst`, capped at `limit` | The middle is never sent; `total_posts` is the count |
| `PerformersView.curve {sample, confidence, floor}` | — | The maturation curve is internal to the server's scoring |
| `PerformersView.typical` | — | `against_typical` is already normalised; there is no absolute typical per criterion |
| `PerformerCriterionId` — `pace`, `save_rate`, `follow_rate` | `by` — `against_typical`, `interactions` | `save_rate`/`follow_rate` are unserviceable; `interactions` is missing from the FE |

Learnings:

| `PatternsView` | The wire | Note |
| --- | --- | --- |
| `bestTimes.grid: number[][]` 7×24, Mon-first | `heatmap.cells[]`, sparse, **0 = Sunday** | Two mismatches: a grid has to be built, and the day index re-based |
| `bestTimes.best {day, hour, sample}` | `strongest {day_of_week, hour, post_count}` | Renamed; absent when nothing stands out |
| `bestTimes.sample` / `confidence` | `measured_posts` / — | No confidence enum on the wire; the server's answer is binary (`insufficient_history`) |
| `ShelfLife.curve [{hour, share}]` | `lifespan.curve [{age_hours, share_of_final}]` | Renamed |
| `ShelfLife.milestones [{share, hour}]` | `t50_hours`, `t75_hours`, `t95_hours` | Three scalars, not a list — plus `horizon_hours` |
| `Pattern {title, sample, confidence}` | `{headline, support, —}` | Plus `dimension`, `segment`, `lift`, `trend`, `metric` |
| `winners` | `works` | Renamed |

*Not fixed, deliberately.* Rewriting six thousand lines of design components
against a contract nobody has run is how a UI acquires a second set of wrong
assumptions. The table is what a mapper needs; the three rows with no wire
source at all (`matured`, `curve`/`typical`, `save_rate`/`follow_rate`) are
design decisions to revisit, not fields to request.

### 2.3 The post surface has no *series* endpoint

`PostSeries` in `components/analytics/types.ts` says this, and for the history it
is true: `post_analytics_snapshots` is written on every metric change and
retention-pruned, and **no handler reads it** — `models/post_analytics.go:209`
says so outright. `GET /api/analytics/posts/:id/series` remains the ask.

The post's *current* figures are a different matter, and an earlier draft of this
report had it wrong: **`GET /api/posts/:id/analytics` exists** and always did
(CON-93 FR4, `handlers/posts.go:715`). It is unread by this app. See §5.

### 2.4 400s carry machine codes, not prose

`defaultErrorHandler` (`src/server/server.go:733`) sends `{"error": err.Error()}`,
and the new handlers pass bare codes: `invalid_range`, `window_too_large`,
`invalid_sort`, `invalid_param`. `errorMessage()` in `services/api/errors.ts`
returns `body.error` verbatim, so an unmapped one reaches a toast as
`invalid_sort` — the same trap the account-selection 422s already have a
translation table for.

The client controls every one of these parameters, so a well-formed UI never
provokes them; that is why no table was added. Should one become reachable —
a user-chosen date range is the obvious candidate — it needs the same treatment
as `ACCOUNT_SELECTION_MESSAGES`.

### 2.5 The window belongs to the server

`timeframe.Resolve` includes **today** in a relative window, caps a span at 400
days (`window_too_large`), requires `from` and `to` together, treats both as
inclusive, and buckets weekly past 90 days unless told otherwise. The client
therefore sends a shorthand and reads the resolved `window` back; it must not
compute its own dates or labels. `fetchAnalyticsOverview` defaults nothing for
this reason, and does not expose `granularity` — forcing `week` on a 28-day
window yields four points where the reader expects twenty-eight.

### 2.6 `updated_at` can be the Go zero time

`maxLastChecked` returns a zero `time.Time` when no row has been checked, which
serialises as `0001-01-01T00:00:00Z`. Any "updated N ago" line has to treat that
as *never*, not as a date in the year 1.

## 3. What the flag is still waiting for

The original blocker — "a campaign dimension on `GET /api/analytics/posts`" —
**did not land**. All three new endpoints are tenant-scoped; only `/performers`
filters, and only by platform. So:

1. **A campaign dimension.** `campaign_id` on the dashboard reads, or a campaign
   column on the rows. Nothing else unblocks the campaign screen, which is what
   `campaign-analytics` gates.
2. **A per-post series** (§2.3).
3. **Live re-test** (§4).

The two workspace-wide surfaces need none of (1) and could ship first.

## 4. Only verifiable against a running backend

- That the envelope really wraps `/overview`, `/performers` and `/learnings` in
  practice, and that `data` is `null` rather than absent on the `available:
  false` path.
- `series.previous` alignment when the previous window has a different bucket
  count — `alignLen` pads or truncates, and the visible effect at a month
  boundary is worth seeing.
- Whether `heatmap.strongest` is omitted or `null` when nothing stands out
  (`omitempty` on a pointer says omitted; a serialiser change would make it
  null).
- Whether `learnings.{heatmap,lifespan,patterns}` can ever be `null` — the
  builders always return a value today, so the types treat them as present.
- `account.avatar_url` and `display_name` once the `social_accounts` enrichment
  lands.
- The real `delta_pct` when the previous window is empty: the server returns `0`
  rather than null, which reads as "flat" and not as "no comparison".

## 5. The post surface, element by element

The first of the design surfaces taken card by card against the API. Two
directions at once: what the harness draws and cannot source, and what the
server sends that nothing draws.

### 5.1 The endpoint nobody calls

`GET /api/posts/:id/analytics` (`handlers/posts.go:715`, shape in
`handlers/analytics.go:21`) serves one post's latest engagement from the
database — no publisher call on the request path. **No client exists for it in
this repo**: `services/api/analytics.ts` has `/posts` and the three dashboard
reads, and nothing else. It answers in three ways:

- a full snapshot;
- `{"status": "pending", "post_id": "…"}` at **200** when the refresh sweep has
  not covered the post yet — explicitly so clients can poll (CON-93 §10);
- **409** `{"code": "not_published_via_publisher", "error": "…"}` for a post
  that never went out through Zernio.

Plus **503** `post analytics is not available` — note the message differs from
`/analytics/posts`'s `analytics is not available`, so `isAnalyticsUnavailable`
does **not** match it. A client for this endpoint needs its own predicate or a
widened one.

### 5.2 What `PostPerformanceView` needs, and where it comes from

| `components/analytics/types.ts` | Source | Note |
| --- | --- | --- |
| `post.title`, `post.format`, `post.campaign`, `post.scheduledFor` | the post document | Not analytics — the screen already has the post it is about |
| `post.platform` | `platform_analytics[].platform` | See §5.3: the wire is a *list* |
| `post.account` | `platform_analytics[].account_username` | **Newly sourced.** Was listed as unavailable |
| `post.permalink` | `platform_analytics[].platform_post_url` | **Newly sourced** |
| `post.publishedOn` / `publishedAgo` | the post document, or `published_at` on an `/analytics/posts` row | Formatting is ours |
| `metrics[].value` | `analytics.{impressions,reach,likes,comments,shares,saves,clicks,views,engagement_rate}` | **All nine measures.** This is the only endpoint that serves the full `MeasureId` set — `/overview` has five, `/performers` five |
| `lastRefreshedAt` | `last_refreshed_at` | Matches |
| `maturity` | derivable | `published_at` + the server's own rule from `/performers` (`reach_still_accruing` = age < 3 days). The harness's four states are finer than the server's two |
| `measuredOver` | derivable | now − `published_at` |
| `metrics[].typical` | **no source** | Nothing serves a per-workspace typical per measure. `/performers`' `against_typical` is a ratio for ranked rows only, and only for reach/interactions |
| `metrics[].expected` | **no source** | The overview's `band` is per bucket over a window, not per post |
| `percentile` | **no source** | Would need a distribution the API does not expose |
| `sample` | **no source** | `/learnings` `scope.measured_posts` is the nearest thing and is workspace-wide, all-time |
| `insight` | **no source** | Insights are computed per workspace, never per post |
| `series` | **no source** | §2.3 |

So the identity card and the figures are fully serviceable today; the
comparisons (`typical`, `expected`, `percentile`, `sample`) and the charts are
not. That is the split a first cut should follow — `MeasureTile` already
withdraws when `typical`/`expected` are absent, so the card degrades to bare
numbers rather than breaking.

### 5.3 Orphaned data — served, drawn by nothing

| Wire field | Status |
| --- | --- |
| `platform_analytics[]` — the whole per-platform breakdown, each row with its own full metric block | **Deliberately unmodelled.** `types.ts:931` says the post surface carries no per-account breakdown, on the grounds that a post to four accounts is four rows on the campaign's performers card. The consequence is unstated: the figures the harness *does* show are the aggregate across platforms, so a post on LinkedIn and Instagram shows one summed reach with no way to see the split, on the one screen dedicated to that post |
| `platform_analytics[].error_message` + `.reauthorize_url` | **The one that matters.** A platform connected before analytics scopes were granted reports its gap here rather than failing the response. This is *actionable* — the reader can reconnect — and there is no design for it anywhere in the harness. Highest-value gap in the whole comparison |
| `platform_analytics[].sync_status`, and the post-level `sync_status` | No state in the harness. `measuredOver`'s own doc anticipates exactly this case ("a platform stops reporting on a post that is still live") and nothing reads the field that says so |
| `metrics_last_updated` | The publisher's "numbers computed at", beside `last_refreshed_at`'s "we last looked". The model says the pair is what "expose[s] staleness"; the harness has one `Freshness` line and collapses them, so *stale numbers* and *a stale fetch* look identical |
| `status: "pending"` | No per-post state. `AnalyticsSurfaceState` has `isCold` for a whole surface; a post awaiting its first sweep is a different thing and wants the poll the server built it for |
| `publisher`, `publisher_post_id`, `post_id` | Internal identifiers; correctly unused |

### 5.4 Orphaned endpoints

Five analytics routes have no client in this repo. Beyond `/posts/:id/analytics`:

- **`GET /api/analytics/followers`** — DB-served (no publisher call), takes
  `account_id`, `from`, `to`, `granularity=daily|weekly|monthly`, and returns
  `{accounts, series, granularity}` — a follower series **per connected
  account**. The overview's `followers` metric is one workspace-wide number, so
  this is strictly richer than anything wired, and cheap. The likeliest
  first thing to adopt after the post surface.
- **`GET /api/analytics/best-times`**, **`/content-decay`**,
  **`/posting-frequency`** — CON-153 live read-through proxies to Zernio, gated
  on the tenant's Analytics add-on (`addon_required`), returning Zernio's own
  payload as opaque `data: any`.

The last three raise a question for the back end rather than for us:
`/learnings` now answers two of the same questions from **our own** snapshot
database — `heatmap` against `best-times`, `lifespan` against `content-decay` —
with a shape we control and no add-on gate. Which is authoritative should be
settled before either is wired, or the app will show two answers to "when should
we post" that disagree. `/posting-frequency` has no `/learnings` equivalent;
cadence is not in there.

### 5.5 One more asymmetry

`/analytics/posts` and `/posts/:id/analytics` reject bad input with **prose** —
`invalid sort_by`, `page must be a positive integer`, `granularity must be
daily, weekly, or monthly`. The CON-237–239 endpoints answer with **machine
codes** (§2.4). Both reach a toast through `errorMessage()` verbatim, so the old
routes leak developer English and the new ones leak identifiers. Neither is
showable; a client for either needs the `ACCOUNT_SELECTION_MESSAGES` treatment.
