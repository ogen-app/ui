import { getPlatformByZernioId } from '@/lib/platformDictionary'
import type { AppNotification } from '@/types/notifications'
import { formatStorage } from '@/lib/tierFeatures'

/**
 * How a notification is *shown*: which catalogue entry says it, and where it
 * goes when clicked (CON-242).
 *
 * Pure and tested, on the same terms as `campaignReadiness` and
 * `activityFeed` — no fetching, no stores, no `t()`. It hands back a key and
 * its variables; the component does the translating.
 *
 * ## Why the copy is not the server's
 *
 * Every row arrives with a `title` and a `body` the handler composed, in
 * English. Rendering those would be the shortest path and the wrong one: a
 * sentence built on the wire cannot be translated, cannot be re-worded without
 * a deploy on both sides, and cannot be restyled — the reasoning is written out
 * in `docs/activity.md`. So the client renders from `type` plus `data`, which
 * is machine-readable and stable, and the server's prose is what stands in for
 * a `type` this build has never heard of.
 *
 * That fallback is load-bearing, not a nicety. `type` is deliberately an open
 * vocabulary: the backend ships a new producer whenever it has something worth
 * saying, and this build must render its rows as *something* rather than as a
 * blank line, until the catalogue catches up.
 */

/**
 * The types this build has copy for, mapped to their catalogue leaf under
 * `activity.notification`.
 *
 * Every one of these is a wired producer — CON-242 opened the vocabulary and
 * CON-285 finished it. A type missing from here is not an error — see the
 * fallback above — so the table is allowed to lag the server, and adding to it
 * is the whole job of supporting a new producer.
 *
 * Three types in `docs/events.md` are still absent on purpose: `video.probed`
 * / `video.probe_failed` and `post.not_published` have no trigger in the
 * server, and `zernio.sync_failed` has no per-user recipient. Copy written
 * ahead of a producer is copy nobody can read, and it rots quietly — the
 * catalogue is not the place to plan.
 *
 * Two more were absent by mistake rather than by decision, and are now in
 * `ENTITLEMENT_COPY_KEY` below: the plan-limit warnings had both a producer
 * and a recipient, which is exactly what the three above lack. They are not in
 * this table because their sentence depends on `data.feature` as well as on
 * `type`.
 */
const COPY_KEY = {
  'connection.expiring_soon': 'activity.notification.connectionExpiring',
  'connection.action_required':
    'activity.notification.connectionActionRequired',
  'post.published': 'activity.notification.postPublished',
  'post.publish_failed': 'activity.notification.postPublishFailed',
  'post.manual_publish_due': 'activity.notification.postManualPublishDue',
  'asset.ready': 'activity.notification.assetReady',
  'asset.ingest_failed': 'activity.notification.assetIngestFailed',
  // A crawled page is an asset like any other, and the server still splits it
  // off by kind (CON-222) so the sentence can say *link* — "processing" is
  // what happens to a file you handed over, not to an address we went and read.
  'url_asset.crawled': 'activity.notification.urlAssetCrawled',
  'url_asset.failed': 'activity.notification.urlAssetFailed',
  'campaign.content_plan_ready':
    'activity.notification.campaignContentPlanReady',
  'content_plan.failed': 'activity.notification.contentPlanFailed',
  // One sentence covers the post and the campaign assistant both: the row
  // links to whichever it was, and a resolution only ever reaches the person
  // who started it — so "your request" is true of either.
  'assistant.completed': 'activity.notification.assistantCompleted',
  'assistant.failed': 'activity.notification.assistantFailed',
  'assessment.completed': 'activity.notification.assessmentCompleted',
  'assessment.failed': 'activity.notification.assessmentFailed',
} as const satisfies Record<string, string>

/**
 * The plan-limit warnings, which are two types over four features (CON-295).
 *
 * `entitlement.limit_reached` and `entitlement.limit_approaching` are raised
 * by the server's quota limiter, unconditionally — they are **not** behind
 * `workspace-tiers`, which gates the screens that talk about a plan and not
 * the counting. They arrived before this table did and fell through to the
 * server's English.
 *
 * A key per feature rather than one sentence with the feature's name slotted
 * in. Two reasons, and the second is the real one: the wire carries
 * `data.feature` as a machine key (`active_campaigns`) and *not* the display
 * name the server composed its own prose from, so a shared sentence would need
 * a lookup table of nouns here anyway — and a cap measured in bytes cannot
 * share a sentence with a cap measured in campaigns whatever the noun says.
 *
 * A feature missing from here takes the server-title fallback, which is what
 * makes adding the fifth capped resource a catalogue change rather than a
 * regression: the limiter registers its counters at boot
 * (`src/transport/server/server.go`), so this list can and will lag it.
 */
const ENTITLEMENT_COPY_KEY = {
  team_seats: {
    reached: 'activity.notification.entitlement.seats.reached',
    approaching: 'activity.notification.entitlement.seats.approaching',
  },
  active_campaigns: {
    reached: 'activity.notification.entitlement.campaigns.reached',
    approaching: 'activity.notification.entitlement.campaigns.approaching',
  },
  content_bank_assets: {
    reached: 'activity.notification.entitlement.documents.reached',
    approaching: 'activity.notification.entitlement.documents.approaching',
  },
  media_storage_bytes: {
    reached: 'activity.notification.entitlement.storage.reached',
    approaching: 'activity.notification.entitlement.storage.approaching',
  },
} as const satisfies Record<string, Record<LimitState, string>>

/** Which side of the cap a warning is about — the server's own two words. */
type LimitState = 'approaching' | 'reached'

const LIMIT_TYPE: Record<string, LimitState> = {
  'entitlement.limit_approaching': 'approaching',
  'entitlement.limit_reached': 'reached',
}

/**
 * The keys this table can produce, as literals rather than `string`.
 *
 * i18next types `t()` against the catalogue, so a plain `string` here would not
 * type-check at the call site — and that is the feature: a key written into
 * this table but never added to `en.ts` fails the build instead of rendering
 * its own name on screen.
 */
export type NotificationCopyKey =
  | (typeof COPY_KEY)[keyof typeof COPY_KEY]
  | (typeof ENTITLEMENT_COPY_KEY)[keyof typeof ENTITLEMENT_COPY_KEY][LimitState]

export type NotificationCopy = {
  /** Full catalogue key, ready for `t()`. */
  key: NotificationCopyKey
  /** Interpolation variables — data, never prose. */
  vars: Record<string, string | number>
}

/**
 * What each type's catalogue entry cannot render without. `data` arrives as an
 * unvalidated blob (`parseNotification` only checks it is a record), so a row
 * can be a known type and still be missing the value its sentence
 * interpolates — and i18next would render a literal `{{channel}}`, or miss
 * plural resolution entirely and print the key's own name. A row like that
 * takes the server-title fallback instead, same as an unknown type.
 */
const REQUIRED_VARS: Partial<
  Record<keyof typeof COPY_KEY, 'channel' | 'count'>
> = {
  'connection.expiring_soon': 'channel',
  'connection.action_required': 'channel',
  'post.published': 'channel',
  'post.publish_failed': 'channel',
  'campaign.content_plan_ready': 'count',
}

/**
 * What to say about a row, or null when only the server can say it.
 *
 * Null is the honest answer for an unknown `type`: it means "render
 * `notification.title`", which is English and untranslatable but *true*, and
 * that beats inventing a generic sentence that says less than the server
 * already did. A known type whose `data` blob lacks what its sentence
 * interpolates gets the same answer, for the same reason.
 */
export function notificationCopy(
  notification: AppNotification,
): NotificationCopy | null {
  const limitState = LIMIT_TYPE[notification.type]
  if (limitState) return entitlementCopy(notification, limitState)
  const type = notification.type as keyof typeof COPY_KEY
  const key = COPY_KEY[type] as NotificationCopyKey | undefined
  if (!key) return null
  const vars = notificationVars(notification)
  const required = REQUIRED_VARS[type]
  if (required && !(required in vars)) return null
  return { key, vars }
}

/**
 * What a plan-limit warning says, or null when this build cannot say it.
 *
 * Null on an unknown feature, and null on a row missing the figures its
 * sentence counts with — the same answer, for the same reason, as a type this
 * build has never heard of: the server's own English is true, and a sentence
 * with `{{limit}}` still in it is not.
 *
 * The byte figures are rendered here rather than left as numbers, because
 * `5368709120` is not a thing anyone has ever been told about their storage.
 * `String` is passed as the digit formatter to keep this module free of the
 * active language — a plan's allowance is one or two digits, so there is no
 * grouping to get wrong. See `formatStorage`.
 */
function entitlementCopy(
  notification: AppNotification,
  state: LimitState,
): NotificationCopy | null {
  const data = notification.data ?? {}
  const feature = data.feature
  if (typeof feature !== 'string') return null
  const keys =
    ENTITLEMENT_COPY_KEY[feature as keyof typeof ENTITLEMENT_COPY_KEY]
  if (!keys) return null
  const { limit, current } = data
  if (typeof limit !== 'number' || !Number.isFinite(limit)) return null
  if (typeof current !== 'number' || !Number.isFinite(current)) return null
  const bytes = feature === 'media_storage_bytes'
  return {
    key: keys[state],
    vars: {
      limit: bytes ? formatStorage(limit, String) : limit,
      current: bytes ? formatStorage(current, String) : current,
    },
  }
}

function notificationVars(
  notification: AppNotification,
): Record<string, string | number> {
  const vars: Record<string, string | number> = {}
  const data = notification.data ?? {}

  // `platform` only. `post.manual_publish_due` carries a `platform_id`, which
  // is a **sqid** and names a catalogue row rather than a network (CON-292) —
  // translating one needs the fetched list, which is a hook, which this file
  // deliberately is not. So that sentence says nothing about the channel; it
  // is not a lookup waiting to be written here.
  const platform = data.platform
  if (typeof platform === 'string' && platform) {
    vars.channel = channelName(platform)
  }

  // The content plan says how many drafts it produced, which is the only thing
  // anyone wants to know before opening it.
  const count = data.post_count
  if (typeof count === 'number' && Number.isFinite(count)) {
    vars.count = count
  }

  return vars
}

/**
 * A platform's display name, from the wire slug a notification carries.
 *
 * Anything unrecognised is passed through as it arrived — naming a channel we
 * don't know beats saying "a post failed somewhere". That now covers a
 * notification whose `platform` is a sqid rather than a slug: this is a pure
 * formatter with no platform list to translate from, and a rendered sqid is
 * ugly where the old lookup would have rendered a name. No producer is known to
 * send one, and every event this file handles is raised beside a Zernio call —
 * but if one turns up, the fix is at the producer, not a fetch in here.
 */
export function channelName(platform: string): string {
  return getPlatformByZernioId(platform)?.name ?? platform
}

/** Where a notification goes when it is clicked. */
export type NotificationTarget = {
  to: string
  params?: Record<string, string>
}

/**
 * The in-app destination for a row, or null when it has nowhere to go.
 *
 * Built from `entity_type` + `entity_id`, deliberately **not** from
 * `action_url`. The server's own link is a hint and an inconsistent one — the
 * entity producers send an app-relative path while the connection ones send an
 * absolute URL — and following a string into the router is how a notification
 * for a deleted post becomes a blank screen instead of a row that simply does
 * not link.
 *
 * A post needs a campaign to be addressed, and its notification does not carry
 * one, so the caller supplies the lookup — in practice the batched campaign
 * summaries the feed already reads. A post whose campaign cannot be found is
 * one the reader has lost access to (or that has been deleted), and an entry
 * that goes nowhere is better than one that 404s.
 */
export function notificationTarget(
  notification: AppNotification,
  campaignOfPost: (postId: string) => string | null,
): NotificationTarget | null {
  const id = notification.entity_id
  switch (notification.entity_type) {
    case 'post': {
      if (!id) return null
      const campaignId = campaignOfPost(id)
      if (!campaignId) return null
      return {
        to: '/campaigns/$campaignId/posts/$postId',
        params: { campaignId, postId: id },
      }
    }
    case 'campaign':
      return id
        ? { to: '/campaigns/$campaignId/overview', params: { campaignId: id } }
        : null
    case 'asset':
      return id ? { to: '/assets/$assetId', params: { assetId: id } } : null
    case 'social_account':
      // No route addresses one connection: they are a section of Workspace
      // Settings, which is where reconnecting happens anyway.
      return { to: '/workspace-settings' }
    default:
      return null
  }
}
