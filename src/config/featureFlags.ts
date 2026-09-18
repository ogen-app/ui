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
   * **On.** The producers it was waiting for are shipped: CON-285 (ogen#161,
   * merged 2026-09-17) completed the durable notification vocabulary — the
   * assistant, assessment, content-plan and URL-crawl resolutions all write
   * rows now — and the two recipient rulings taken on 2026-09-06 are
   * implemented rather than merely decided. `post.published` and
   * `post.publish_failed` go to the whole workspace through `EmitToUsers`
   * (`submit_post_to_zernio.go`), which is what stopped turning this on from
   * *narrowing* who hears that a publish failed. The same PR gave the daily
   * report server-side endpoints (`GET /api/activity/report/:date?tz=`,
   * `/api/activity/reports`), so the count is computed where the rows are —
   * and this client reads them rather than adding posts up itself, which is
   * what CON-285's decision note reversed out of CON-225 §5. Both calls carry
   * the browser's IANA zone, because a report is cut into *local* calendar
   * days and that is the one thing the server cannot know; the shapes are
   * pinned by `services/api/activity.test.ts`.
   *
   * **Exercised against the real API** on 2026-09-04 and again on 2026-09-07,
   * against a local build of `main`: a real `connection.action_required` row
   * read over REST and rendered from the catalogue, replay served against
   * `Last-Event-ID` (strictly `>`, ascending; an unparseable cursor is
   * live-only with a 200, one ahead of the log replays nothing), click-through
   * `PATCH`, and `mark-all-read`'s `before` bound proved on both sides. What
   * was still unobserved then was **live push** and the replay→live dedup
   * (`n.Seq <= lastSentSeq`), which needed a triggerable producer — and
   * CON-285 is that producer. Paging past page one is untested too.
   *
   * **Known and deliberately not blocking**, in the order they will bite:
   *
   * 1. **The `recycle` frame is not handled.** ogen#142 gave connections a
   *    30-minute lifetime and made the subscriber cap self-healing (the hub
   *    evicts a user's oldest subscription rather than refusing the newcomer;
   *    ogen#152 then raised it 10 → 30, because ten counted across *both*
   *    streams). So a clean close mid-session is now routine — twice an hour
   *    per tab, plus any eviction — and a clean close is exactly what a
   *    dropped connection looks like. ogen#152 ships the one thing that tells
   *    them apart, a frame sent before the close:
   *
   *        event: recycle
   *        data: {"reason":"lifetime"}
   *
   *    deliberately with **no `id:` line**, so it does not advance the replay
   *    cursor. `lib/streamConnection` does not listen for it, so every recycle
   *    runs the full recovery path — flush autosaves, invalidate the routing
   *    table, *"Catching up…"* when nothing was down. Correct, and noisy; this
   *    feature's second stream per tab is what doubles the noise.
   *    `docs/sse.md` carries the measurements.
   * 2. **No producer for "never published".** `not_published` is a real
   *    outcome with no notification type, so it leaves no row — it is counted
   *    in the day's report and nowhere else.
   * 3. **The report's day boundary is unobserved.** Whether the day the server
   *    cuts agrees with the day this client groups under is only visible
   *    across a real local midnight, and whether `by_author` ids match
   *    `listMembers` needs a workspace with two people in it. Both should
   *    hold — the zone sent as `tz` is the zone `dayKey` groups by, and the
   *    ids are the same per-workspace membership ids — but neither has been
   *    watched happen.
   *
   * **Three things the report endpoints deliberately do not carry**, none of
   * them blocking: a **per-campaign breakdown** (the computed report had one
   * for free, because it held every post; the server's shape is CON-225 §5 and
   * a campaign's own report is the same endpoint with `campaign_id` set); **a
   * code for a failure** — `failure_reason` is Go prose, so the report shows
   * it verbatim the way a notification's `title` is shown, and the ask is the
   * same one `lib/uploadError` is waiting on (`docs/open-questions.md` S4);
   * and **paging**, since `before` is a keyset the feed does not use — it asks
   * for one horizon of days and says on screen where it stops.
   *
   * The whole recipient taxonomy — every type, its trigger, its transport and
   * who hears it — is written out in `docs/events.md` rather than
   * reconstructed from here.
   *
   * Delete this flag, and the off-branch under it, once the feature has met a
   * deployed workspace and nobody has reached for the switch.
   */
  activity: true,

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
   * dimension and shipped ahead of this one — unflagged since 2026-09-18, with
   * the mappers from these wire shapes onto the view models written and
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
   * **On.** Nothing was ever waiting on an endpoint: Auto is the empty
   * `platform_post_type` a post is already created with (`useAddPost` sends a
   * campaign and a date and nothing else); the resolution is derived on every
   * render and written to the record as the post leaves `draft`, which is as
   * long as the server will hold an empty type. Nothing new is stored and no
   * column is missing. The flag existed because this changes what that empty
   * string *means* on four surfaces that had always read it as "broken" — the
   * checks bar, the quick-settings picker, the calendar card and
   * `hasVisibleProblem` — and because the ladder was a claim about the server
   * read off the Go source rather than exercised against it.
   *
   * **That claim was checked against `ogen` `origin/main` before this went on**,
   * and two of the three worries on the old list turned out not to exist:
   *
   * 1. **The rules are not seeded.** `postTypeRules` in
   *    `domain/platforms/post_types.go` is a hard-coded table keyed by slug, and
   *    `ResolvePostTypeRules` projects it onto the wire — so a rule "seeded
   *    loosely" is not a thing that can happen to `allowed_kinds`, `min_` or
   *    `max_attachments`. What *is* per-platform is which slugs are offered and
   *    the three constraint blocks the sentinels resolve against. And
   *    `max_content_chars` cannot arrive as `0`: `resolveMaxContentChars`
   *    returns a value only when the limit is positive, so unbounded is `null`
   *    on the wire and nowhere else.
   * 2. **`fits` mirrors `ValidatePostType`, with one rule deliberately left
   *    out.** CON-148's `requires_video_title` refuses an untitled video on a
   *    platform whose `video_constraints` ask for one. That is YouTube alone,
   *    and YouTube offers `video` and `short` — both video-kind, both bound by
   *    it — so no choice Auto can make avoids the rule and modelling it would
   *    change no answer. If a platform ever offers a titled video type beside
   *    an untitled non-video one, this is the line to add.
   *    `max_title_chars` is out for the same reason: it fails every candidate
   *    equally, so it is not a choice.
   * 3. **`requires_content` is an exact mirror**, which is not obvious from
   *    the two sources: the server trims before testing for empty
   *    (`strings.TrimSpace(FlattenSocialText(…))`) and the character ceiling
   *    does not (`VisibleLen`), so a whitespace-only body looks like it could
   *    be long and empty at once. It cannot — both flatteners end in a trim, so
   *    `shape.chars === 0` answers the same question. Tested on this side.
   *
   * **What is left is a live run**, and two things to watch when it happens:
   *
   * - **`text-post` is the rung everything rests on**, and CON-206 plans to
   *   merge it into `image-post` with `min_attachments: 0`. That does not break
   *   Auto — the walk would stop one rung earlier — but it changes what every
   *   post resolves to, so the two want testing together.
   * - **The chain rung is the newest thing here.** `thread` is a rung wherever
   *   the rule says `segmented`, which arrived with the `thread-sequence` flag's
   *   removal rather than with this feature, so the two shipped in the same
   *   window and neither has watched the other choose.
   *
   * A post that already carries a type is untouched, and pinning is still
   * one-way: reopen to draft and it keeps the slug it resolved to.
   */
  'post-type-auto': true,

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
   * Was two `PageNotBuiltYet` stubs that completed the rail's pairing; it is
   * now the working module — a capture box, three verdicts given on the row
   * itself, and four counts to switch piles by, at the workspace level and
   * narrowed to one campaign. **Off — waiting on the back end.**
   *
   * **Waiting on:** `/api/ideas`, which does not exist. No table, no endpoint,
   * no column. The contract is written out in full in `services/api/ideas.ts`
   * — five calls, and the two rules the server has to own rather than trust the
   * client with (`remind_at` belongs to `later` and is cleared by every other
   * verdict; a woken idea is still `later` in the database, with "back in the
   * inbox" derived at read time). `services/api/ideas.stub.ts` answers them off
   * `localStorage` so the screen can be built and *used* first, which is the
   * only way to find out whether triage this shape is actually faster.
   *
   * The stub is why this stays off rather than being a judgement call. It is
   * per browser: the backlog this module is entirely about sharing is shared
   * with nobody until the endpoints land, and a teammate opening the same
   * workspace sees an empty list. That is a worse lie than an unbuilt page.
   *
   * Two things the API will decide that the client has guessed at, and both
   * should be re-read against the real thing under rule 4:
   *
   * 1. **Whether a verdict is a field or an endpoint.** It is separate here so
   *    a decision cannot ride along with an edit — the argument that keeps
   *    archive off the campaign PUT — but the server may reasonably fold it in.
   * 2. **What *yes* leads to.** Nothing, today: an accepted idea can be filed
   *    onto a campaign and that is all. Promotion — an idea becoming a post, or
   *    a brief — is the next ticket and the reason to want `POST
   *    /api/ideas/:id/promote` rather than to have the client create the post
   *    and hope the link survives.
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

  /**
   * Series — the recurring things a workspace makes, and what each campaign
   * runs of them (CON-264).
   *
   * A series is a **standing instruction**: a name, and how one is built. "This
   * day in finance history", "Weekly news digest". It is re-read every time it
   * produces a post and never finished, which is what makes it Foundation
   * material rather than an idea — an idea is inventory and gets spent.
   *
   * The word people arrive with is *content pillar*, and it means at least four
   * incompatible things (broad themes, mix ratios, recurring segments, message
   * pillars). This models the third, because it is the only one a generator can
   * act on and the only one analytics can group by. A theme collapses into it —
   * "People who made an impact" is a series with a person-shaped slot — so one
   * object covers both readings without a second table.
   *
   * **The definition is the workspace's, the run is the campaign's.**
   * `/foundation/series` is the library; a campaign picks from it and gives each
   * a rhythm on its **Strategy** page (`CampaignSeriesCard`), which is where all
   * the work happens. A campaign may also define one locally and promote it once
   * it proves it recurs, so the library fills from use instead of being seeded
   * with four generic nouns at onboarding.
   *
   * That card was a band on the campaign's Foundation page until CON-305, when
   * the documents became their own module and took the page with them. The mix
   * is still derived and never typed: rhythms are set per series, the share is
   * computed against `postGoalTotal`, and the sentence stating it is printed
   * once, under the post goal. There is deliberately no percentage picker — a
   * mix you type is a plan you break in week two, and a mix you derive is a
   * fact.
   *
   * **Waiting on** a workspace-scoped `brand_series` table, `series_ids` plus a
   * per-series rhythm on the campaign — **attached and detached, never
   * restated**, for the reason CON-233 gives about `asset_ids` — a nullable
   * `series_id` on the post, and analytics grouped by it, which is the "for
   * insights" half of the ticket. Everything above the stub in
   * `services/api/series.stub.ts` is written against the signatures those will
   * have.
   */
  series: false,

  /**
   * Content formats — how-to, explainer, listicle, digest (CON-264).
   *
   * **A vocabulary, not a library.** A fixed table in `lib/contentFormats.ts`
   * and a picker, with no page, no CRUD, no empty state and no Foundation
   * section. That is the whole difference between this costing nothing and it
   * being a second Series.
   *
   * A fixed list is enough because a bare format label already carries a recipe
   * — the vocabulary is shared with the model, so "how-to" implies an opening,
   * a numbered middle and a takeaway in a way "Education" never implies
   * anything. It is the one axis here that needs no configuration to be useful,
   * which is why it is a separate flag: it pays off in a workspace that has
   * never opened the Series page.
   *
   * **Not `platform_post_type`.** That is the container — carousel, reel,
   * thread — and it is already modelled and already derived (`post-type-auto`).
   * This is the rhetorical shape, and a how-to can be any container at all. The
   * two never compete for the same decision.
   *
   * Optional everywhere, on purpose: a post may have no format, and nothing
   * warns about it. Forcing the classification is the mistake CON-210 paid for
   * with its three-mode source picker.
   *
   * **Waiting on** a nullable `content_format` column on the post (and on the
   * series, when that flag lands — a series pins one and its posts inherit it).
   * Until then a post's format lives in a `localStorage` sidecar
   * (`services/api/contentLocal.ts`), which is per browser and must not ship
   * that way.
   */
  'content-formats': false,
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
