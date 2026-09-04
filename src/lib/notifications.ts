import {
  getPlatformByZernioId,
  getPlatformInfo,
} from '@/lib/platformDictionary'
import type { AppNotification } from '@/types/notifications'

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
 * Every one of these is a producer wired in CON-242. A type missing from here
 * is not an error — see the fallback above — so the table is allowed to lag the
 * server, and adding to it is the whole job of supporting a new producer.
 */
const COPY_KEY = {
  'connection.expiring_soon': 'activity.notification.connectionExpiring',
  'connection.action_required':
    'activity.notification.connectionActionRequired',
  'post.published': 'activity.notification.postPublished',
  'post.publish_failed': 'activity.notification.postPublishFailed',
  'asset.ready': 'activity.notification.assetReady',
  'asset.ingest_failed': 'activity.notification.assetIngestFailed',
  'campaign.content_plan_ready':
    'activity.notification.campaignContentPlanReady',
} as const satisfies Record<string, string>

/**
 * The keys this table can produce, as literals rather than `string`.
 *
 * i18next types `t()` against the catalogue, so a plain `string` here would not
 * type-check at the call site — and that is the feature: a key written into
 * this table but never added to `en.ts` fails the build instead of rendering
 * its own name on screen.
 */
export type NotificationCopyKey = (typeof COPY_KEY)[keyof typeof COPY_KEY]

export type NotificationCopy = {
  /** Full catalogue key, ready for `t()`. */
  key: NotificationCopyKey
  /** Interpolation variables — data, never prose. */
  vars: Record<string, string | number>
}

/**
 * What to say about a row, or null when only the server can say it.
 *
 * Null is the honest answer for an unknown `type`: it means "render
 * `notification.title`", which is English and untranslatable but *true*, and
 * that beats inventing a generic sentence that says less than the server
 * already did.
 */
export function notificationCopy(
  notification: AppNotification,
): NotificationCopy | null {
  const key = COPY_KEY[notification.type as keyof typeof COPY_KEY] as
    | NotificationCopyKey
    | undefined
  if (!key) return null
  return { key, vars: notificationVars(notification) }
}

function notificationVars(
  notification: AppNotification,
): Record<string, string | number> {
  const vars: Record<string, string | number> = {}
  const data = notification.data ?? {}

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
 * A platform's display name, from whichever of the two vocabularies the wire
 * used.
 *
 * The producers are spread across the codebase and there is no guarantee they
 * all speak our ids: the connect flow speaks Zernio's (`linkedin`) end to end,
 * while our own records carry ours. Anything unrecognised is passed through as
 * it arrived — naming a channel we don't know beats saying "a post failed
 * somewhere".
 */
export function channelName(platform: string): string {
  return (
    getPlatformInfo(platform)?.name ??
    getPlatformByZernioId(platform)?.name ??
    platform
  )
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
      return id
        ? { to: '/content-bank/$assetId', params: { assetId: id } }
        : null
    case 'social_account':
      // No route addresses one connection: they are a section of Workspace
      // Settings, which is where reconnecting happens anyway.
      return { to: '/workspace-settings' }
    default:
      return null
  }
}
