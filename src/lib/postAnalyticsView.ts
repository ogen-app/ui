import type {
  MeasureId,
  PostIdentity,
  PostMaturity,
  PostMetric,
  PostPerformanceView,
} from '@/components/analytics/types'
import { isReported, type WireMeasure } from '@/lib/platformMeasures'
import { formatRelative } from '@/lib/intl'
import type {
  AnalyticsMetrics,
  PlatformAnalyticsRow,
  PostAnalyticsSnapshot,
} from '@/types/analytics'

/**
 * `GET /api/posts/:id/analytics` on the wire, turned into what the post
 * surface speaks.
 *
 * The mapper is where the two disagree, and the disagreement is the point:
 * the server owns the data, the design owns the questions, and everything the
 * design asks for that has no source is answered *absent* here rather than
 * invented. What that means concretely, and why, is in
 * `docs/analytics-contract.md` §5 — the short version is that four of the
 * view's fields have no wire source at all (`typical`, `expected`,
 * `percentile`, `series`), so every comparison the cards can draw is missing
 * and they withdraw on their own.
 */

/** What the post itself knows about the publication, from its own document. */
export type PostFacts = {
  title: string
  /** Our platform id or the wire slug — `resolvePlatformInfo` takes either. */
  platform: string
  /** Reel, Single image, Carousel — the post type, already labelled. */
  format: string
  /** RFC3339, or `null` for a post that has not gone out. */
  publishedAt: string | null
  campaign?: string
  /**
   * **Our** `social_account_id`, which is what a reconnect link points at.
   * Never the row's `account_id` — that one is Zernio's, and sending it to our
   * connections screen names an account that screen has never heard of.
   */
  socialAccountId: string | null
}

/**
 * Whether the platform is reporting, or has stopped and said why.
 *
 * Branched on `error_message` being non-empty, which is the one unambiguous
 * signal on the row: `status` and `sync_status` are both opaque strings the
 * publisher owns, and neither has a documented vocabulary we could switch on
 * without guessing.
 */
export type PublicationHealth =
  | { state: 'reporting' }
  | {
      state: 'not_reporting'
      /** The publisher's own prose. Shown as-is; nothing else says why. */
      message: string
      /** Where to send someone to fix it, when the post names an account. */
      reconnectAccountId: string | null
    }

/**
 * The publication facts for a post's one platform — `platform_analytics[0]`.
 *
 * One row, because an Ogen post has one platform and one account
 * (`models/post.go`). The array is a sidecar of facts about that single
 * publication, not a breakdown dimension, and a post fanned out to three
 * platforms is three posts with a row each.
 */
export type PostPublication = {
  platform: string
  /** `account_username`. `null` when the publisher omitted it. */
  account: string | null
  /** `platform_post_url`. `null` when the publisher omitted it. */
  permalink: string | null
  health: PublicationHealth
}

/** The row, or `null` on a snapshot that carries none. */
function publicationRow(
  snapshot: PostAnalyticsSnapshot,
): PlatformAnalyticsRow | null {
  return snapshot.platform_analytics[0] ?? null
}

/**
 * What the post's one platform says about itself.
 *
 * Falls back to the post's own platform when the row is missing entirely — a
 * snapshot with an empty `platform_analytics` still has headline figures, and
 * losing the identity over a missing sidecar would be the wrong trade.
 */
export function readPublication(
  snapshot: PostAnalyticsSnapshot,
  facts: PostFacts,
): PostPublication {
  const row = publicationRow(snapshot)
  if (!row) {
    return {
      platform: facts.platform,
      account: null,
      permalink: null,
      health: { state: 'reporting' },
    }
  }
  return {
    platform: row.platform || facts.platform,
    account: row.account_username || null,
    permalink: row.platform_post_url || null,
    health: row.error_message
      ? {
          state: 'not_reporting',
          message: row.error_message,
          reconnectAccountId: facts.socialAccountId,
        }
      : { state: 'reporting' },
  }
}

/** The wire measures that roll up into one figure on the surface. */
const INTERACTION_PARTS: WireMeasure[] = [
  'likes',
  'comments',
  'shares',
  'saves',
]

/** Wire field → the measure it is shown as, for the ones shown one-to-one. */
const DIRECT: [WireMeasure, MeasureId][] = [
  ['reach', 'reach'],
  ['impressions', 'impressions'],
  ['engagement_rate', 'engagement_rate'],
  ['saves', 'saves'],
  ['clicks', 'clicks'],
  ['views', 'views'],
]

/**
 * The figures this post actually reported, as tiles.
 *
 * A measure is here because the platform reported it — `isReported` is what
 * separates *nobody saved this* from *this platform has no idea what a save
 * is*, which the wire cannot say for itself. Everything a tile would compare
 * against (`typical`, `expected`) is absent, because nothing serves it per
 * post: `/performers` carries a multiplier, but only for the posts inside a
 * window it ranked, and asking a workspace-wide board about one post is a
 * different request that may not contain it.
 */
export function readMetrics(
  metrics: AnalyticsMetrics,
  platform: string,
): PostMetric[] {
  const out: PostMetric[] = []
  for (const [wire, measure] of DIRECT) {
    if (isReported(platform, wire, metrics[wire])) {
      out.push({ measure, value: metrics[wire] })
    }
  }
  // Interactions is a sum, so it is reported when *any* of its parts is — a
  // platform with no saves still has likes, and dropping the roll-up because
  // one part is missing would lose the figure the card leads with.
  const parts = INTERACTION_PARTS.filter((part) =>
    isReported(platform, part, metrics[part]),
  )
  if (parts.length > 0) {
    out.push({
      measure: 'interactions',
      value: parts.reduce((sum, part) => sum + metrics[part], 0),
    })
  }
  return out
}

/**
 * The server's own boundary for "this post is still earning": `/performers`
 * marks a row `reach_still_accruing` under three days. Reused rather than
 * invented so the two surfaces never disagree about the same post.
 */
const STILL_COUNTING_HOURS = 72

/**
 * How far along a post's numbers are.
 *
 * **`final` is never returned.** Saying a post has stopped earning takes the
 * workspace's own maturation curve — `/analytics/learnings` has one, this
 * endpoint does not — and claiming it from age alone would put "these numbers
 * are final" on a post that is still moving. `settling` is the honest ceiling:
 * past its peak, still adding a little, which stays true however old the post
 * is.
 */
export function readMaturity(
  publishedAt: string | null,
  now: Date,
): PostMaturity {
  if (!publishedAt) return 'unpublished'
  return hoursSince(publishedAt, now) < STILL_COUNTING_HOURS
    ? 'counting'
    : 'settling'
}

function hoursSince(iso: string, now: Date): number {
  return (now.getTime() - new Date(iso).getTime()) / 3_600_000
}

/**
 * How long the figures cover — `26 hours`, `12 days`.
 *
 * A bare span rather than a relative phrase: the card reads "over its first 26
 * hours", and `formatRelative` would put "26 hours ago" inside it.
 */
function span(hours: number): string {
  const h = Math.max(0, Math.round(hours))
  if (h < 48) return `${h} ${h === 1 ? 'hour' : 'hours'}`
  const d = Math.round(h / 24)
  return `${d} ${d === 1 ? 'day' : 'days'}`
}

/** `12 days ago` — through `lib/intl`, so it follows the app's language. */
function ago(hours: number): string {
  return hours < 48
    ? formatRelative(-Math.round(hours), 'hour')
    : formatRelative(-Math.round(hours / 24), 'day')
}

/**
 * One post's snapshot as the surface's view.
 *
 * `now` is passed rather than read so the age arithmetic is testable — every
 * span and maturity below hangs off it.
 */
export function buildPostPerformanceView(
  snapshot: PostAnalyticsSnapshot,
  facts: PostFacts,
  now: Date,
): PostPerformanceView {
  const publication = readPublication(snapshot, facts)
  const maturity = readMaturity(facts.publishedAt, now)
  const hours = facts.publishedAt ? hoursSince(facts.publishedAt, now) : 0

  const post: PostIdentity = {
    title: facts.title,
    platform: publication.platform,
    // The handle it went out as, when the publisher named it. Falling back to
    // the platform would print "Instagram" in a slot whose whole point is that
    // a platform is not an account.
    account: publication.account ?? '',
    format: facts.format,
    publishedAgo: facts.publishedAt ? ago(hours) : undefined,
    campaign: facts.campaign,
    permalink: publication.permalink ?? undefined,
  }

  return {
    maturity,
    post,
    measuredOver: facts.publishedAt ? span(hours) : undefined,
    // Nothing ranks one post against the workspace. `/performers` ranks the
    // posts inside a window and returns only its two ends, so a post in the
    // middle of the distribution is absent from every answer it gives.
    percentile: null,
    metrics:
      maturity === 'unpublished'
        ? []
        : readMetrics(snapshot.analytics, publication.platform),
    // No endpoint reads `post_analytics_snapshots_v2`, so a post has figures
    // and no history. The measure cards see an empty list and say so.
    series: [],
    insight: null,
    // Display-ready, like every other field on the view: the card renders it
    // straight into "Updated …", so an ISO string would land there verbatim.
    // When Ogen last *looked*, which is the honest reading of a figure that is
    // bumped on every check whether or not the numbers moved.
    lastRefreshedAt: ago(hoursSince(snapshot.last_refreshed_at, now)),
  }
}
