import type { PlatformView } from '@/lib/platformDictionary'
import type { OverviewPost } from '@/lib/campaignOverview'
import type { Campaign } from '@/types/campaigns'

/**
 * The campaign's places, in the rail's order — every one the Overview can
 * open, so the page ends by saying where everything else is. Activity is
 * left out: it is the workspace's feed, narrowed, and has nothing to be set.
 */
export const DOOR_PLACES = [
  'strategy',
  'ideas',
  'assets',
  'posts',
  'calendar',
  'analytics',
  'settings',
] as const

export type DoorPlace = (typeof DOOR_PLACES)[number]

/**
 * What a door says about its place. `set` is a tick — this part of the
 * campaign is done; `todo` an open ring — it wants something before the
 * campaign is whole; `null` no mark — the place is optional, or is a record
 * rather than something to finish (Analytics, Settings).
 */
export type DoorMark = 'set' | 'todo' | null

/**
 * The line under the door's name, as a catalogue key under
 * `campaignOverview.doors` and its figures. `loading` while the read it
 * counts hasn't answered.
 */
export type DoorKey =
  | 'loading'
  | `strategy.${'set' | StrategyGap}`
  | `ideas.${'waiting' | 'none'}`
  | `assets.${'all' | 'some' | 'none'}`
  | `posts.${'some' | 'none'}`
  | `calendar.${'next' | 'some' | 'none' | 'over'}`
  | `analytics.${'some' | 'none'}`
  | 'settings'

export type DoorLine = {
  key: DoorKey
  count?: number
  /** Posts only: how many of `count` are still plans or drafts. */
  drafts?: number
  at?: Date
}

export type OverviewDoor = { place: DoorPlace; mark: DoorMark; line: DoorLine }

export type DoorsInput = {
  campaign: Campaign
  /** Null while neither the posts nor the summaries have answered. */
  posts: OverviewPost[] | null
  platformViews: PlatformView[]
  /** The campaign's ideas waiting for a decision; null while unread. */
  ideasWaiting: number | null
  now: Date
}

const SCHEDULED = new Set(['scheduled', 'scheduled_for_manual_publishing'])
const UNFINISHED = new Set(['planned', 'draft'])

/**
 * One door per place, each with the one thing to know about it before
 * opening it: whether that part of the campaign is set, and if not, what is
 * missing first. Everything is read from what the Overview already holds,
 * plus one count of waiting ideas.
 *
 * Strategy is the one place that is either set or not: dates, a post goal,
 * and at least one channel with an account to publish through — the same
 * three things the setup card asks for, read the same way. Posts and the
 * calendar want something only once there is something to want: a campaign
 * with posts and nothing scheduled is waiting on a schedule; one with no
 * posts is waiting on the posts. Documents are optional — Ogen writes from
 * the brief without them — so having none is said, not marked.
 */
export function overviewDoors(input: DoorsInput): OverviewDoor[] {
  const { campaign, posts, now } = input
  const loading: DoorLine = { key: 'loading' }

  return DOOR_PLACES.map((place): OverviewDoor => {
    switch (place) {
      case 'strategy': {
        const missing = strategyMissing(campaign, input.platformViews)
        return missing
          ? { place, mark: 'todo', line: { key: `strategy.${missing}` } }
          : {
              place,
              mark: 'set',
              line: {
                key: 'strategy.set',
                count: campaign.target_platforms.length,
              },
            }
      }
      case 'ideas': {
        const n = input.ideasWaiting
        if (n === null) return { place, mark: null, line: loading }
        return n > 0
          ? { place, mark: 'todo', line: { key: 'ideas.waiting', count: n } }
          : { place, mark: null, line: { key: 'ideas.none' } }
      }
      case 'assets': {
        // Before CON-210, `use_assets` over an empty set meant the whole
        // workspace's bank — still a campaign's answer until it is narrowed.
        if (campaign.use_assets && campaign.asset_ids.length === 0)
          return { place, mark: 'set', line: { key: 'assets.all' } }
        const n = campaign.use_assets ? campaign.asset_ids.length : 0
        return n > 0
          ? { place, mark: 'set', line: { key: 'assets.some', count: n } }
          : { place, mark: null, line: { key: 'assets.none' } }
      }
      case 'posts': {
        if (!posts) return { place, mark: null, line: loading }
        if (posts.length === 0)
          return { place, mark: 'todo', line: { key: 'posts.none' } }
        const drafts = posts.filter((p) => UNFINISHED.has(p.status)).length
        return {
          place,
          mark: 'set',
          line: { key: 'posts.some', count: posts.length, drafts },
        }
      }
      case 'calendar': {
        if (!posts) return { place, mark: null, line: loading }
        // Every scheduled post counts, as on the cards above — a manual one
        // past its time is still on the calendar, waiting to be published.
        const scheduled = posts.filter(
          (p) => SCHEDULED.has(p.status) && p.scheduled_at,
        )
        const next = scheduled
          .map((p) => new Date(p.scheduled_at!))
          .filter((at) => at >= now)
          .sort((a, b) => a.getTime() - b.getTime())[0]
        if (scheduled.length > 0)
          return {
            place,
            mark: 'set',
            line: next
              ? { key: 'calendar.next', count: scheduled.length, at: next }
              : { key: 'calendar.some', count: scheduled.length },
          }
        const ended =
          campaign.end_date !== null && new Date(campaign.end_date) < now
        if (ended) return { place, mark: null, line: { key: 'calendar.over' } }
        return {
          place,
          mark: posts.length > 0 ? 'todo' : null,
          line: { key: 'calendar.none' },
        }
      }
      case 'analytics': {
        if (!posts) return { place, mark: null, line: loading }
        const n = posts.filter((p) => p.status === 'published').length
        return n > 0
          ? { place, mark: null, line: { key: 'analytics.some', count: n } }
          : { place, mark: null, line: { key: 'analytics.none' } }
      }
      case 'settings':
        return { place, mark: null, line: { key: 'settings' } }
    }
  })
}

type StrategyGap = 'noDates' | 'noGoal' | 'noChannels' | 'notConnected'

/** The first thing Strategy is missing, in the order the page asks for it. */
function strategyMissing(
  campaign: Campaign,
  platformViews: PlatformView[],
): StrategyGap | null {
  if (!campaign.start_date || !campaign.end_date) return 'noDates'
  if ((campaign.estimated_post_count ?? 0) <= 0) return 'noGoal'
  if (campaign.target_platforms.length === 0) return 'noChannels'
  const connected = campaign.target_platforms.some(
    (tp) =>
      (platformViews.find((v) => v.platform.id === tp.id)?.connectedPublishers
        .length ?? 0) > 0,
  )
  return connected ? null : 'notConnected'
}
