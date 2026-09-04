import { DEV_TOOLS } from '@/config/flagOverrides'
import type {
  AnalyticsLearnings,
  AnalyticsOverview,
  HeatmapCell,
  InsightEnvelope,
  LearningsMetric,
  LearningsPattern,
  OverviewCard,
  OverviewMetric,
  OverviewSeries,
  PerformerRow,
  PerformerSort,
  PerformersBoard,
} from '@/types/analytics'
import type {
  AnalyticsWindowQuery,
  LearningsQuery,
  PerformersQuery,
} from './analytics'

/**
 * A workspace's worth of simulated analytics, for looking at the dashboard
 * (CON-237/238/239) on a machine that measures nothing.
 *
 * The three endpoints are real and shipped — this is not a feature waiting on
 * the back end, and it is deliberately **not** the `STUBBED` constant
 * `tiers.stub.ts` uses. A local API answers `available: false` for all three
 * because nothing in a dev database has ever been through a refresh sweep, so
 * the cards are only ever seen in their setup state and the half of the work
 * that draws numbers goes unlooked-at. That is what this fixes, and nothing
 * more.
 *
 * ## Why it cannot reach production, and why that matters more here
 *
 * The same build-time gate as the flag overrides: `DEV_TOOLS` folds to a
 * literal `false` in a production build, every branch below collapses, and
 * `demoMode()` becomes the constant `'live'`. That gate is doing more work here
 * than it does for a flag. A stubbed *tier* that leaked would show the wrong
 * plan; stubbed *analytics* that leaked would show a workspace invented numbers
 * about its own posts, indistinguishable from real ones, and someone would act
 * on them. So the mode is off by default even in dev, has to be asked for by
 * URL, and says so in the corner for as long as it is on.
 *
 * ## Using it
 *
 *     /analytics?ff=analytics-overview&analytics=demo
 *
 * `?analytics=` takes `demo`, `empty`, `unavailable` or `live`, is stored per
 * browser like `?ff=`, and is stripped from the address bar. The three
 * non-live modes are the three answers the endpoints can give, so the states
 * that are *not* a chart can be looked at too — a workspace that has published
 * nothing is a different screen from one whose measurement is not connected,
 * and both are easier to get wrong than the populated one.
 *
 * ## What the numbers are
 *
 * Deterministic — seeded off each bucket's own date, so a reload shows the same
 * workspace and the previous window is literally what this window said a window
 * ago. They are also **consistent across the three cards**: the performers
 * board's `total_posts` is the overview's published count, and a row's
 * `period_share` is measured against the overview's reach. Three cards that
 * disagreed about the same month would make the demo useless for reading the
 * page as a page, which is the only reason to have it.
 *
 * Delete this file and the `demoMode()` branches in `analytics.ts` once a dev
 * environment can seed the analytics database itself.
 */

/* --------------------------------------------------------------- the mode -- */

export type DemoMode = 'live' | 'demo' | 'empty' | 'unavailable'

const MODES: readonly DemoMode[] = ['live', 'demo', 'empty', 'unavailable']

/** `?analytics=demo`. Read once at boot and stripped, exactly as `?ff=` is. */
export const DEMO_QUERY_PARAM = 'analytics'

/** Device-local, like every other per-browser development preference. */
const STORAGE_KEY = 'ogen.analyticsDemo'

function isMode(value: unknown): value is DemoMode {
  return MODES.includes(value as DemoMode)
}

/** localStorage throws in private-mode Safari and when storage is disabled. */
function readStored(): DemoMode {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return isMode(raw) ? raw : 'live'
  } catch {
    return 'live'
  }
}

function writeStored(next: DemoMode): void {
  try {
    if (next === 'live') localStorage.removeItem(STORAGE_KEY)
    else localStorage.setItem(STORAGE_KEY, next)
  } catch {
    // The choice still applies to this page load; it just won't outlive it.
  }
}

let mode: DemoMode = DEV_TOOLS ? readStored() : 'live'

/** What this browser is being served. `'live'` in production, always. */
export function demoMode(): DemoMode {
  return DEV_TOOLS ? mode : 'live'
}

/**
 * Switch mode. The caller reloads — the queries are cached with a stale time in
 * minutes, so a mode changed under a mounted app would leave the three cards
 * answering from different worlds until each happened to refetch.
 */
export function setDemoMode(next: DemoMode): void {
  if (!DEV_TOOLS) return
  mode = next
  writeStored(next)
}

/**
 * Apply `?analytics=` and strip it from the address bar.
 *
 * Called from `main.tsx` before the router is constructed, for the two reasons
 * `bootstrapFlagOverrides` is: the router reads `window.location` as it is
 * built, and the strip must be a `replaceState` rather than a navigation so
 * Back from the first in-app page doesn't land on the parameter again.
 */
export function bootstrapAnalyticsDemo(): void {
  if (!DEV_TOOLS) return

  const url = new URL(window.location.href)
  const requested = url.searchParams.get(DEMO_QUERY_PARAM)
  if (requested === null) return

  url.searchParams.delete(DEMO_QUERY_PARAM)
  window.history.replaceState(window.history.state, '', url)

  if (!isMode(requested)) {
    console.warn(
      `[analytics] ignoring "${requested}" — expected one of ${MODES.join(', ')}`,
    )
    return
  }

  setDemoMode(requested)
}

/* ------------------------------------------------------------- the answers -- */

/** Enough that the cards are seen resolving rather than already resolved. */
const LATENCY_MS = 220

function answer<T>(data: T): Promise<InsightEnvelope<T>> {
  return new Promise((resolve) => {
    setTimeout(() => resolve({ available: true, data }), LATENCY_MS)
  })
}

/**
 * The two ways an endpoint says "nothing to show", which are different screens.
 *
 * `no_data` is a workspace that is wired up and has published nothing; anything
 * else is measurement that was never connected. The cards branch on exactly
 * this distinction, so the demo has to be able to produce both.
 */
function withheld<T>(reason: string): Promise<InsightEnvelope<T>> {
  return new Promise((resolve) => {
    setTimeout(
      () => resolve({ available: false, reason, data: null }),
      LATENCY_MS,
    )
  })
}

function envelopeFor<T>(build: () => T): Promise<InsightEnvelope<T>> {
  if (mode === 'empty') return withheld<T>('no_data')
  if (mode === 'unavailable') return withheld<T>('addon_required')
  return answer(build())
}

/* ------------------------------------------------------------ the workspace -- */

const DAY_MS = 86_400_000

/**
 * A stable pseudo-random stream from a string.
 *
 * Seeded per bucket *date* rather than per index, which is what makes the
 * previous window equal what the current one said a window ago — the ghost line
 * behind the chart is then a real earlier reading rather than a second draw
 * from the same distribution.
 */
function rng(seed: string): () => number {
  let h = 2166136261
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  let a = h >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function isoDay(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10)
}

/** Midnight UTC today — the day every window ends on, inclusively. */
function endOfWindow(now: Date): number {
  return Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
}

/**
 * The window's length, resolved the way the server resolves it.
 *
 * `28d` covers today and the 27 days before it, which is why `from` is 27 days
 * back and not 28 — the same off-by-one the wire's own comment warns about.
 */
function resolveDays(query: AnalyticsWindowQuery): number {
  if (query.from && query.to) {
    const from = Date.parse(`${query.from}T00:00:00Z`)
    const to = Date.parse(`${query.to}T00:00:00Z`)
    if (Number.isFinite(from) && Number.isFinite(to) && to >= from)
      return Math.min(400, Math.round((to - from) / DAY_MS) + 1)
  }
  const match = /^(\d+)(d|w|mo)$/.exec(query.window ?? '')
  if (!match) return 28
  const n = Number(match[1])
  const days = match[2] === 'd' ? n : match[2] === 'w' ? n * 7 : n * 30
  return Math.min(400, Math.max(1, days))
}

type Bucket = {
  date: string
  published: number
  reach: number
  interactions: number
  /** The follower count as it stood at the end of this day — a level. */
  followers: number
}

/**
 * One day of a plausible working week.
 *
 * Posts go out on weekdays, reach is mostly a function of what went out, and a
 * day with nothing published still earns the tail of what came before it — which
 * is the same fact the lifespan curve states, and the reason a heatmap of
 * publishing hours is worth reading at all.
 */
function bucketFor(ms: number, followersBefore: number): Bucket {
  const date = isoDay(ms)
  const next = rng(`ogen-demo:${date}`)
  const weekday = new Date(ms).getUTCDay()
  const working = weekday >= 1 && weekday <= 5

  const roll = next()
  const published = working
    ? roll > 0.78
      ? 2
      : roll > 0.22
        ? 1
        : 0
    : roll > 0.85
      ? 1
      : 0

  const tail = 380 + Math.round(next() * 520)
  const reach = tail + published * (1500 + Math.round(next() * 2600))
  const rate = 0.026 + next() * 0.031
  const interactions = Math.round(reach * rate)

  return {
    date,
    published,
    reach,
    interactions,
    followers:
      followersBefore + Math.round(reach / 240) + (next() > 0.7 ? 3 : 0),
  }
}

/** `days` consecutive buckets ending on `endMs`, inclusive. */
function bucketsEnding(
  endMs: number,
  days: number,
  followersAt: number,
): Bucket[] {
  const out: Bucket[] = []
  let followers = followersAt
  for (let i = days - 1; i >= 0; i--) {
    const bucket = bucketFor(endMs - i * DAY_MS, followers)
    followers = bucket.followers
    out.push(bucket)
  }
  return out
}

/** Where the follower count stood before a window began. */
const FOLLOWERS_BASE = 2140

function cumulative(values: number[]): number[] {
  let running = 0
  return values.map((value) => (running += value))
}

function sum(values: number[]): number {
  return values.reduce((total, value) => total + value, 0)
}

/**
 * `delta_pct` and the direction the server derives from it — including its
 * ±0.5% dead band, which is what makes `flat` a real answer rather than the
 * gap between two roundings.
 */
function deltaOf(
  current: number,
  previous: number,
): Pick<OverviewCard, 'delta_pct' | 'direction'> {
  const pct = previous === 0 ? 0 : ((current - previous) / previous) * 100
  const delta_pct = Math.round(pct * 10) / 10
  return {
    delta_pct,
    direction: delta_pct > 0.5 ? 'up' : delta_pct < -0.5 ? 'down' : 'flat',
  }
}

function seriesOf(
  buckets: Bucket[],
  previous: Bucket[],
  read: (bucket: Bucket) => number,
  flow: boolean,
): OverviewSeries {
  const current = buckets.map(read)
  const before = previous.map(read)
  return {
    buckets: buckets.map((bucket) => bucket.date),
    current: flow ? cumulative(current) : current,
    // Index-aligned rather than dated, as the wire sends it: day 3 of then sits
    // under day 3 of now.
    previous: flow ? cumulative(before) : before,
  }
}

function buildOverview(
  query: AnalyticsWindowQuery,
  now: Date,
): AnalyticsOverview {
  const days = resolveDays(query)
  const end = endOfWindow(now)
  const start = end - (days - 1) * DAY_MS

  const before = bucketsEnding(start - DAY_MS, days, FOLLOWERS_BASE)
  const buckets = bucketsEnding(end, days, before[before.length - 1].followers)

  const reach = sum(buckets.map((b) => b.reach))
  const interactions = sum(buckets.map((b) => b.interactions))
  const published = sum(buckets.map((b) => b.published))
  const followers = buckets[buckets.length - 1].followers

  const wasReach = sum(before.map((b) => b.reach))
  const wasInteractions = sum(before.map((b) => b.interactions))
  const wasPublished = sum(before.map((b) => b.published))
  const wasFollowers = before[before.length - 1].followers

  const rate = reach === 0 ? 0 : interactions / reach
  const wasRate = wasReach === 0 ? 0 : wasInteractions / wasReach

  const series: Record<OverviewMetric, OverviewSeries> = {
    reach: seriesOf(buckets, before, (b) => b.reach, true),
    interactions: seriesOf(buckets, before, (b) => b.interactions, true),
    engagement_rate: seriesOf(
      buckets,
      before,
      (b) => (b.reach === 0 ? 0 : b.interactions / b.reach),
      false,
    ),
    followers: seriesOf(buckets, before, (b) => b.followers, false),
    posts_published: seriesOf(buckets, before, (b) => b.published, true),
  }

  // Server-authored English, as on the wire — these are not catalogue keys.
  const card = (
    metric: OverviewMetric,
    label: string,
    value: number,
    was: number,
  ): OverviewCard => ({
    metric,
    label,
    value,
    ...deltaOf(value, was),
    // Every response says this today: the long-retention rollup the usual-range
    // band needs has no tenant with enough history behind it yet.
    baseline: 'insufficient_history',
    sparkline: series[metric].current,
  })

  const peak = buckets.reduce(
    (best, b) => (b.reach > best.reach ? b : best),
    buckets[0],
  )

  return {
    window: {
      from: isoDay(start),
      to: isoDay(end),
      days,
      granularity: 'day',
    },
    // A few hours ago, so the card's freshness line has something to say.
    updated_at: new Date(now.getTime() - 3 * 3600_000).toISOString(),
    cards: [
      card('reach', 'Cumulative reach', reach, wasReach),
      card(
        'interactions',
        'Cumulative interactions',
        interactions,
        wasInteractions,
      ),
      card('engagement_rate', 'Engagement rate', rate, wasRate),
      card('followers', 'Followers', followers, wasFollowers),
      card('posts_published', 'Posts published', published, wasPublished),
    ],
    series,
    insights: [
      {
        id: 'reinforcing',
        severity: 'info',
        text: `Reach and interactions both rose over the last ${days} days.`,
        note: 'Both moved the same way, so the rate below is not carrying the story on its own.',
      },
      {
        id: 'peak_bucket',
        severity: 'note',
        text: `${Math.round((peak.reach / Math.max(reach, 1)) * 100)}% of the period's reach arrived on one day.`,
        note: `${peak.date} — worth knowing before reading the average as typical.`,
      },
    ],
  }
}

/* ------------------------------------------------------------- performers -- */

const POSTS: { title: string; platform: string; account: string }[] = [
  {
    title: 'What we changed after three months of user calls',
    platform: 'linkedin',
    account: 'ogen',
  },
  {
    title: 'The onboarding rewrite, in five screenshots',
    platform: 'linkedin',
    account: 'ogen',
  },
  {
    title: 'Behind the scenes: how a campaign gets planned',
    platform: 'instagram',
    account: 'ogen.app',
  },
  {
    title: 'Three things we got wrong about scheduling',
    platform: 'linkedin',
    account: 'ogen',
  },
  {
    title: 'Carousel: the content bank, explained',
    platform: 'instagram',
    account: 'ogen.app',
  },
  { title: 'Shipping notes — week 34', platform: 'x', account: 'ogenapp' },
  {
    title: 'A short thread on publishing windows',
    platform: 'x',
    account: 'ogenapp',
  },
  {
    title: 'Meet the team: the people behind the roadmap',
    platform: 'instagram',
    account: 'ogen.app',
  },
  {
    title: 'Why we moved analytics off the campaign screen',
    platform: 'linkedin',
    account: 'ogen',
  },
  {
    title: 'Office hours are back, every Thursday',
    platform: 'facebook',
    account: 'Ogen',
  },
]

function interactionsOf(row: PerformerRow): number {
  const { likes, comments, shares } = row.metrics
  return likes + comments + shares
}

function rankOn(row: PerformerRow, by: PerformerSort): number {
  if (by === 'reach') return row.reach
  if (by === 'engagement_rate') return row.metrics.engagement_rate
  if (by === 'interactions') return interactionsOf(row)
  // A row the server could not place is ranked on its raw metric instead.
  return row.against_typical ?? row.reach / 100_000
}

function buildBoard(query: PerformersQuery, now: Date): PerformersBoard {
  const overview = buildOverview(query, now)
  const days = overview.window.days
  const end = endOfWindow(now)
  const totalPosts =
    overview.cards.find((c) => c.metric === 'posts_published')?.value ?? 0
  const periodReach =
    overview.cards.find((c) => c.metric === 'reach')?.value ?? 1

  const pool = Math.max(0, Math.min(POSTS.length, totalPosts))

  const rows: PerformerRow[] = POSTS.slice(0, pool).map((post, i) => {
    const next = rng(`ogen-demo:post:${overview.window.to}:${i}`)
    const ageDays = Math.min(days - 1, Math.floor(next() * days))
    const publishedAt = end - ageDays * DAY_MS + 10 * 3600_000
    const reach = 900 + Math.round(next() * 9800)
    const rate = 0.018 + next() * 0.062
    const total = Math.round(reach * rate)
    const likes = Math.round(total * 0.72)
    const comments = Math.round(total * 0.16)

    // Every third row on a platform with too little history to place it — the
    // state the board has to draw with no bar rather than a bar at zero.
    const placeable = i % 4 !== 3
    const against = placeable
      ? Math.round((0.4 + next() * 1.9) * 10) / 10
      : null

    return {
      post_id: `demo-post-${i + 1}`,
      publisher_post_id: `zernio-${i + 1}`,
      title: post.title,
      platform: post.platform,
      account: { username: post.account, display_name: post.account },
      reach,
      // The rule CON-238 draws from the lifespan curve: under three days old,
      // the total is still moving.
      reach_still_accruing: ageDays < 3,
      period_share: reach / Math.max(periodReach, 1),
      metrics: {
        impressions: Math.round(reach * 1.4),
        likes,
        comments,
        shares: Math.max(0, total - likes - comments),
        engagement_rate: rate,
      },
      against_typical: against,
      ...(against === null
        ? { baseline: 'insufficient_history' }
        : {
            direction:
              against >= 1.15 ? 'above' : against <= 0.85 ? 'below' : 'typical',
          }),
      published_at: new Date(publishedAt).toISOString(),
      age_days: ageDays,
    } satisfies PerformerRow
  })

  const by = query.by ?? 'against_typical'
  const ranked = [...rows].sort((a, b) => rankOn(b, by) - rankOn(a, by))
  const limit = Math.min(query.limit ?? 5, 20)
  const bestCount = Math.min(limit, Math.floor(ranked.length / 2))
  const worstCount = Math.min(limit, ranked.length - bestCount)

  return {
    window: overview.window,
    updated_at: overview.updated_at,
    by,
    // The overview's own count, so the two cards agree about the month.
    total_posts: totalPosts,
    best: ranked.slice(0, bestCount),
    // Weakest first — `worst[0]` is the single worst post of the period.
    worst: ranked.slice(ranked.length - worstCount).reverse(),
    insights: [
      {
        id: 'rank_divergence',
        severity: 'info',
        text: 'The post with the most reach is not the one with the best rate.',
        note: 'Both are in the list below, ranked on what the picker is set to.',
      },
      {
        id: 'platform_skew',
        severity: 'note',
        text: 'LinkedIn took three of the top five.',
      },
    ],
  }
}

/* -------------------------------------------------------------- learnings -- */

/**
 * A publishing habit: `[day_of_week (0 = Sunday), hour UTC, posts]`.
 *
 * Weekday mornings and evenings, thinning out at the weekend — sparse on
 * purpose, because the grid the card draws has to cope with most of the week
 * being blank and that is the case the mapper exists for.
 */
const HABIT: readonly [number, number, number][] = [
  [1, 9, 5],
  [1, 12, 3],
  [1, 18, 4],
  [2, 8, 3],
  [2, 15, 4],
  [2, 18, 5],
  [3, 9, 4],
  [3, 12, 6],
  [3, 19, 3],
  [4, 9, 4],
  [4, 13, 3],
  [4, 18, 6],
  [5, 10, 5],
  [5, 16, 3],
  [6, 11, 2],
  [0, 20, 2],
]

/** Thursday 18:00 is the slot that stands out, and everything scales to it. */
const STRONGEST: [number, number] = [4, 18]

function buildLearnings(query: LearningsQuery, now: Date): AnalyticsLearnings {
  const metric = query.metric ?? 'reach'
  // Saves are one figure smaller than reach, and the card's numbers have to
  // move with the picker or it reads as a control that does nothing.
  const scale = metric === 'saves' ? 0.045 : 1

  const medians = HABIT.map(([day, hour, posts]) => {
    const next = rng(`ogen-demo:slot:${day}:${hour}`)
    const best = day === STRONGEST[0] && hour === STRONGEST[1]
    const base = 4200 + next() * 5200 + (best ? 6400 : 0) + posts * 180
    return Math.round(base * scale)
  })
  const top = Math.max(...medians)

  const cells: HeatmapCell[] = HABIT.map(
    ([day_of_week, hour, post_count], i) => ({
      day_of_week,
      hour,
      score: Math.round((medians[i] / top) * 100) / 100,
      post_count,
      median: medians[i],
    }),
  )

  const measured = HABIT.reduce((total, [, , posts]) => total + posts, 0)

  // Derived rather than picked, because the two counts appear four lines apart
  // on the same card: a seed claiming more posts have *finished* earning than
  // were ever measured reads as a bug in the card. A post settles once it is
  // past `t95`, so this is everything but the last few days of publishing.
  const settled = Math.round(measured * 0.78)

  // `share(t) = 1 − 0.5^(t/19)`, which puts the three milestones exactly where
  // t50/t75/t95 say they are rather than near them.
  const halfLife = 19
  const curve = [0, 2, 4, 6, 9, 12, 18, 24, 36, 48, 72, 96, 124].map(
    (age_hours) => ({
      age_hours,
      share_of_final:
        Math.round((1 - Math.pow(0.5, age_hours / halfLife)) * 1000) / 1000,
    }),
  )

  const works: LearningsPattern[] = [
    {
      id: 'media_format:carousel',
      dimension: 'media_format',
      segment: 'carousel',
      headline: 'Carousels',
      metric: 'saves',
      lift: 1.6,
      support: 18,
      detail: 'Roughly 60% more saves than a typical post of yours.',
    },
    {
      id: 'posting_time:evening',
      dimension: 'posting_time',
      segment: 'evening',
      headline: 'Posts after 17:00',
      metric,
      lift: 1.34,
      support: 24,
      detail: `About a third more ${metric} than the ones you send in the morning.`,
    },
  ]

  const fading: LearningsPattern[] = [
    {
      id: 'has_link:true',
      dimension: 'has_link',
      segment: 'true',
      headline: 'Posts with a link out',
      metric: 'reach',
      trend: 0.66,
      support: 31,
      detail:
        'Down by a third across the window, having held steady before it.',
    },
    {
      id: 'hashtag_count:many',
      dimension: 'hashtag_count',
      segment: '6+',
      headline: 'Six or more hashtags',
      metric,
      trend: 0.81,
      support: 12,
      detail: `Slipping, and the posts without them are not — so this is the hashtags rather than the ${metric}.`,
    },
  ]

  return {
    scope: {
      // All of it, which is the default and the case the card is designed for.
      since: null,
      trend_window_days: 90,
      measured_posts: measured,
      settled_posts: settled,
      metric: metric as LearningsMetric,
    },
    updated_at: new Date(now.getTime() - 3 * 3600_000).toISOString(),
    heatmap: {
      metric,
      cells,
      strongest: {
        day_of_week: STRONGEST[0],
        hour: STRONGEST[1],
        post_count: 6,
      },
      measured_posts: measured,
    },
    lifespan: {
      settled_posts: settled,
      t50_hours: halfLife,
      t75_hours: 38,
      t95_hours: 82,
      horizon_hours: 124,
      curve,
    },
    patterns: { works, fading },
  }
}

/* ------------------------------------------------------------- the exports -- */

export function demoOverview(
  query: AnalyticsWindowQuery,
  now: Date = new Date(),
): Promise<InsightEnvelope<AnalyticsOverview>> {
  return envelopeFor(() => buildOverview(query, now))
}

export function demoPerformers(
  query: PerformersQuery,
  now: Date = new Date(),
): Promise<InsightEnvelope<PerformersBoard>> {
  return envelopeFor(() => buildBoard(query, now))
}

export function demoLearnings(
  query: LearningsQuery,
  now: Date = new Date(),
): Promise<InsightEnvelope<AnalyticsLearnings>> {
  return envelopeFor(() => buildLearnings(query, now))
}
