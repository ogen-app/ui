import type {
  AnalyticsApplied,
  AnalyticsRead,
  AnalyticsResults,
  BestTimeSlot,
  DecayBucket,
  FollowerAccount,
  FrequencyRow,
  MoreLikeThese,
  PeriodComparison,
  PostsList,
} from '@/types/assistant'
import type { AnalyticsOverview, PerformersBoard } from '@/types/analytics'
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
    overview: read(a.analyticsOverview, (d) =>
      isRecord(d) && Array.isArray(d.cards)
        ? (d as unknown as AnalyticsOverview)
        : undefined,
    ),
    topPosts: read(a.topPosts, (d) =>
      isRecord(d) ? (d as unknown as PerformersBoard) : undefined,
    ),
    lessons: read(a.analyticsLessons, (d) => d),
    postStats: read(a.postStats, (d) => d),
    bestTimes: read(a.bestTimes, bestTimes),
    decay: read(a.contentDecay, decay),
    frequency: read(a.postingFrequency, frequency),
    followers: read(a.followerHistory, followers),
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
  }
}

/**
 * One read. A data the parser can't use is no data, said as `unavailable`
 * with no reason rather than as an empty card.
 */
function read<T>(
  raw: unknown,
  parse: (data: unknown) => T | undefined,
): AnalyticsRead<T> | undefined {
  const r = record(raw)
  if (!r) return undefined
  const out: AnalyticsRead<T> = { applied: applied(r.applied) }
  const data = record(r.data)
  if (data && data.available === false) {
    out.unavailable = str(data.reason) || 'unknown'
    return out
  }
  const parsed = r.data == null ? undefined : parse(r.data)
  if (parsed === undefined) out.unavailable = 'unknown'
  else out.data = parsed
  return out
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
    trail: (Array.isArray(m.trail) ? m.trail : [])
      .filter(isRecord)
      .map((s) => ({
        postId: str(s.postId),
        title: str(s.title),
        ideas: (Array.isArray(s.ideas) ? s.ideas : [])
          .filter(isRecord)
          .map((i) => ({
            id: str(i.id),
            title: str(i.title),
            asset: ref(i.asset),
          })),
        assets: refs(s.assets),
        noTrail: s.noTrail === true,
      })),
    ideas: (Array.isArray(m.ideas) ? m.ideas : [])
      .filter(isRecord)
      .map((i) => ({
        id: str(i.id),
        title: str(i.title),
        angle: optStr(i.angle),
        sources: strings(i.sources),
        grounded: i.groundingMode === 'grounded',
      }))
      .filter((i) => i.id && i.title),
  }
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
