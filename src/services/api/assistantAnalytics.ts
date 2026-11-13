import type {
  AnalyticsApplied,
  AnalyticsRead,
  AnalyticsResults,
  BestTimeSlot,
  BestTimesSummary,
  DecayBucket,
  DecaySummary,
  FollowerAccount,
  FollowerDay,
  FrequencyRow,
  FrequencySummary,
  HalfLife,
  MoreLikeThese,
  PeriodComparison,
  PostsList,
  RankedSlot,
  TrailAsset,
  TrailStep,
} from '@/types/assistant'
import type {
  AnalyticsOverview,
  PerformerRow,
  PerformersBoard,
} from '@/types/analytics'
import { parseGrounding } from './grounding'
import { isRecord } from './json'

/**
 * The analytics pack's typed results (CON-463): `results.analytics` holds each
 * tool's last output in the turn. Every read is `{applied, data}` — what it was
 * narrowed to, which its card cites, and the read itself, or
 * `{available: false, reason}` when it has none. `comparePeriods` and
 * `moreLikeThese` have shapes of their own.
 */
export function analyticsResults(
  results: Record<string, unknown>,
): AnalyticsResults | undefined {
  const a = record(results.analytics)
  if (!a) return undefined
  const out: AnalyticsResults = {
    overview: read(a.analyticsOverview, overview),
    topPosts: read(a.topPosts, performers),
    lessons: read(a.analyticsLessons, (d) => d),
    postStats: read(a.postStats, (d) => d),
    bestTimes: read(a.bestTimes, bestTimes, bestTimesSummary),
    decay: read(a.contentDecay, decay, decaySummary),
    frequency: read(a.postingFrequency, frequency, frequencySummary),
    followers: read(a.followerHistory, followers, (_, data) =>
      biggestDay(record(record(data)?.biggest_day)),
    ),
    posts: read(a.listPostAnalytics, posts),
    compare: compare(a.comparePeriods),
    more: moreLikeThese(a.moreLikeThese),
  }
  for (const key of Object.keys(out) as (keyof AnalyticsResults)[]) {
    if (out[key] === undefined) delete out[key]
  }
  return Object.keys(out).length > 0 ? out : undefined
}

export function applied(raw: unknown): AnalyticsApplied {
  const a = record(raw) ?? {}
  const campaign = record(a.campaign)
  return {
    from: optStr(a.from),
    to: optStr(a.to),
    platforms: strings(a.platforms),
    campaign:
      campaign && str(campaign.id)
        ? { id: str(campaign.id), name: str(campaign.name) }
        : undefined,
    postId: optStr(a.postId),
    note: optStr(a.note),
    preset: optStr(a.preset),
  }
}

/**
 * One read. A data the parser can't use is no data, said as `unavailable`
 * with no reason rather than as an empty card.
 */
function read<T, S = undefined>(
  raw: unknown,
  parse: (data: unknown) => T | undefined,
  summarise?: (summary: unknown, data: unknown) => S | undefined,
): AnalyticsRead<T, S> | undefined {
  const r = record(raw)
  if (!r) return undefined
  const out: AnalyticsRead<T, S> = { applied: applied(r.applied) }
  const data = record(r.data)
  if (data && data.available === false) {
    out.unavailable = str(data.reason) || 'unknown'
    return out
  }
  const parsed = r.data == null ? undefined : parse(r.data)
  if (parsed === undefined) out.unavailable = 'unknown'
  else out.data = parsed
  const summary = summarise?.(r.summary, r.data)
  if (summary !== undefined) out.summary = summary
  return out
}

/** A ranked slot; the publisher counts days from Sunday, the grid from Monday. */
function rankedSlot(raw: unknown): RankedSlot | undefined {
  const s = record(raw)
  if (!s) return undefined
  return {
    day: (num(s.dayOfWeek) + 6) % 7,
    hour: num(s.hour),
    interactions: num(s.avgInteractions),
    posts: num(s.posts),
  }
}

function bestTimesSummary(raw: unknown): BestTimesSummary | undefined {
  const s = record(raw)
  if (!s) return undefined
  return {
    best: rankedSlot(s.best),
    runnerUp: rankedSlot(s.runnerUp),
    weakest: rankedSlot(s.weakest),
    tooFew: s.tooFew === true,
    minPosts: num(s.minPosts),
  }
}

function halfLife(raw: unknown): HalfLife | undefined {
  const h = record(raw)
  return h && str(h.bucket)
    ? { hours: num(h.hours), bucket: str(h.bucket) }
    : undefined
}

function decaySummary(raw: unknown): DecaySummary | undefined {
  const s = record(raw)
  if (!s) return undefined
  return {
    halfLife: halfLife(s.halfLife),
    platforms: (Array.isArray(s.platforms) ? s.platforms : [])
      .filter(isRecord)
      .map((p) => ({
        platform: str(p.platform),
        halfLife: halfLife(p.halfLife),
        buckets: decay(p.buckets) ?? [],
      }))
      .filter((p) => p.platform),
  }
}

function frequencySummary(raw: unknown): FrequencySummary | undefined {
  const s = record(raw)
  if (!s) return undefined
  const c = record(s.cadence)
  return {
    unavailable: optStr(s.unavailable),
    cadence: c
      ? {
          weeks: (Array.isArray(c.weeks) ? c.weeks : [])
            .filter(isRecord)
            .map((w) => ({
              weekStart: str(w.weekStart),
              posts: num(w.posts),
              current: w.current === true,
            }))
            .filter((w) => w.weekStart),
          perWeek: num(c.perWeek),
          lastMonth: num(c.lastMonth),
          platforms: (Array.isArray(c.platforms) ? c.platforms : [])
            .filter(isRecord)
            .map((p) => ({
              platform: str(p.platform),
              perWeek: num(p.perWeek),
            }))
            .filter((p) => p.platform),
        }
      : undefined,
  }
}

function biggestDay(
  d: Record<string, unknown> | null,
): FollowerDay | undefined {
  return d && str(d.date)
    ? { date: str(d.date), gain: num(d.gain), postTitle: optStr(d.post_title) }
    : undefined
}

/**
 * The overview as the dashboard's endpoint answers it, keeping only the
 * cards whose fields the card reads.
 */
function overview(raw: unknown): AnalyticsOverview | undefined {
  const d = record(raw)
  if (!d || !Array.isArray(d.cards)) return undefined
  return {
    ...(d as unknown as AnalyticsOverview),
    cards: d.cards.filter(
      (c): c is AnalyticsOverview['cards'][number] =>
        isRecord(c) &&
        typeof c.metric === 'string' &&
        typeof c.value === 'number' &&
        typeof c.delta_pct === 'number',
    ),
  }
}

/** The board as `/performers` answers it, with its lists as lists. */
function performers(raw: unknown): PerformersBoard | undefined {
  const d = record(raw)
  if (!d) return undefined
  const rows = (v: unknown) =>
    (Array.isArray(v) ? v : []).filter(
      (p): p is PerformerRow =>
        isRecord(p) &&
        typeof p.post_id === 'string' &&
        typeof p.reach === 'number',
    )
  return {
    ...(d as unknown as PerformersBoard),
    total_posts: num(d.total_posts),
    best: rows(d.best),
    worst: rows(d.worst),
  }
}

function bestTimes(raw: unknown): BestTimeSlot[] | undefined {
  if (!Array.isArray(raw)) return undefined
  return raw.filter(isRecord).map((s) => ({
    // The publisher counts from Sunday; the grid starts on Monday.
    day: (num(s.day_of_week) + 6) % 7,
    hour: num(s.hour),
    engagement: num(s.avg_engagement),
    posts: num(s.post_count),
  }))
}

function decay(raw: unknown): DecayBucket[] | undefined {
  if (!Array.isArray(raw)) return undefined
  return raw
    .filter(isRecord)
    .sort((a, b) => num(a.bucket_order) - num(b.bucket_order))
    .map((b) => ({
      label: str(b.bucket_label),
      pct: num(b.avg_pct_of_final),
      posts: num(b.post_count),
    }))
}

function frequency(raw: unknown): FrequencyRow[] | undefined {
  if (!Array.isArray(raw)) return undefined
  return raw.filter(isRecord).map((r) => ({
    platform: str(r.platform),
    perWeek: num(r.posts_per_week),
    rate: num(r.avg_engagement_rate),
    weeks: num(r.weeks_count),
  }))
}

function followers(raw: unknown): FollowerAccount[] | undefined {
  const f = record(raw)
  if (!f) return undefined
  const series = record(f.series) ?? {}
  return (Array.isArray(f.accounts) ? f.accounts : [])
    .filter(isRecord)
    .map((a) => {
      const id = str(a.account_id)
      return {
        id,
        platform: str(a.platform),
        username: str(a.username),
        followers: num(a.current_followers),
        growth: num(a.growth),
        growthPct: num(a.growth_percentage),
        series: (Array.isArray(series[id]) ? (series[id] as unknown[]) : [])
          .filter(isRecord)
          .map((p) => num(p.followers)),
      }
    })
}

function posts(raw: unknown): PostsList | undefined {
  const p = record(raw)
  if (!p) return undefined
  return {
    total: num(p.total),
    sortBy: optStr(p.sort_by),
    order: p.order === 'asc' || p.order === 'desc' ? p.order : undefined,
    items: (Array.isArray(p.items) ? p.items : []).filter(isRecord).map((i) => {
      const m = record(i.analytics) ?? {}
      return {
        postId: str(i.post_id),
        title: str(i.title),
        platform: str(i.platform),
        publishedAt: optStr(i.published_at),
        reach: num(m.reach),
        rate: num(m.engagement_rate),
      }
    }),
  }
}

function compare(raw: unknown): PeriodComparison | undefined {
  const c = record(raw)
  if (!c) return undefined
  return {
    first: applied(c.first),
    second: applied(c.second),
    unavailable: optStr(c.unavailable),
    metrics: (Array.isArray(c.metrics) ? c.metrics : [])
      .filter(isRecord)
      .map((m) => ({
        metric: str(m.metric),
        label: str(m.label),
        unit: (m.unit === 'rate' ? 'rate' : 'count') as 'rate' | 'count',
        first: num(m.first),
        second: num(m.second),
        change: num(m.change),
        changePct:
          typeof m.changePct === 'number' && Number.isFinite(m.changePct)
            ? m.changePct
            : null,
      }))
      .filter((m) => m.metric),
  }
}

function moreLikeThese(raw: unknown): MoreLikeThese | undefined {
  const m = record(raw)
  if (!m) return undefined
  const ref = (v: unknown) => {
    const r = record(v)
    return r && str(r.id) ? { id: str(r.id), title: str(r.title) } : undefined
  }
  const refs = (v: unknown) =>
    (Array.isArray(v) ? v : [])
      .map(ref)
      .filter((r): r is { id: string; title: string } => r !== undefined)
  return {
    campaignId: optStr(m.campaignId),
    grounding: refs(m.grounding),
    filter: optStr(m.filter),
    trail: trailSteps(m.trail),
    ideas: (Array.isArray(m.ideas) ? m.ideas : [])
      .filter(isRecord)
      .map((i) => ({
        id: str(i.id),
        title: str(i.title),
        angle: optStr(i.angle),
        grounding: parseGrounding(i.grounding),
      }))
      .filter((i) => i.id && i.title),
  }
}

function trailAsset(value: unknown): TrailAsset | undefined {
  const a = record(value)
  return a && str(a.id)
    ? { id: str(a.id), title: str(a.title), type: optStr(a.type) }
    : undefined
}

/**
 * How each example came to be — the result's, and since CON-479 the offer
 * card's too, shown before the yes.
 */
export function trailSteps(value: unknown): TrailStep[] {
  return (Array.isArray(value) ? value : [])
    .filter(isRecord)
    .map((s) => ({
      postId: str(s.postId),
      title: str(s.title),
      rate: typeof s.rate === 'number' ? s.rate : undefined,
      ideas: (Array.isArray(s.ideas) ? s.ideas : [])
        .filter(isRecord)
        .map((i) => {
          const an = record(i.analysis)
          return {
            id: str(i.id),
            title: str(i.title),
            analysis:
              an && str(an.id)
                ? {
                    id: str(an.id),
                    campaignId: optStr(an.campaignId),
                    campaignName: optStr(an.campaignName),
                  }
                : undefined,
            asset: trailAsset(i.asset),
            passages: strings(i.passages),
          }
        }),
      assets: (Array.isArray(s.assets) ? s.assets : [])
        .map(trailAsset)
        .filter((a): a is TrailAsset => a !== undefined),
      noTrail: s.noTrail === true,
    }))
    .filter((s) => s.postId)
}

function record(value: unknown): Record<string, unknown> | null {
  return isRecord(value) ? value : null
}

function str(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

function optStr(value: unknown): string | undefined {
  return typeof value === 'string' && value ? value : undefined
}

function num(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0
}

function strings(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((v): v is string => typeof v === 'string')
    : []
}
