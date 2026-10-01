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
   * Tasks (CON-234): the workspace's open work, its own module directly under
   * Activity in the rail.
   *
   * Separate from Activity because they are different objects and will land
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
   * **Both reads have landed and both are wired** (CON-243, 2026-09-16).
   * `GET /api/me/entitlements` answers on the local API and on
   * `api.dev.getogen.com` with a resolved tier *version* — its immutable
   * allowance set, its price rows, and each entitlement enriched with the
   * feature catalog's own metadata. `GET /api/public/pricing` answers with the
   * same record, one per purchasable version, unauthenticated and cached at the
   * edge; it replaced a `GET /api/tiers` that was designed here and 404s. The
   * rows are the same shape, so there is one wire type and one parser
   * (`services/api/entitlements.ts`), and `tiers.ts` calls it rather than
   * keeping a second copy to drift. Both are written against the payload as
   * observed, and both tests' fixtures are trimmed from real responses rather
   * than invented. The keys changed wholesale with all this: the catalog says
   * `team_seats` and `active_campaigns` where this build used to say `seats` and
   * `campaigns`, and `entitlements.seed.test.ts` is what keeps the two in step —
   * under default-allow a stale key does not fail, it silently unlocks.
   *
   * **Waiting on, in the order it matters:**
   *
   * 1. **A usage read.** Nothing on the API reports what a workspace has *used*,
   *    and CON-243 has one as explicitly future — so every allowance arrives
   *    with nothing to measure it against, and the UI can only apologise after
   *    the click instead of disabling the control. `entitlements.seed.ts` holds
   *    held-still counters meanwhile; `Usage.used` is `number | null` so the day
   *    it lands nothing changes but the parse.
   * 2. **A tier display name on the payload.** It carries `tier_id` and no name;
   *    Serhii flagged the omission himself and offered to add one. Derived from
   *    the slug until then.
   * 3. **A way to change plan.** `POST /api/workspace/plan` does not exist and
   *    has no counterpart: a workspace's version is assigned by an operator
   *    through Harbor's gRPC `PlanAdminService` (CON-294). `/plans`' CHANGE PLAN
   *    is the stub end to end.
   * 4. **Billing.** `GET /api/billing` and `POST /api/billing/portal` 404, and
   *    no payment provider is connected, so `prices` on the plan is the only
   *    money the app can see.
   * 5. **Pro and Max.** `GET /api/public/pricing` publishes exactly one tier
   *    today — `trial` v1, at €0/month — so there is no comparison to draw yet.
   *    The stub carries that version verbatim, ids and all, and proposes the
   *    other two off the decided matrix.
   *
   * And one thing that belongs elsewhere: a downgrade suspends rather than
   * deletes, and the server picks which campaign goes read-only — so the
   * `suspended` flag has to ride on the resource. There is no such flag on the
   * API yet either. The client must never work it out by counting, or it picks
   * a different victim than the server did.
   *
   * With this off nothing asks, nothing renders a lock, and every feature is
   * available exactly as it was before tiers existed. That is now a claim about
   * a dozen screens rather than about two: **the gating is wired** (CON-232),
   * and `useEntitlement` returning `UNGATED` with the flag down is the single
   * thing keeping all of it inert. Every call site goes through the hook — none
   * reads `FEATURE_FLAGS` or the plan itself — so there is one place that
   * behaviour can be checked and one place it could be broken.
   *
   * **What it does not switch off is being refused** (CON-295). The server
   * enforces whether or not this client asked first — 402 `entitlement_exceeded`
   * and 403 `feature_not_available` — and reading those is not a tiers feature,
   * it is the app declining to show a machine code to a user. So it ships
   * unflagged: `EntitlementError` in `services/api/errors.ts`, the reason under
   * the mutation toast, and the two `entitlement.limit_*` notifications. All of
   * it is dormant on a workspace whose plan denies nothing, which is every
   * workspace today.
   *
   * **Turn it on locally to look at it, and turn it back off before you
   * commit.** The plan screen and the billing card are driven by a
   * `localStorage` stub (`services/api/tiers.stub.ts`) so the tier
   * differentiation can be built and reviewed; a stub is not a reason to ship
   * the feature on. `STUBBED` still switches the plan read and the plan change —
   * never the price list, which is always `GET /api/public/pricing` — and it
   * stays on for now because there is no way to *change* plan. Only one tier is
   * published, so the screen behind CHANGE PLAN is one card until Pro and Max
   * have versions.
   */
  'workspace-tiers': false,

  /**
   * The workspace's calendar — every campaign's posts on one grid.
   *
   * The campaign already has one (`/campaigns/:id/calendar`), which is the
   * whole feature *for one campaign*; this is the same view with the filter
   * taken off, and it is the workspace's twin of it in the rail. Built out of
   * the same components, with the campaign passed as `null` — the cards name
   * their campaign, nothing here creates a post, and the view switch drops the
   * LIST segment, and that is the whole of the difference.
   *
   * **No longer waiting on an endpoint.** This flag used to say the query had
   * not been written; it had. `GET /api/posts` returns the tenant's posts
   * hydrated and the client already read it for two other cross-campaign
   * questions, under a key every post write invalidates (`lib/postCache`) — so
   * `useWorkspacePosts` is a third reader of a list that was already being
   * kept in step, not a new contract.
   *
   * What it is waiting on now is **a range**. The endpoint takes no
   * parameters, so the grid pulls every post in the workspace — bodies,
   * campaigns, platforms and assets — however few weeks are on screen. That is
   * the same cost `useAssetUsage` already pays and documents, and fine at
   * today's scale; on a workspace with thousands of posts it is a calendar
   * that opens slowly, which is worse than one that isn't offered. So the flag
   * stays off until either `?from=&to=` lands (filed in
   * `docs/open-questions.md`) or the feature is tried against a real workspace
   * and judged fast enough — rule 4, deliberately, rather than flipping
   * because the screen renders.
   *
   * Turning it on is one word here. Everything else is built: the route, the
   * nav row, the panels and the place memory all read this flag already, and
   * `?ff=workspace-calendar` exercises it on staging without a deploy.
   */
  'workspace-calendar': false,

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
   * thread — and it is already modelled and already derived (Auto, `lib/postTypeAuto`).
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

  /**
   * Uploading audio to the Content Bank (CON-313 over CON-282): the eleven
   * audio extensions in the picker, and the presign → PUT → finalize path in
   * the upload store. Off, an `.mp3` is refused as an extension the bank
   * doesn't take, exactly as before.
   *
   * Only the *upload* is behind it. An AUDIO asset that arrives some other way
   * still opens on its own screen with its player and transcript, because that
   * reads through our API alone.
   *
   * **Waiting on** R2 CORS for a browser `PUT` to the presigned URL (CON-307).
   * The API side is shipped and was run end to end locally; what fails without
   * CORS is the one request that goes to storage rather than to us, and it fails
   * as a network error after presign has already created the asset. Turn it on
   * once an upload has gone through on staging.
   */
  'content-bank-audio': false,
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
