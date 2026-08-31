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
   * The two workspace-wide surfaces (`components/analytics`) are further along
   * than the campaign one and could ship first — they need no campaign
   * dimension. What they still need is a mapper from these wire shapes onto
   * their view models, and three of their fields have no wire source at all:
   * per-post `matured`, the performers' `curve`/`typical`, and the `save_rate`
   * and `follow_rate` criteria (`/performers` reports no saves or follows).
   * See `docs/analytics-contract.md`.
   */
  'campaign-analytics': false,

  /**
   * Analytics — the workspace's own numbers (CON-237): the `/analytics` route,
   * its sidebar row, and the "What happened over last N days" card on it. Five
   * figures, the chart behind whichever is selected, and the server's
   * deterministic callouts.
   *
   * **The endpoint is real and shipped.** `GET /api/analytics/overview` landed
   * with CON-237 (ogen#125, merged 2026-08-27) and this is built against it
   * rather than ahead of it — unlike `campaign-analytics`, which is still
   * waiting on a campaign dimension the dashboard reads do not have. That makes
   * this the workspace surface that can ship first, exactly as the note on that
   * flag predicted.
   *
   * **Off because it has never been run against a live workspace.** Everything
   * here was read off the Go source, and three things want confirming before
   * the flag flips:
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
   *    checked; the card treats that as "no freshness to report" rather than
   *    printing a date in year 1.
   *
   * **Known missing, and not a defect in this UI:** the usual-range band. Every
   * card answers `baseline: "insufficient_history"` and no `band`, because the
   * long-retention rollup behind it has no tenant with enough history yet
   * (`analytics/overview/overview.go`). So the verdict lines, the cone and the
   * "usual range" key are absent, and the previous-stretch delta is the whole
   * comparison. `lib/analyticsOverviewView` reads the field rather than today's
   * absence, so the band appears on its own when the server starts sending one.
   *
   * **i18n is deferred**, deliberately and on the Brand precedent (CON-227):
   * `components/analytics/*` is hard-coded English throughout, and a translated
   * wrapper around an untranslated card is worse than either. The sidebar row
   * *is* translated, because the sidebar is converted (CON-174) and a single
   * English row in it would be the only one. Convert the analytics components
   * as one pass before this ships to a non-English workspace.
   */
  'analytics-overview': false,

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
   * Deleting one saved version of a post, from the version-history panel
   * (CON-168). Off until the API grows `DELETE /api/posts/:id/versions/
   * :versionId` — `handlers/posts.go` registers `GET`/`POST` on `/versions`
   * and `POST /restore` and nothing else, so the call 404s today. Requested on
   * CON-44; the client, the menu item and the confirm step are already written.
   */
  'post-version-delete': false,
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
