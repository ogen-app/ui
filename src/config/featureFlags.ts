/**
 * Front-end feature flags.
 *
 * The front end runs ahead of the API: a feature the server can't back yet
 * ships to `develop` with its flag **off** rather than waiting on a branch.
 * Every such feature gets an entry here, and the entry says what it is waiting
 * for — that comment is the hand-off to the back end. When the endpoint lands,
 * re-test against the real thing and *then* decide the flag's fate. See the
 * global rules in `CLAUDE.md`.
 *
 * Today a flag is a constant in this file: flipping one is a one-line edit and
 * a deploy, which is all it needs to be while the only people switching them
 * are the people writing them.
 *
 * **This is the seam for the server.** When flags become BE-driven the values
 * move behind `useFeatureFlag`, and every call site stays as it is — which is
 * why components read the hook rather than the record. Nothing else may read
 * `FEATURE_FLAGS` directly.
 *
 * It is already the seam for one thing: on staging and in local dev a flag can
 * be forced per browser, so one person can exercise a half-built feature while
 * everyone else keeps testing the app as it ships (`flagOverrides.ts`). That
 * layer folds away to nothing in a production build, so the two functions below
 * are the record and only the record there.
 *
 * A flag is not a permission: it decides whether a feature is built yet, never
 * whether someone is allowed to use it. That stays server-side either way.
 *
 * Adding one: add an entry here, read it with `useFeatureFlag('<id>')`, and
 * render nothing when it is off. Removing one is the point — a flag whose
 * feature has settled should be deleted along with the `off` branch of the
 * code, not left switched on forever.
 *
 * **A flag's life ends at the second merge, not the first.** Turning it on is
 * one deliberate step; deleting it is the next, once the feature has survived
 * one real deploy and nobody has reached for the switch. A flag left on is not
 * a flag — it is a branch nobody takes and a question every reader of the call
 * site has to answer ("and when this is false?") for code that has not run
 * since the day it shipped. The off-branch rots quietly, and the person who
 * eventually deletes it cannot tell stale scaffolding from a deliberate
 * fallback. `campaign-goals` and `campaign-scheduling` sat on for four weeks
 * before this rule existed; they were the reason for it.
 *
 * The `false` entries below are the healthy ones — the count is not the metric.
 * They are holding unshippable work on `develop`, which is the whole point of
 * the mechanism. It is the `true` ones that are on a clock.
 */
import { readFlagOverrides } from './flagOverrides'

const FEATURE_FLAGS = {
  /**
   * Activity (CON-225): the sidebar item, the feed, and the daily report — the
   * workspace's answer to "what happened since I last looked?". Also the whole
   * notification client (CON-242): the inbox queries, the durable stream and
   * the unread count are mounted by this feature and by nothing else, so with
   * the flag off no notification request is made at all.
   *
   * **Exercised against the real API**, 2026-09-04, local build of `main` at
   * ogen@e722bab: a real `connection.action_required` row read over REST and
   * rendered from the catalogue, replay served against `Last-Event-ID`,
   * click-through `PATCH`, and `mark-all-read`. Phase 2 is built on it:
   * recorded entries replaced the derived ones, read state is per row and
   * server-side, and the Phase 1 last-seen timestamp is gone
   * (`docs/activity.md`). What that pass found is 1 below — since fixed on the
   * server, so 1 is now a re-test rather than a blocker.
   *
   * **Waiting on**, in the order that decides whether this ships:
   *
   * 1. **One round trip against the fixed `seq`.** The bug this pass found —
   *    `bun:"seq,scanonly"` keeping the column out of the generated `SELECT`,
   *    so every row `List` and `ReplaySince` returned carried 0 and the replay
   *    cursor could never advance — is fixed by ogen#139, merged 2026-09-04:
   *    the tag is `nullzero,autoincrement`, and the new test reads `seq` off a
   *    row coming *back* rather than off the inserted model, which is why the
   *    original suite stayed green. The client was written for that server and
   *    needs no change, so what is left is rule 4 rather than work — and two
   *    of the three things the 0 made unobservable were confirmed on
   *    2026-09-07 against a freshly restarted API. **Replay** advances across a
   *    reconnect: a cursor replays strictly `>` itself, ascending; an
   *    unparseable one is live-only with 200 rather than a 400; one ahead of
   *    the log replays nothing without error. **`mark-all-read`'s `before`**
   *    really bounds: `{before: n}` leaves the row at `n+1` unread, `{before:
   *    n+1}` includes it, `{}` is unbounded — which is what stops the click
   *    marking a row that arrived after it. Still unobserved, because it needs
   *    a triggerable producer rather than a fixed server: **live push**, and
   *    with it the replay→live dedup (`n.Seq <= lastSentSeq`). Paging past page
   *    one is untested too.
   * 2. **Fan-out — decided 2026-09-06, unimplemented.** Every producer writes
   *    to the thing's `created_by` (`submit_post_to_zernio.go`), so a post
   *    failing to publish is news to whoever made it and to nobody else. The
   *    derived entry it replaced was visible to the whole workspace, so
   *    turning this on as it stands *narrows* who hears about a failure. The
   *    ruling matches CON-285 FR8: **`post.publish_failed` goes to the
   *    workspace** — a failed publish is workspace business, not the author's
   *    private problem. `notify.EmitToUsers` already exists and the
   *    connection-expiry producer reaches every owner with it, so this is one
   *    call site, not a missing capability.
   * 3. **`post.published` — decided 2026-09-06: it stays, workspace-wide.**
   *    CON-224 said it must not be emitted, and the volume argument is real:
   *    a workspace posting three times a day across five channels writes
   *    fifteen "it worked" rows, times the member count once fan-out lands,
   *    which is how a badge stops being read. It is kept anyway, because the
   *    opposite failure is worse — people schedule posts and then hear
   *    nothing, and a system silent when publishing works is indistinguishable
   *    from one whose scheduler is broken. Muting a channel is a user's
   *    choice; never recording the fact is ours. The volume belongs to
   *    notification preferences and digests (CON-242 §12).
   * 4. **A producer for "never published".** `not_published` is a real outcome
   *    with no notification type, so it now leaves no record at all. It is
   *    counted in the day's report and nowhere else.
   *
   * 2 and 3 are answered and now wait on CON-285 with the rest of the producer
   * set; neither is a reason to change the client, since the feed renders
   * whatever rows arrive and `post.*` copy is already in the catalogue. 1 is
   * the cheapest of what is left and nothing else is blocked on it. The whole
   * recipient taxonomy — every type, its trigger, its transport and who hears
   * it — is written out in `docs/events.md` rather than reconstructed from
   * here.
   *
   * **Answered since:** whether the `/api/events` crash reaches this stream —
   * it does not, and it no longer reaches `/api/events` either. CON-158
   * detaches a logging context before the writer goroutine starts, and
   * `handlers/notifications.go` was written to that pattern from the first
   * commit: the last `c.Context()` in the file is the call installing the
   * writer. Re-read against `ogen` `main` 2026-09-05; finding 5 in
   * `docs/sse.md` carries the diagnosis and the fix.
   *
   * **Also fixed since — CON-286, the `eventhub` subscriber leak**, which this
   * feature did not cause but made twice as likely: a user was capped at 10
   * concurrent subscriptions across *both* streams and the slots were never
   * reclaimed, so ten leaked connections wedged both streams shut permanently
   * — no cross-tab invalidation and no notifications until the API restarted.
   * ogen#142 made the cap self-healing (at the limit the hub evicts the user's
   * **oldest** subscription rather than refusing the newcomer, so a reload
   * always opens a stream) and added a hard **30-minute connection lifetime**
   * to reclaim what a dead client leaves behind; ogen#152 raised the cap
   * **10 → 30**, because ten counted across both streams and every device made
   * this feature's second stream the difference between ten tabs and five.
   *
   * What that leaves is **ours**. A clean close mid-session is now expected
   * rather than exceptional — twice an hour per tab, plus any eviction — and a
   * clean close is exactly what a dropped connection looks like, so every
   * recycle currently runs the full recovery path: flush autosaves, invalidate
   * the routing table, and show *"Catching up…"* when nothing was down.
   * ogen#152 shipped the one thing that can tell them apart, a frame sent
   * before the close:
   *
   *     event: recycle
   *     data: {"reason":"lifetime"}
   *
   * deliberately with **no `id:` line**, so it does not advance the replay
   * cursor. Nothing in `lib/streamConnection` listens for it yet. Handling it
   * is not a blocker for turning this flag on — the recovery is correct, only
   * noisy — but it is the honest version, and it gets noisier the moment a
   * second stream per tab is what this flag switches on. `docs/sse.md`
   * carries the measurements.
   *
   * The daily report is the half that was never a stand-in: it is a count over
   * posts, correct as computed, and it is untouched by all of the above.
   */
  activity: false,

  /**
   * Tasks (CON-234): the workspace's open work, its own module directly under
   * Activity in the rail.
   *
   * Separate from `activity` because they are different objects and will land
   * at different times. A task is a **level** — a condition that stops being
   * true when it is fixed — where a feed entry is an **edge**, a timestamped
   * fact that stays true forever (`docs/tasks.md`). Keeping them apart is
   * what stops the feed filling with stale rows nobody can clear.
   *
   * **Waiting on:** a tasks table. A task is a record — it is written by a
   * person or raised by the system from a warning, it carries an assignee and
   * a done state, and it outlives the condition behind it. None of that is
   * derivable, so the prototype stores the whole list as JSON in one tenant
   * key/value row (`tasks`), the same stand-in `campaign-accounts` uses while
   * waiting for its column. What that cannot do, and the table must:
   *   · **row-level writes** — every change here rewrites the entire list, so
   *     two people editing different tasks in the same second means the later
   *     write wins for both;
   *   · **server-side reconciliation** — raising and auto-resolving happens on
   *     the client, so it only runs while somebody has one of the two screens
   *     open, and exactly one may do it (`useTaskReconciliation`);
   *   · **telling the assignee** — assignment writes a membership id and
   *     nothing else happens. CON-242 built the channel, but its producers are
   *     server-side and a task lives in a key/value row, so there is nothing to
   *     emit from until tasks are rows.
   *
   * `assigned_to` does not exist on any model today, which is the column this
   * starts from. The row is also workspace-wide and readable by every member,
   * which is right for shared work and wrong for work assigned to a person.
   *
   * Switch this on once tasks are rows, migrate the key onto them, and re-test
   * — the intent is that the rule set keeps raising tasks alongside the
   * hand-written ones, not that it is replaced.
   */
  tasks: false,

  /**
   * "Accounts & Post Types" in campaign settings: the campaign targets an
   * **account on a platform** rather than the platform, so a workspace with two
   * Facebook pages can send a campaign to one of them, or to both with
   * different post types.
   *
   * **Waiting on:** an account dimension on the campaign. `CampaignPlatform` is
   * `{id, post_types}` (`models/types.go`), the column is jsonb, and the
   * handler drops any field it doesn't know — so a per-account choice sent to
   * `PUT /api/campaigns/:id` is lost on the round trip. It needs
   * `CampaignPlatform.AccountID` (`""` = the placeholder kind, i.e. today's
   * platform-level entry) with the content-plan flow and the submit worker
   * reading it, plus a uniqueness rule on `(platform, account)`.
   *
   * Until then the choice lives in the tenant key/value store
   * (`campaign-accounts.<campaignId>`, see `useCampaignAccounts`) and the
   * campaign's own `target_platforms` is written from it at platform
   * granularity, so nothing downstream reads half-backed data. When the column
   * lands, migrate the key onto it, re-test, and delete this flag with its
   * off-branch (`PlatformsControl`).
   */
  'campaign-accounts': false,

  /**
   * The **numbers** in the campaign's Analytics section (CON-175) — not the
   * section itself. The page, the sidebar item and the Overview card are
   * always there; with this off they say what the section will hold and
   * measure nothing, and no analytics request is made. Turning it on swaps
   * that preview for the real totals in both places.
   *
   * **Still waiting on: a campaign dimension.** CON-236–239 landed the
   * analytics dashboard API on 2026-08-27 — `/overview`, `/performers` and
   * `/learnings`, typed against the real handlers in `types/analytics.ts` and
   * pinned by `services/api/analytics.test.ts` — and every one of them is
   * **tenant-scoped**. None takes a `campaign_id`; only `/performers` takes a
   * `platform`. So the thing this flag was originally waiting for did not
   * arrive: a campaign screen still cannot ask the server its own question.
   *
   * Until it can, the page fetches one 100-row page of `/posts`, intersects it
   * with the campaign's posts client-side, and sums the rows itself; the
   * server's `overview` block is workspace-wide and deliberately ignored.
   * Beyond ~100 measured posts in a workspace that stops being complete, which
   * is why every surface states its coverage.
   *
   * **Before this can be flipped**, in order:
   *
   * 1. A campaign dimension — `campaign_id` on the dashboard reads, or a
   *    campaign column on the rows. Nothing else unblocks the campaign screen.
   * 2. A per-post series. `post_analytics_snapshots` is written and retained,
   *    and no endpoint reads it (`models/post_analytics.go` says so in as many
   *    words), so a post's own history has no source — the ask is
   *    `GET /api/analytics/posts/:id/series` with a granularity.
   * 3. A live re-test. Everything typed here was read off the Go source, not
   *    off a running server; the shapes with the least margin for a
   *    misreading are the overview's `series.previous` (index-aligned to the
   *    *current* window's buckets) and the learnings sections, each of which
   *    withdraws on its own.
   *
   * The two workspace-wide surfaces (`components/analytics`) needed no campaign
   * dimension and have shipped ahead of this one: `analytics-overview` is on,
   * with the mappers from these wire shapes onto the view models written and
   * tested. Two of their fields still have no wire source — per-post `matured`
   * and the performers' `curve`/`typical` — and each surface states that where
   * it would otherwise draw them; CON-250 serves both under other names
   * (`still_counting`, and a p25/p50/p75 curve), so that is a renaming pass
   * once ogen#130 merges rather than an ask. The third, the `save_rate` and
   * `follow_rate` criteria, was **deleted** on 2026-09-06 instead of left
   * waiting: `/performers` reports neither, so both were filtered out of every
   * render they ever had. This flag is waiting on the campaign dimension
   * (CON-288), nothing else. See `docs/analytics-contract.md`.
   */
  'campaign-analytics': false,

  /**
   * Analytics — the workspace's own numbers: the `/analytics` route, its
   * sidebar row, and the three cards on it. **What happened** (CON-237) — five
   * figures, the chart behind whichever is selected, the deterministic
   * callouts — **Performers and outliers** (CON-238), the window's best and
   * worst posts scored against a typical post on the same platform at the same
   * age — and **What we've learned** (CON-239), the all-time slot heatmap, the
   * curve a post follows after publishing, and the structural patterns behind
   * what works and what is fading.
   *
   * **All three endpoints are real and shipped.** `GET /api/analytics/overview`
   * landed with CON-237 (ogen#125), `GET /api/analytics/performers` with
   * CON-238 (ogen#126) and `GET /api/analytics/learnings` with CON-239
   * (ogen#127) — all merged 2026-08-27, so this is built against the API rather
   * than ahead of it, unlike `campaign-analytics`, which is still waiting on a
   * campaign dimension none of the three reads has. That makes this the
   * workspace surface that can ship first, exactly as the note on that flag
   * predicted.
   *
   * **On.** The endpoints exist, the surface is complete and its copy is
   * catalogued, so the honest state of it is shipped rather than hidden — with
   * this off the route rendered a description of itself, which is a worse thing
   * to show than real numbers with a stated coverage.
   *
   * What is *not* yet true is that any of it has met a live workspace:
   * everything here was read off the Go source and the hand-off comments, so
   * first contact is still the test. Seven things to look at when it happens,
   * in rough order of how quietly they would be wrong:
   *
   * 1. **The window picker end to end.** `7d`/`28d`/`90d` all resolve to day
   *    buckets server-side; a window that quietly came back weekly would put a
   *    seven-point chart where the reader expects ninety.
   * 2. **`series.previous` really is index-aligned** to the current window's
   *    buckets rather than carrying its own dates. The mapper labels those
   *    points with this window's dates on purpose — read as calendar dates they
   *    are wrong by exactly one window — and the ghost line is drawn from them.
   * 3. **`updated_at` on a workspace mid-sweep.** It is the newest
   *    `last_checked_at`, and the Go zero value means nothing has ever been
   *    checked; the cards treat that as "no freshness to report" rather than
   *    printing a date in year 1.
   * 4. **`total_posts` against the two lists.** The board's foot-note counts
   *    the hidden middle by subtracting them, so a `total_posts` that counts a
   *    different set from the one that was ranked would print a wrong "and N
   *    more".
   * 5. **A `by` the server rejects.** The picker only offers the four in the
   *    contract, so `invalid_sort` should be unreachable — worth proving,
   *    because it surfaces as a bare failed request rather than a bad-input
   *    message.
   * 6. **Which timezone `/learnings` actually bucketed on.** The PRD says a
   *    fixed display timezone defaulting to UTC and the wire carries no offset,
   *    so every slot on the heatmap is labelled UTC. If the server is in fact
   *    bucketing on a tenant timezone, the labels are wrong by that offset —
   *    and a "best time" wrong by three hours is worse than no best time. Ask
   *    for the zone on the wire either way.
   * 7. **Whether a section can arrive as `null`** rather than as its fields or
   *    `{insufficient_history: true}`. The builders always return a value
   *    today, so the types treat the three sections as present; a `null` would
   *    reach the mapper as a section with no history, which is the safe wrong
   *    answer but still a wrong one.
   *
   * **Known missing, and not defects in this UI:**
   *
   * - **The usual-range band** on the overview. Every card answers `baseline:
   *   "insufficient_history"` and no `band`, because the long-retention rollup
   *   behind it has no tenant with enough history yet
   *   (`analytics/overview/overview.go`). So the verdict lines, the cone and
   *   the "usual range" key are absent, and the previous-stretch delta is the
   *   whole comparison. `lib/analyticsOverviewView` reads the field rather than
   *   today's absence, so the band appears on its own when one is sent.
   * - **Account pictures** on the board. `account.avatar_url` is declared and
   *   always empty, and `display_name` mirrors `username`; enrichment from
   *   `social_accounts` is a server follow-up. Rows fall back to the initial
   *   plus the platform badge and fill in on their own.
   * - **Semantic patterns** in the lessons card — "posts that open with a
   *   question", "team photos". Deferred server-side because they need content
   *   classification, so the mining is structural only (format, length,
   *   hashtags, links, timing, platform). The card shape takes them unchanged
   *   when they land.
   * - **`since` on `/learnings`** is on the wire and not exposed. It cuts off a
   *   past the workspace has disowned, which is a workspace setting rather than
   *   a control on a card; offering it beside the metric would turn an all-time
   *   card back into a period one. The mapper reads it, so a server-set value
   *   already shows in the card's heading.
   * - **`platform` on `/overview`, and a decision on `/learnings`.** The scope
   *   bar above the cards offers one platform at a time because that is exactly
   *   what the server can answer: only `/performers` takes a `platform`, and it
   *   takes one slug rather than a set. So the filter narrows the board and not
   *   the other two, and both of them print "every platform — not affected by
   *   the filter above" under their heading for as long as that is true. Two
   *   things would retire that note: `platform` on `GET /analytics/overview`,
   *   and a ruling on whether an all-time lessons card should be narrowable at
   *   all — "your posts land on Tuesday evenings" may well be a fact about a
   *   platform rather than about the workspace. Repeatable `platform` on both
   *   would additionally let the marks go back to multi-select, which is what
   *   the campaign surface's filter is already written for.
   *
   * **i18n is done.** This used to defer it on the Brand precedent (CON-227),
   * with the note that the components had to be converted as one pass before
   * the surface could ship to a non-English workspace. That pass has happened:
   * every string in `components/analytics/*` and in the three view mappers is
   * a catalogue entry, the measure and criterion tables carry behaviour only,
   * and the `en-GB`/`en-US` locale pins that used to sit in `format.ts` and the
   * two mappers are gone — dates and numbers read the app's language like
   * everything else. `components/analytics/localisation.test.tsx` renders the
   * surface in Spanish and asserts on what comes out, which is the only way to
   * tell a converted component from one whose literals happen to be English.
   *
   * Delete this flag, and the preview it switches between, once the surface has
   * been exercised against the deployed API — a flag left switched on is a
   * branch nobody takes and a question nobody re-asks.
   */
  'analytics-overview': true,

  /**
   * The post's own numbers — the performance section at the foot of the post
   * editor (`PostPerformanceSection`), fed by `GET /api/posts/:id/analytics`.
   *
   * **On**, like `analytics-overview` and for the same reason: the endpoint is
   * real and the honest state of the surface is shipped. This flag existed in
   * `lib/platformMeasures.ts`'s safety note before it existed here — the
   * surface shipped ungated while its own comment deferred correction to a
   * flag that was never declared. Now it is the one switch that removes the
   * section, and with it every analytics request the post editor makes.
   *
   * What is still unverified, and what to check before deleting this flag: the
   * `UNREPORTED` table in `lib/platformMeasures.ts` is read off the public
   * platform APIs, not off a running Zernio, and it decides whether a
   * platform's `0` renders as a figure or as nothing. It can suppress a
   * genuine zero but never a real number, so first contact with live data is
   * the test — a platform showing a tile this build says it shouldn't is the
   * signal an entry is wrong.
   */
  'post-analytics': true,

  /**
   * **Brand** — the workspace-level material every campaign writes from
   * (CON-226/227): voices, audiences and guardrails.
   *
   * **On.** It was off for one reason — `services/api/brand.ts` was a stub, a
   * JSON seed and `localStorage` standing in for a server, and a workspace's
   * brand rules are the last material anyone would expect to retype after
   * clearing their site data. CON-228 shipped the store and the endpoints, the
   * service is `apiJson` calls against them, and the seed is deleted. The
   * reason to hold it back is gone.
   *
   * The flag gates the nav row *and* the route, so it is still the one switch
   * that removes Brand from the app.
   *
   * **What is on with it, and what is not.** Voices, Audiences and Guardrails
   * are complete: written here, stored server-side, and — since CON-245 — read
   * by the flows that write posts. The binding is real too: a campaign's voice
   * and audience ride its own PUT, a post's go through `PUT /api/posts/:id/
   * brand`, and the `localStorage` stub that stood in for all four is deleted.
   * Look and Templates are **not offered** (`shown` in `lib/brandSections`):
   * their endpoints exist and their screens render, but nothing writes them
   * from the UI and the image flows that would consume them are
   * CON-105/CON-132. Two Overview cards that cannot be filled in and would
   * change nothing if they were teach the user that the screen is a mock-up,
   * which is the one thing this module cannot afford to say.
   *
   * `summary` lines still arrive empty until the generation job ships, and
   * `postsBehind` is still `0` — it needs the per-post voice-version snapshot
   * CON-245 §13 deferred. `usage` is real now. Those are not bugs to hide: the
   * screens already draw "nothing has been written in this" as a designed
   * state, and it is true.
   *
   * **i18n is done.** It was deferred at the 2026-08-28 merge on the argument
   * that the wording was being argued alongside the shape and cataloguing it
   * meant retranslating on every iteration — with the conversion promised
   * before this flag flipped. The flag flipped first, and the debt was paid
   * after: the binding pickers came in with the CON-245 narrowing
   * (`brand.binding.*`), and the eleven library screens followed. Every string
   * in `components/brand/*`, in the Brand routes and in the two tables behind
   * them (`lib/brandSections`, the starters) is a catalogue entry, and
   * `components/brand/localisation.test.tsx` renders in Spanish and asserts on
   * what comes out — which is the only way to tell a converted component from
   * one whose literals happen to be English.
   *
   * Two things that conversion moved rather than merely translated, worth
   * knowing before editing either: `BRAND_SECTIONS` carries **behaviour only**
   * now (glyph, hue, readers, whether it is offered) and its words are
   * `brand.sections.<id>.*`; and a starter's *draft* is catalogued along with
   * its card, because forking one writes that material into the workspace's
   * own library — an English draft handed to a Spanish workspace is something
   * they must rewrite before they can use it.
   *
   * All three starter sets now live in `components/brand/starters.ts` rather
   * than in the sections that render them. Taking the words out is what made
   * them one object described three times instead of part of any one screen —
   * and it gave those screens their fast refresh back, which is what
   * `react-refresh/only-export-components` was asking for all along.
   *
   * The argument this is built from: `docs/brand-materials.md`.
   */
  // The id keeps the server's word, as do `components/brand`, `useBrand` and
  // the `/api/brand` resource it all talks to. Only the user's word changed:
  // the module is called Foundation, because the voices, audiences,
  // guardrails and source documents every campaign writes from are not all
  // one thing, and only one of the four is what anyone means by a brand.
  'brand-materials': true,

  /**
   * The marketing-email switch on Profile (CON-155). **Off — waiting on the
   * back end.** CON-154/CON-155 shipped the suppression engine, but every
   * endpoint it exposes is public and token-gated: it verifies a signature
   * lifted from an email footer, not a session, so nothing there can say
   * whether the signed-in user is subscribed. Needs `GET`/`PUT
   * /api/users/:id/email-preferences` behind `requireSelf` — contract in
   * `services/api/emailPreferences.ts`, asserted by its test. Switch this on
   * once the handler answers, and delete the flag once it has been exercised
   * against the deployed API.
   */
  'email-preferences': false,

  /**
   * **Thread sequences** (CON-196 / CON-284) — a post on X or Threads that
   * publishes as a chain of connected posts rather than one.
   *
   * Zernio takes one on both networks as `platformSpecificData.threadItems`:
   * "the first item is the root post and subsequent items become replies in
   * order", each item carrying its own text and its own media
   * (docs.zernio.com/platforms/threads, /platforms/twitter).
   *
   * **The back end shipped this twice, and the second time it agreed with us.**
   *
   * R1 (ogen#140) stored a thread as `posts.thread_segments`, an array the
   * client authored message by message, and restamped `content` from the first
   * of them on every save. That last line was the one assumption the two sides
   * did not share: here the chain is *derived from the body*, so `content` is
   * the source and the restamp replaced it with message one. It would have cost
   * every reader that does not know about threads — the calendar card, the
   * posts table, search, versions, the assistant — a one-message post.
   *
   * **R2 (ogen#144, merged 2026-09-10) inverted it.** `posts.content` is now
   * the canonical thread body, exactly as typed, and `thread_segments` is the
   * server's own arithmetic over it, recomputed on every write by
   * `platforms.SplitThread`. That is the model this client already had, so what
   * changed here is not the shape of the feature but *who owns the cut*:
   *
   * - `thread_segments` is **ignored** on a write, so `postToPayload` no longer
   *   carries it and the editor no longer keeps it in step. Saving the body is
   *   saving the thread.
   * - The splitter that used to live in `lib/threadSequence` is **gone**, and
   *   `POST /api/posts/thread/preview` answers in its place
   *   (`useThreadPreview`). That was not tidying: ours broke at every blank
   *   line and took `***` as a divider, and the server does neither, so the two
   *   disagreed about most bodies — and the server's is the one that publishes.
   * - `segment_index` is optional, with NULL meaning the root message, so a
   *   file nobody moved needs no index written for it.
   *
   * One consequence worth knowing before this goes on: **a message can be too
   * long again**. In manual mode — any body carrying divider lines — the
   * author's breaks are obeyed and the ceiling is not applied, so an over-long
   * message is reported rather than cut. The old promise that a thread has no
   * length state to report belonged to the splitter that left.
   *
   * With this off, **neither X nor Threads offers the type**
   * (`buildPlatformView` and `releasedPostTypes` drop it on both), nothing asks
   * for a preview, and this client sends the same PUT it sends for any other
   * post type. What the flag cannot switch off is the server: a post already
   * stored as a `thread` still has `thread_segments` recomputed and validated
   * by R2 on every save, whatever this build shows.
   *
   * X's was unflagged until 2026-09-16, on the rule that a flag may not change
   * what happens when it is off — the app had always offered it. That rule was
   * retired here deliberately, because the state it protects no longer exists:
   * R2 is **deployed**, so the server derives `thread_segments` from the body
   * and gates on them whatever this build does. "As before" is therefore not
   * ours to preserve, and what was left in its place was worse than the type's
   * absence — a body under the ceiling is refused as a thread of one with no
   * row on screen explaining it, and a longer one is packed into a chain by
   * length that the author cannot steer, because their dividers never arrive.
   *
   * An existing `thread` post is not renamed or rewritten: `getPostTypeLabel`
   * reads the whole dictionary rather than the released slice, and a thread is
   * the same one Markdown body as every other post type. Only the picker stops
   * offering the type. What the flag adds on top is the note under the editor,
   * the per-thumbnail picker and the row in the pre-publish bar.
   *
   * Nothing outside the flag reads anything new: `doc.content` is still the
   * post's words, unchanged and un-rewritten, so the calendar, the posts table,
   * search and the assistant are untouched by this.
   *
   * **Waiting on one server fix** (raised on CON-284, 2026-09-16, after the
   * first run against the live R2 build). `platforms.isRuleLine` accepts three
   * or more **hyphens** and nothing else, but the divider this app writes is
   * `***`: the body is authored in BlockNote, whose Markdown serialiser emits
   * `mdast-util-to-markdown`'s default rule marker — and it normalises a typed
   * `---` to `***` as well, so there is no way for an author to get a hyphen
   * rule into the body at all. Verified end to end: `One\n\n---\n\nTwo` comes
   * back from the preview endpoint as two segments, `One\n\n***\n\nTwo` as one.
   * Every thread this client can author is therefore a single message with a
   * literal `***` in the middle of it. The ask is to widen `isRuleLine` to the
   * CommonMark thematic break (`-`, `*` or `_`); normalising here instead was
   * refused on purpose, because it would put an opinion about delimiters back
   * in the client that R2 had just taken out, and `content` is now the stored
   * canonical body — we would be rewriting what the author typed.
   *
   * Also raised there, and **not** blocking this flag: `char_count` measures
   * the raw Markdown, so `[Ogen](https://getogen.com)` costs 27 of 280 and the
   * auto-split will cut inside a markup run (`**`+280×`a`+`**` splits into an
   * unclosed message and an orphaned `aa**`). Whether that is a counting bug or
   * evidence we publish raw Markdown to Zernio is the server's to answer, and
   * it is not thread-specific — every post type measures `post.Content` the
   * same way.
   *
   * Switch this on once the divider lands, and re-test from the two pieces with
   * no client-side history: the preview endpoint under a fast typist, and
   * `segment_index` on the upload and its PATCH.
   */
  'thread-sequence': false,

  /**
   * *Show cards as image previews* in Calendar Settings — the one switch in
   * that panel, and the calendar-wide answer the per-view `image` field is
   * copied from (`useCalendarSettings`).
   *
   * **Waiting on:** CON-247. The switch has never done anything and could not:
   * a card's only image source is `post.media_urls`, and nothing writes it.
   * Editor uploads land in `post_attachments`, which `GET /api/campaigns/:id/
   * posts` does not join — and that table's `thumbnail_url` is a 15-minute
   * presigned GET, so copying one into `media_urls` would store a URL that is
   * dead within the hour. The fix is the server's: a thumbnail on the post list
   * payload, from a durable key the way `assets` already does it.
   *
   * So this is a flag over a control rather than a feature — it was on by
   * default and inert, which is worse than absent: a switch that is already
   * *on* tells the user the pictures are missing for some other reason, and the
   * one thing it can't be read as is "not built yet". Hidden, the panel stops
   * making a promise the calendar can't keep.
   *
   * Nothing else changes with it off. The stored preference is left alone, so
   * whatever a user set comes back when this is switched on, and the card
   * renders exactly as it does today either way — it has no picture to draw.
   *
   * Switch this on when the payload carries a thumbnail, and re-test against
   * a real one: the card reserves a band for the image and the month view only
   * offers it where a cell has room (`cardRungs`), neither of which has ever
   * been seen with an actual picture in it.
   */
  'calendar-card-images': false,

  /**
   * **Auto post type** — the post works out its own format from what is in it,
   * instead of asking the author to name one first.
   *
   * Picking between "Text post" and "Image post" is not a decision anybody sets
   * out to make; it is what a post already *is* once the words and the files
   * are there. So Auto is the default, the app reads the body and the
   * attachments and names the format itself, and re-names it as the post
   * changes — attach a picture to a text post and it becomes an image post
   * without anyone touching the picker.
   *
   * **Not waiting on an endpoint.** Auto is the empty `platform_post_type` a
   * post is already created with (`useAddPost` sends a campaign and a date and
   * nothing else); the resolution is derived on every render and written to the
   * record as the post leaves `draft`, which is as long as the server will hold
   * an empty type. Nothing new is stored and no column
   * is missing. The flag is here because this changes what that empty string
   * *means* on four surfaces that have always read it as "broken" — the checks
   * bar, the quick-settings picker, the calendar card and `hasVisibleProblem` —
   * and because the ladder itself is a claim about the server that has not met
   * a running one.
   *
   * **What to look at when it does**, in the order that decides whether it
   * ships:
   *
   * 1. **The seeded rules are the whole input.** `lib/postTypeAuto` walks
   *    `GET /api/platforms/:id/post-type-rules` and picks the loosest rung the
   *    post already satisfies, so a rule that is seeded loosely — a
   *    `max_content_chars` of 0, an `allowed_kinds` nobody filled in — makes
   *    Auto choose a type the server then refuses at schedule time. The fit
   *    predicate mirrors `platforms.ValidatePostType`; it has been read off the
   *    Go source, never exercised against it.
   * 2. **`text-post` is the rung everything rests on**, and CON-206 plans to
   *    merge it into `image-post` with `min_attachments: 0`. That does not
   *    break Auto — the walk would simply stop one rung earlier — but it
   *    changes what every post resolves to, so the two want testing together.
   * 3. **A chain is deliberately not an answer yet.** `thread` is only a rung
   *    while `thread-sequence` is on, because until the submit path sends
   *    `threadItems` a thread publishes as one post with the whole body in it
   *    (CON-196) — so resolving to it would quietly truncate. With both flags
   *    off, three thousand characters on X reports "too long", which is right.
   *
   * With this off, the empty post type means exactly what it always did: a
   * `fail` in the checks bar, a warning mark on the card, and a picker that
   * asks. A post that already carries a type is untouched either way.
   */
  'post-type-auto': false,

  /**
   * Deleting one saved version of a post, from the version-history panel
   * (CON-168). Off until the API grows `DELETE /api/posts/:id/versions/
   * :versionId` — `handlers/posts.go` registers `GET`/`POST` on `/versions`
   * and `POST /restore` and nothing else, so the call 404s today. Requested on
   * CON-44; the client, the menu item and the confirm step are already written.
   */
  'post-version-delete': false,

  /**
   * Workspace tiers — what the plan a workspace is on allows, and how the app
   * says so when it doesn't (CON-232). **Off — waiting on the back end.**
   *
   * Note what this flag is and isn't. A flag decides whether a feature is built
   * yet; it is never who is allowed to see what. That is exactly why tiers get
   * their own seam (`useEntitlement`) instead of entries in this file: the
   * question "has anyone paid for this" is the server's, answered per
   * workspace, and it would be wrong here even once the endpoint exists. This
   * flag switches off *the asking*, not the answer.
   *
   * **Waiting on:** `GET /api/entitlements` — the resolved tier plus its
   * allowances, contract written out in `services/api/entitlements.ts` and
   * asserted by its test. CON-208 (tenant tiers and groups) and CON-86 (usage
   * metering and per-tenant cost limits) are both done server-side, so the
   * tiers and the counters exist; what is missing is a workspace-scoped REST
   * read that puts them together. Three things it must carry that are easy to
   * leave out:
   *
   * 1. **The resolved numbers, not a tier name.** Tiers are versioned and
   *    configurable and a workspace keeps the version it bought, so the name is
   *    a label two workspaces can share while holding different allowances.
   * 2. **`scheduled_change`.** A downgrade lands at the next billing boundary,
   *    so the workspace is on one tier while another is already bought. The
   *    client cannot derive it and must not try.
   * 3. **`used` beside every `limit`.** Without the counter the UI can only
   *    apologise after the click instead of disabling the control.
   *
   * And one thing that belongs elsewhere: a downgrade suspends rather than
   * deletes, and the server picks which campaign goes read-only — so the
   * `suspended` flag has to ride on the resource. The client must never work it
   * out by counting, or it picks a different victim than the server did.
   *
   * With this off nothing asks, nothing renders a lock, and every feature is
   * available exactly as it was before tiers existed.
   *
   * **Turn it on locally to look at it, and turn it back off before you
   * commit.** The plan screen and the billing card are driven by a
   * `localStorage` stub (`services/api/tiers.stub.ts`) so the tier
   * differentiation can be built and reviewed; a stub is not a reason to ship
   * the feature on.
   */
  'workspace-tiers': false,

  /**
   * Ideas — the module between a brief and a post, at both levels.
   *
   * A stub, and deliberately a whole one: the nav it completes is the point of
   * it. The workspace level answers "what could we make", the campaign level
   * answers it for one campaign, and until this shipped the rail had a gap
   * where every other module has a pair. What is behind the flag is two pages
   * that say what they will hold and nothing else.
   *
   * There is no backend at all — no model, no endpoint. Switch this on when an
   * idea is a row, not before: a page that cannot persist what you type into
   * it is worse than one that admits it isn't built.
   */
  ideas: false,

  /**
   * The workspace's calendar — every campaign's posts on one grid.
   *
   * The campaign already has one (`/campaigns/:id/calendar`), which is the
   * whole feature *for one campaign*; this is the same view with the filter
   * taken off, and it is the workspace's twin of it in the rail. A stub for
   * now, because "every campaign's posts" is a query nobody has written: the
   * posts endpoint is campaign-scoped, so this needs either a workspace-wide
   * range query or N of them, and N grows with the workspace.
   */
  'workspace-calendar': false,

  /**
   * The facts ledger — `/foundation/facts` and the guardrails stance.
   *
   * The statements are real (`guardrails.facts` on the wire, same field the
   * generator reads), but everything the ledger adds *around* them lives in a
   * `localStorage` sidecar (`services/api/brandLocal.ts`): the subject/kind
   * filing, the source, and — the point of the table — the added/checked/
   * expires dates. An expiry date one browser wide is decoration, and the
   * "no guardrails by design" stance is a decision a workspace takes, not a
   * preference a browser holds.
   *
   * Off: facts stay editable as the plain statement list inside the
   * guardrails editor, exactly as before the ledger existed, and the stance
   * UI does not render. On: the guardrails editor hands the statements to the
   * ledger and shows the stance.
   *
   * **Waiting on** a backend home for the metadata (columns beside
   * `guardrails.facts`, or a table of its own) and a stance field —
   * `PUT /api/brand/guardrails` 422s an all-empty body precisely so `DELETE`
   * stays the only route to `null`, which is why "empty by design" has
   * nowhere to be recorded today.
   */
  'facts-ledger': false,

  /**
   * The contextual help centre (CON-173) — the drawer, its triggers and the
   * `#help/<key>` deep link. **Off — waiting on content, not on an endpoint.**
   *
   * There is no API to wait for: articles live in the Sanity project
   * `getogen.com` already runs, and the app reads them from the public
   * `production` dataset. What is missing is the reading itself —
   * `services/help` serves fixtures today, because the starter articles were
   * bootstrapped into the private `staging` dataset that a browser cannot
   * authenticate against. Switching on means seeding `production`, registering
   * the app's origins for CORS (without credentials — it only ever reads), and
   * replacing the two functions in `services/help/index.ts` with the GROQ
   * query. Delete the flag once the drawer has been exercised against the real
   * dataset.
   */
  'help-center': false,
} as const satisfies Record<string, boolean>

export type FeatureFlag = keyof typeof FEATURE_FLAGS

/** Every flag this build declares — what the dev-tools panel enumerates. */
export const FLAG_IDS = Object.keys(FEATURE_FLAGS) as FeatureFlag[]

/**
 * The value in force: the build's, unless this browser has been told otherwise
 * on staging or in dev. `readFlagOverrides()` is `{}` in production, where this
 * is a property lookup and nothing else.
 */
function resolve(flag: FeatureFlag): boolean {
  return readFlagOverrides()[flag] ?? FEATURE_FLAGS[flag]
}

/**
 * What this *build* says, ignoring any override.
 *
 * For the staging flag panel alone, which has to show both answers to be worth
 * opening — hence a named accessor rather than exporting the record, which
 * stays private for the reason above. Anything deciding whether to render a
 * feature wants `useFeatureFlag`.
 */
export function buildFlagValue(flag: FeatureFlag): boolean {
  return FEATURE_FLAGS[flag]
}

/** Whether a feature is built and shown. */
export function useFeatureFlag(flag: FeatureFlag): boolean {
  return resolve(flag)
}

/** The same answer outside React — for loaders, guards and plain functions. */
export function isFeatureEnabled(flag: FeatureFlag): boolean {
  return resolve(flag)
}
