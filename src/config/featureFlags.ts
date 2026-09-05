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
   *    needs no change, so what is left is rule 4 rather than work: open the
   *    inbox against it once and confirm the three things the 0 made
   *    unobservable — replay advancing across a reconnect, `mark-all-read`'s
   *    `before` actually bounding (the client sends the highest seq it has
   *    been shown, and a real bound is what stops it marking a row that
   *    arrived after the click), and paging past page one.
   * 2. **Fan-out.** Every producer writes to the thing's `created_by`
   *    (`submit_post_to_zernio.go`), so a post failing to publish is news to
   *    whoever made it and to nobody else. The derived entry it replaced was
   *    visible to the whole workspace, so turning this on as it stands
   *    *narrows* who hears about a failure. `notify.EmitToUsers` already
   *    exists and the connection-expiry producer reaches every owner with it —
   *    this is a decision at one call site, not a missing capability.
   * 3. **`post.published` is emitted, and CON-224 said it must not be.**
   *    Successful auto-publishing is the highest-volume thing that happens, and
   *    rolling it into one computed daily entry is the argument the whole
   *    report rests on — a workspace posting three times a day across five
   *    channels writes fifteen "it worked" rows, which is how a badge stops
   *    being read. The client does *not* filter them: the count comes from the
   *    server, and a feed hiding rows the badge still counts is worse than a
   *    noisy feed. It needs deciding at the emit site.
   * 4. **A producer for "never published".** `not_published` is a real outcome
   *    with no notification type, so it now leaves no record at all. It is
   *    counted in the day's report and nowhere else.
   *
   * 1 is now the cheapest of the four and nothing else is blocked on it; 2 and
   * 3 are the ones that decide whether this reads as better than Phase 1 or
   * worse, since as it stands a post's author hears about every success and
   * nobody else hears about the failures. None of them is a reason to change
   * the client.
   *
   * **Answered since:** whether the `/api/events` crash reaches this stream —
   * it does not, and it no longer reaches `/api/events` either. CON-158
   * detaches a logging context before the writer goroutine starts, and
   * `handlers/notifications.go` was written to that pattern from the first
   * commit: the last `c.Context()` in the file is the call installing the
   * writer. Re-read against `ogen` `main` 2026-09-05; finding 5 in
   * `docs/sse.md` carries the diagnosis and the fix.
   *
   * One thing the pass turned up that is **not** this feature's fault, but is
   * made twice as likely by it: `eventhub` caps a user at 10 concurrent
   * subscriptions across *both* streams, and a dropped connection holds its
   * slot until the server's next heartbeat write notices (20s). A reload
   * therefore orphans two slots where it used to orphan one, and both streams
   * answer 429 and back off until the slots free — reproduced on `/api/events`
   * as well, so it predates this. The backoff rides it out; a tighter cap or a
   * faster reap would not have to.
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
   * tested. Three of their fields still have no wire source at all — per-post
   * `matured`, the performers' `curve`/`typical`, and the `save_rate` and
   * `follow_rate` criteria (`/performers` reports no saves or follows) — and
   * each surface states that where it would otherwise draw them. This flag is
   * waiting on the campaign dimension, nothing else.
   * See `docs/analytics-contract.md`.
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
   * are complete: written here, stored server-side, and — as CON-245 lands —
   * read by the flows that write posts. Look and Templates are **not offered**
   * (`shown` in `lib/brandSections`): their endpoints exist and their screens
   * render, but nothing writes them from the UI and the image flows that would
   * consume them are CON-105/CON-132. Two Overview cards that cannot be filled
   * in and would change nothing if they were teach the user that the screen is
   * a mock-up, which is the one thing this module cannot afford to say.
   *
   * `usage` counts and `summary` lines arrive as zeroes and empty strings until
   * CON-245 and the summary job land. That is not a bug to hide: the screens
   * already draw "nothing has been written in this" as a designed state, and it
   * is true.
   *
   * **Outstanding: the copy is still not in the i18n catalogue.** It was
   * deferred at the 2026-08-28 merge on the argument that the wording was being
   * argued alongside the shape and cataloguing it meant retranslating on every
   * iteration — with the conversion promised before this flag flipped. The flag
   * has flipped first. The debt is real and it is the whole module's user-facing
   * text; it does not block anyone from using Brand in English.
   *
   * The argument this is built from: `docs/brand-materials.md`.
   */
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
   * **Thread sequences** (CON-196) — a post on X or Threads that publishes as
   * a chain of connected posts rather than one.
   *
   * Zernio takes one on both networks as
   * `platformSpecificData.threadItems`: "the first item is the root post and
   * subsequent items become replies in order", each item carrying its own text
   * and its own media (docs.zernio.com/platforms/threads, /platforms/twitter).
   * That is the format this is built against, and it is the whole reason the
   * feature can exist at all.
   *
   * **Waiting on four things, all server-side.**
   *
   * 1. **The field.** `SubmitRequest` in `publishers/zernio/posts.go` has no
   *    `platformSpecificData` at all, and nothing in the Go repo mentions
   *    `threadItems` — so an X `thread` post today is submitted as one blob of
   *    top-level `content` and publishes as a single post. The chain the
   *    preview card draws has never been what goes out. This is the one that
   *    makes the feature real; the rest is bookkeeping.
   * 2. **The same split, server-side.** The thread is *derived* from the body
   *    (`lib/threadSequence`) rather than stored as a list, which is the whole
   *    shape of the feature: one Markdown editor, dividers as the breaks,
   *    blank lines where there are none, and anything still past the per-post
   *    ceiling cut to fit. So the publisher has to cut `content` the same way
   *    before it fills `threadItems`, or what goes out is not what the author
   *    was shown. That is the `src/lib/*` arrangement this repo already runs on
   *    — the Go rule is the source of truth and ours mirrors it — and
   *    `splitBody`/`splitToLimit` are written to be portable for exactly that
   *    reason. Its tests are the specification.
   * 3. **A home for the media assignment.** *Which post carries which file* is
   *    the one thing a body cannot say, so it is the one thing stored: a map
   *    from attachment id to post index, under `thread-sequence.<postId>` in
   *    the tenant key/value store (`useThreadSequence`), the same stand-in
   *    `campaign-accounts` uses while waiting for its column. What that cannot
   *    do: the row is workspace-wide like every other settings key, and two
   *    people moving files on the same post in the same second means the later
   *    write wins. Losing it entirely is survivable by design — an attachment
   *    with no entry rides the first post, which is where every file rode
   *    before this existed.
   * 4. **The slug on Threads.** `supportedPlatforms` in
   *    `publishers/zernio/platforms.go` lists `thread` for `twitter` only, so
   *    a Threads thread cannot actually be *submitted* until it is added
   *    there. The UI no longer waits on it: `buildPlatformView` intersects our
   *    dictionary with what a publisher reports, and `aheadOfPublishers`
   *    (`lib/platformDictionary`) lets this flag answer in the missing slug's
   *    place while it is on — because the honest intersection hides the
   *    feature from the network it is named after for as long as the server
   *    takes to learn one word, which is the opposite of what running ahead
   *    behind a flag is for. The stand-in is itself flag-scoped: with this
   *    off the publisher is the whole answer, exactly as before.
   * 5. **Media validation counted per item.** Found testing the real screen:
   *    the server validates attachments against the *post*, so five images
   *    spread three-one-one over a chain still comes back as "post has 5 image
   *    attachments; platform allows up to 4" — a warning the author cannot act
   *    on, because no post of the thread is over. Our own count row already
   *    stands down for a thread (`mediaChecks`) and the per-post verdict comes
   *    from `planThread`, but `platform_validation` is the server's and is
   *    passed through as written — deliberately, because it is right *today*:
   *    until (1) lands, a thread really does publish as one post with every
   *    file on it. It has to become per-item at the same time the split does,
   *    or the flag turns on a screen with a permanent false alarm.
   *
   * With this off, Threads does not offer the type (`buildPlatformView` and
   * `releasedPostTypes` both drop it), nothing reads the settings key, and the
   * editor is what it always was. X keeps offering `thread`, as it always has
   * — withdrawing it would be a change with the flag off, which a flag may
   * never make. An existing X `thread` post therefore behaves identically
   * either way, because a thread is the same one Markdown body as every other
   * post type; all the flag adds is the note under the editor, the
   * per-thumbnail picker and the row in the pre-publish bar.
   *
   * Nothing outside the flag reads anything new: `doc.content` is still the
   * post's words, unchanged and un-rewritten, so the calendar, the posts table,
   * search and the assistant are untouched by this.
   *
   * Switch this on once the submit path sends `threadItems`, splits the body
   * the way we do and names the slug on `threads`, then re-test the whole path
   * against the real thing — the media assignment is the half most likely to
   * need a pass, and (5) is the one that shows up as a warning rather than as
   * a wrong post.
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
