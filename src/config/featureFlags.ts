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
 */
import { readFlagOverrides } from './flagOverrides'

const FEATURE_FLAGS = {
  /**
   * Activity (CON-225): the sidebar item, the feed, and the daily report — the
   * workspace's answer to "what happened since I last looked?".
   *
   * **Waiting on:** the notifications subsystem, CON-224. Nothing persists a
   * thing that happened today: `/api/events` is an invalidation bus with
   * at-most-once delivery and no event log (`docs/sse.md`), which is
   * disqualifying for a feature whose premise is that you were not looking. So
   * Phase 1 *derives* its entries from the batched campaign summaries instead
   * — which means only post outcomes can appear, and an entry disappears if
   * the post behind it changes. The two things the feed is most wanted for,
   * "your long run finished" and "this connection expired", leave no trace in
   * that projection and are missing until the table exists.
   *
   * The daily report is the half that is not a stand-in: it is a count over
   * posts, correct as computed, and it stays when CON-224 lands.
   *
   * Switch this on once `GET /api/notifications` answers and the feed has been
   * re-tested against recorded events rather than derived ones. See
   * `docs/activity.md`.
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
   *     nothing else happens; there is no channel to notify them on until
   *     CON-224.
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
   * The Goals card in campaign settings: the post rate the campaign is planned
   * against. On — CON-182 landed `goal_cadence` beside `estimated_post_count`
   * and the content-plan flow generates against the pair. Delete this flag once
   * the card has been exercised against the deployed API.
   */
  'campaign-goals': true,

  /**
   * The Scheduling card in campaign settings: publishing time, time zone,
   * spread, and the days the campaign publishes on. On — CON-181 landed the
   * four columns and the content-plan flow places every draft by them. Delete
   * this flag once the card has been exercised against the deployed API.
   */
  'campaign-scheduling': true,

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
   * **Waiting on:** a campaign dimension on `GET /api/analytics/posts`. The
   * endpoint filters by `platform` and nothing else (`handlers/analytics.go`),
   * and its `overview` block totals the whole *workspace* — so a campaign
   * screen cannot ask the server its own question. Until it takes a
   * `campaign_id` (or the rows carry one), the page fetches one 100-row page,
   * intersects it with the campaign's posts client-side, and sums the rows
   * itself; the server's `overview` is deliberately ignored. Beyond ~100
   * measured posts in a workspace that is no longer complete, which is why
   * every surface states its coverage.
   *
   * The content is a first cut besides: only the stored post series is wired.
   * `/followers`, `/best-times`, `/content-decay` and `/posting-frequency`
   * exist and are typed but unused.
   *
   * Switch this on once `GET /api/analytics/posts` can be asked about one
   * campaign, re-test the totals against the real thing, and delete the flag
   * once the section has been exercised against the deployed API.
   */
  'campaign-analytics': false,

  /**
   * **Brand** — the workspace-level material every campaign writes from
   * (CON-226/227): voices, audiences, guardrails, look, overlays. Further from
   * the API than anything else here: there is no endpoint, no table and no
   * column, and `services/api/brand.ts` is a **stub** — a JSON seed and
   * `localStorage` standing in for a server so the screens can be used rather
   * than only looked at.
   *
   * The flag gates the nav row *and* the route, so with it off the app has no
   * Brand at all — which is the state `develop` ships in while the shape is
   * still being argued in `/design/brand`.
   *
   * **Off, and it stays off until CON-228 lands.** Nothing in here is backed
   * by a server: a workspace's voices would live in one browser, on one
   * machine, and vanish with its site data. Switching it on before the
   * endpoints exist would ship a feature that quietly forgets — and a
   * workspace's brand rules are the last material anyone would expect to
   * retype. Turn it on locally to work on the screens; turn it back before you
   * push.
   *
   * **Waiting on:** everything in CON-228. In outline — Brand entities per
   * workspace, tenant-scoped and fail-closed; one fetch that returns **every
   * slot including the empty ones**, because an omitted key and an empty slot
   * are different things on this screen; a voice reference plus a local delta
   * on the post (replacing free-prose `toneNotes`) and on the campaign
   * (replacing `tone_guidelines`); the generation flows reading guardrails
   * always, the assigned voice per post, the audience per campaign; and binary
   * handling for logos and overlays, where SVG is the open question (CON-132
   * §10.4).
   *
   * Nothing outside this flag may read any of it. CON-226's shape is still
   * moving, and per the global rule a half-defined field read by another
   * screen is worse than a missing one — which is exactly what happened when
   * `campaignReadiness` read `estimated_post_count` mid-redefinition.
   *
   * **The copy is deliberately not in the i18n catalogue yet** — the one
   * exception to the new-UI rule, decided at merge (2026-08-28), not drifted
   * into. The screens' wording is still being argued alongside their shape,
   * and cataloguing it now means retranslating every catalogue on every copy
   * iteration. The conversion happens with the CON-228 pass, before this flag
   * flips — the same pass that re-tests the UI against the real endpoints.
   *
   * The argument this is built from: `docs/brand-materials.md`.
   */
  'brand-materials': false,

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
   * Uploading images into the Content Bank (CON-16) — an asset that *is* a
   * picture, rather than a picture pasted inside a document.
   *
   * **The server answers now** (CON-246, ogen#129, merged 2026-09-01): the
   * upload endpoint takes JPEG/PNG/WebP/GIF, `assets_type_check` allows `IMG`,
   * and `AssetFile` carries `url` for the original — which was the decision the
   * viewer was waiting on, settled as `url` rather than `original_url`. The
   * asset also gained `alt_text`, and the file gained the `width` / `height` /
   * `is_animated` / `checksum_sha256` columns `post_attachments` already had.
   *
   * What is still missing is a *thumbnail* job, so an image asset's preview is
   * the full file scaled down (`lib/assetPreview`). That is a cost, not a gap
   * in the contract: `thumbnail_url` is already preferred wherever it appears,
   * so the day one is rendered nothing here changes.
   */
  'content-bank-images': true,

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
