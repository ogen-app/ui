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
   * workspace's answer to "what happened since I last looked?". Also the whole
   * notification client (CON-242): the inbox queries, the durable stream and
   * the unread count are mounted by this feature and by nothing else, so with
   * the flag off no notification request is made at all.
   *
   * **The endpoints now exist.** CON-242 merged 2026-09-02 and
   * `api.dev.getogen.com` answers `/api/notifications`,
   * `/unread-count` and `/stream`. Phase 2 is built against them: recorded
   * entries replaced the derived ones, read state is per row and server-side,
   * and the Phase 1 last-seen timestamp is gone (`docs/activity.md`).
   *
   * **Waiting on**, in the order that decides whether this ships:
   *
   * 1. **A pass against the real thing.** The client was written from the
   *    contract on the ticket, not from a running server: the local API
   *    predates the endpoints (404), and nothing here has yet seen a real row,
   *    a real replay or a real reconnect. That is the step the global rule
   *    calls for before a flag's fate is decided, and it has not happened.
   * 2. **Whether the SSE crash reaches this stream.** A client disconnecting
   *    from `/api/events` panicked the API process — finding 5 in
   *    `docs/sse.md`, recorded 2026-08-03. The notification stream is a second
   *    long-lived connection written to the same house pattern, so it either
   *    shares the fault or has been fixed alongside it. Unanswered.
   * 3. **Fan-out.** Every producer writes to the thing's `created_by`, so a
   *    post failing to publish is news to whoever made it and to nobody else.
   *    The derived entry it replaced was visible to the whole workspace, so
   *    turning this on as it stands *narrows* who hears about a failure. Needs
   *    a decision — probably workspace owners alongside the author.
   * 4. **`post.published` is emitted, and CON-224 said it must not be.**
   *    Successful auto-publishing is the highest-volume thing that happens, and
   *    rolling it into one computed daily entry is the argument the whole
   *    report rests on — a workspace posting three times a day across five
   *    channels writes fifteen "it worked" rows, which is how a badge stops
   *    being read. The client does *not* filter them: the count comes from the
   *    server, and a feed hiding rows the badge still counts is worse than a
   *    noisy feed. It needs deciding at the emit site.
   * 5. **A producer for "never published".** `not_published` is a real outcome
   *    with no notification type, so it now leaves no record at all. It is
   *    counted in the day's report and nowhere else.
   *
   * 3 and 4 are the ones that decide whether this reads as better than Phase 1
   * or worse: as it stands a post's author hears about every success and
   * nobody else hears about the failures. Neither is a reason to hold the
   * client, and both are what to settle before flipping.
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
   * **Waiting on:** the whole ingest path. `POST /api/content-bank/assets/
   * upload` answers `"only .md and .pdf files are accepted"` (`assets.go`), and
   * `assets_type_check` is `MD | PDF | URL`, so an image cannot be stored as an
   * asset at all. CON-105's branch (PR #66, open since 2026-07-12) adds `IMG`
   * plus `ai_generated`, `brand_style` and `generation`; CON-16 R1 adds the
   * `width` / `height` / `is_animated` / `checksum_sha256` columns to
   * `asset_files` that `post_attachments` already carries, and R3 adds
   * `assets.alt_text`.
   *
   * With this on, the upload surface offers images and the server refuses
   * them — which is the honest state of it, and why it is off.
   *
   * **The image asset's own screen is deliberately not built yet**, and this is
   * the decision the back end has to make first: `AssetFile` exposes
   * `thumbnail_url` and no URL for the original, so there is nothing to render
   * an image *from*. CON-16 R5 puts the thumbnail at `assets/{id}/thumb.webp`
   * and D2 the original at `assets/{id}/original.<ext>`, but neither the DTO
   * field nor its name is settled. Until it is, an `IMG` asset opens on
   * `UnsupportedAsset`, which is safe and says so. Guessing the field here
   * would mean writing a viewer against a contract nobody has agreed to.
   *
   * Switch this on once the upload accepts images and the asset DTO carries the
   * original's URL; re-test the whole path against the real thing — the sizes
   * and MIME set in `lib/assetStatus.ts` mirror `imageprobe.AllowedMIMEs` and
   * `maxImageSize`, and those are the server's to change.
   */
  'content-bank-images': false,

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
