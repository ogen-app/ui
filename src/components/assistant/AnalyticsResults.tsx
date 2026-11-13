import { Fragment, type ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import { ChartBarIcon, LightbulbIcon } from '@phosphor-icons/react'
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'
import {
  formatCount,
  formatMeasure,
  measureCopy,
} from '@/components/analytics/format'
import { DecayCurve, Sparkline } from '@/components/analytics/charts'
import type { MeasureId } from '@/components/analytics/types'
import { usePlatformCatalog } from '@/hooks/usePlatforms'
import { counted, formatDate, formatList, formatNumber } from '@/lib/intl'
import { cn } from '@/lib/styles'
import { periodLabel, windowDay as day } from '@/lib/analyticsCitation'
import { presetName } from '@/lib/analyticsWindow'
import { searchFromViewQuery } from '@/lib/ideaFilter'
import type {
  AnalyticsApplied,
  AnalyticsRead,
  AnalyticsResults as Results,
  BestTimesSummary,
  DecayBucket,
  DecaySummary,
  FollowerAccount,
  FollowerDay,
  FrequencyRow,
  FrequencySummary,
  Grounding,
  MoreLikeThese,
  PeriodComparison,
  PeriodMetric,
  PostsList,
  RankedSlot,
  TrailStep,
} from '@/types/assistant'
import type {
  AnalyticsOverview,
  PerformerRow,
  PerformersBoard,
} from '@/types/analytics'
import { AssetTypeBadge } from './AssetTypeBadge'
import {
  ResultBlock,
  ResultRow,
  SourcesLine,
  TEXT_ACTION_CLASS,
} from './blocks'

/**
 * What the analytics pack read or wrote this turn (CON-463, drawn as CON-479
 * has them), one card each. Every figure card ends on what the read covered —
 * period · platforms · campaign, in that order and in the dashboard scope
 * bar's own words — so a default the server picked is never mistaken for what
 * is on screen. Figures are in Plex Mono. The lessons and one post's figures
 * stay with the model's words, and are cited alone.
 */
export function AnalyticsResults({ results: r }: { results: Results }) {
  const { t } = useTranslation()
  const cite = useCitation()
  const names = usePlatformNames()
  const entries: [string, ReactNode][] = [
    ['compare', r.compare && <CompareCard compare={r.compare} cite={cite} />],
    [
      'overview',
      r.overview && (
        <ReadCard
          read={r.overview}
          status={t('assistant.analytics.overview.word')}
          cite={cite}
          against
          render={(d) => <OverviewRows overview={d} />}
          title={(d, a) => overviewTitle(t, names, d, a)}
        />
      ),
    ],
    [
      'topPosts',
      r.topPosts && (
        <ReadCard
          read={r.topPosts}
          status={t('assistant.analytics.topPosts.word')}
          cite={cite}
          title={(d) =>
            t('assistant.analytics.topPosts.title', counted(d.total_posts))
          }
          render={(d) => <TopPostsRows board={d} />}
        />
      ),
    ],
    [
      'bestTimes',
      r.bestTimes && (
        <ReadCard
          read={r.bestTimes}
          status={t('assistant.analytics.bestTimes.word')}
          cite={cite}
          span="allTime"
          extra={t('assistant.analytics.bestTimes.utc')}
          title={() => bestTimesTitle(t, r.bestTimes?.summary)}
          meta={() => runnerUpMeta(t, r.bestTimes?.summary)}
          render={() => <BestTimesRows summary={r.bestTimes?.summary} />}
        />
      ),
    ],
    [
      'decay',
      r.decay && (
        <ReadCard
          read={r.decay}
          status={t('assistant.analytics.decay.word')}
          cite={cite}
          span="allTime"
          title={() => decayTitle(t, r.decay?.summary)}
          render={(d) => <DecayRows buckets={d} summary={r.decay?.summary} />}
        />
      ),
    ],
    [
      'frequency',
      r.frequency && (
        <ReadCard
          read={r.frequency}
          status={t('assistant.analytics.frequency.word')}
          cite={cite}
          span={
            r.frequency.summary?.cadence
              ? { weeks: r.frequency.summary.cadence.weeks.length }
              : 'allTime'
          }
          extra={
            r.frequency.summary?.cadence
              ? t('assistant.analytics.frequency.throughOgen')
              : undefined
          }
          title={(d) => frequencyTitle(t, d, r.frequency?.summary)}
          meta={() => frequencyMeta(t, r.frequency?.summary)}
          render={(d) => (
            <FrequencyRows rows={d} summary={r.frequency?.summary} />
          )}
        />
      ),
    ],
    [
      'followers',
      r.followers && (
        <ReadCard
          read={r.followers}
          status={t('assistant.analytics.followers.word')}
          cite={cite}
          title={(d) =>
            formatNumber(d.reduce((sum, a) => sum + a.followers, 0))
          }
          meta={(d) => growth(d.reduce((sum, a) => sum + a.growth, 0))}
          render={(d) => (
            <FollowerRows accounts={d} biggest={r.followers?.summary} />
          )}
        />
      ),
    ],
    [
      'posts',
      r.posts && (
        <ReadCard
          read={r.posts}
          status={t('assistant.analytics.posts.word')}
          cite={cite}
          span="allTime"
          extra={r.posts.data ? sortedBy(t, r.posts.data) : undefined}
          title={(d, a) => postsTitle(t, names, d, a)}
          action={<PostsOpen applied={r.posts.applied} />}
          render={(d) => <PostRows list={d} />}
        />
      ),
    ],
    ['more', r.more && <MoreLikeTheseCard more={r.more} />],
    [
      'lessons',
      r.lessons && (
        <CitedLine
          what={t('assistant.analytics.lessons')}
          line={cite(r.lessons.applied, { span: 'allTime' })}
        />
      ),
    ],
    [
      'postStats',
      r.postStats && (
        <CitedLine
          what={t('assistant.analytics.postStats')}
          line={t('assistant.analytics.note.postStats')}
        />
      ),
    ],
  ]
  const blocks = entries.filter(([, node]) => Boolean(node))
  if (blocks.length === 0) return null
  return (
    <div className="flex flex-col gap-5">
      {blocks.map(([key, block]) => (
        <Fragment key={key}>{block}</Fragment>
      ))}
    </div>
  )
}

/**
 * What a read's period was: its window, all time for a read no dates narrow,
 * or the weeks a cadence counts.
 */
type Span = 'window' | 'allTime' | { weeks: number }

type CiteOptions = {
  span?: Span
  /** One more clause after the campaign: "sorted by engagement rate". */
  extra?: string
  /** "against the 30 days before", for a read that compares. */
  against?: boolean
}

type Cite = (applied: AnalyticsApplied, options?: CiteOptions) => string

/** The period alone, as the scope bar would name it. */
function periodOf(t: TFunction, a: AnalyticsApplied, span: Span = 'window') {
  if (span === 'allTime') return t('assistant.analytics.cite.allTime')
  if (typeof span === 'object')
    return t('assistant.analytics.cite.lastWeeks', counted(span.weeks))
  if (a.preset) return presetName(t, a.preset)
  if (a.from && a.to) return periodLabel(t, a.from, a.to)
  if (a.from) return t('assistant.analytics.cite.since', { day: day(a.from) })
  return null
}

/** Days in an inclusive window. */
function daysIn(from: string, to: string): number {
  return Math.round((Date.parse(to) - Date.parse(from)) / 86_400_000) + 1
}

/**
 * The filters a read applied, in the scope bar's words (CON-479): period ·
 * platforms · campaign, with "All platforms" and "All campaigns" spelled out
 * rather than left off, so a card says what the screen says.
 */
function usePlatformNames(): (slugs: string[]) => string {
  const { resolve } = usePlatformCatalog()
  return (slugs) => formatList(slugs.map((s) => resolve(s)?.name ?? s))
}

function useCitation(): Cite {
  const { t } = useTranslation()
  const names = usePlatformNames()
  return (a, options = {}) => {
    const parts: string[] = []
    const period = periodOf(t, a, options.span)
    if (period) parts.push(period)
    parts.push(
      a.platforms.length > 0
        ? names(a.platforms)
        : t('assistant.analytics.cite.allPlatforms'),
    )
    parts.push(a.campaign?.name || t('assistant.analytics.cite.allCampaigns'))
    if (options.against && a.from && a.to)
      parts.push(
        t('assistant.analytics.cite.against', counted(daysIn(a.from, a.to))),
      )
    if (options.extra) parts.push(options.extra)
    return parts.join(' · ')
  }
}

function growth(n: number): string {
  return `${n > 0 ? '+' : n < 0 ? '−' : ''}${formatNumber(Math.abs(n))}`
}

/** The card's last line: what it read over, where sources sit elsewhere. */
function CiteFooter({ line }: { line: string }) {
  return (
    <p className="border-t border-border pt-2.5 text-[12.5px] text-secondary-foreground">
      {line}
    </p>
  )
}

/** A read the model words alone, cited on one line. */
function CitedLine({ what, line }: { what: string; line: string }) {
  return (
    <p className="text-[12.5px] text-secondary-foreground">
      <span className="text-foreground">{what}</span> {line}
    </p>
  )
}

/**
 * One windowed read: its figures, or why there are none, then what it read
 * over. A read with nothing to show says so in the card's own place rather
 * than vanishing, because the model's words around it still cite it.
 */
function ReadCard<T, S>({
  read,
  status,
  title,
  meta,
  action,
  span,
  extra,
  against,
  cite,
  render,
}: {
  read: AnalyticsRead<T, S>
  status: string
  title: (data: T, applied: AnalyticsApplied) => string
  meta?: (data: T) => string | undefined
  action?: ReactNode
  span?: Span
  extra?: string
  against?: boolean
  cite: Cite
  render: (data: T) => ReactNode
}) {
  const { t } = useTranslation()
  const line = cite(read.applied, { span, extra, against })
  if (read.data === undefined) {
    return (
      <ResultBlock
        status={status}
        tone="warning"
        title={unavailableTitle(t, read.unavailable)}
      >
        <CiteFooter line={line} />
      </ResultBlock>
    )
  }
  return (
    <ResultBlock
      status={status}
      title={title(read.data, read.applied)}
      meta={meta?.(read.data)}
      action={action}
    >
      {render(read.data)}
      <CiteFooter line={line} />
    </ResultBlock>
  )
}

function unavailableTitle(t: TFunction, reason?: string): string {
  switch (reason) {
    case 'no_data':
      return t('assistant.analytics.unavailable.noData')
    case 'addon_required':
      return t('assistant.analytics.unavailable.addon')
    case 'not_configured':
      return t('assistant.analytics.unavailable.notConfigured')
    default:
      return t('assistant.analytics.unavailable.other')
  }
}

/** The wire's metric keys onto the dashboard's measures, as the tiles name them. */
const MEASURE_OF: Record<string, MeasureId> = {
  reach: 'reach',
  interactions: 'interactions',
  engagement_rate: 'engagement_rate',
  followers: 'followers',
  posts_published: 'published',
}

/** A figure's own type: Plex Mono, regular, so columns of them line up. */
const FIGURE = 'font-mono text-[13px] font-normal tabular-nums'

function Figure({
  label,
  value,
  change,
  sub,
}: {
  label: ReactNode
  value: string
  change?: { text: string; down: boolean }
  /** Muted words after the figure: "9 posts", "to half". */
  sub?: string
}) {
  return (
    <ResultRow className="flex items-baseline gap-3 text-sm">
      <span className="min-w-0 flex-1 truncate text-foreground">{label}</span>
      <span className={cn(FIGURE, 'text-foreground')}>{value}</span>
      {change && (
        <span
          className={cn(
            FIGURE,
            'w-16 shrink-0 text-right text-[12.5px]',
            change.down ? 'text-warning-ink' : 'text-secondary-foreground',
          )}
        >
          {change.text}
        </span>
      )}
      {sub && (
        <span className="shrink-0 text-[12.5px] text-secondary-foreground">
          {sub}
        </span>
      )}
    </ResultRow>
  )
}

function signedPct(t: TFunction, pct: number): string {
  return t('assistant.analytics.change', {
    value: `${pct > 0 ? '+' : pct < 0 ? '−' : ''}${formatNumber(Math.abs(pct), {
      maximumFractionDigits: 1,
    })}`,
  })
}

/** A rate's change, in points: "+0.6 pt". */
function signedPoints(t: TFunction, points: number): string {
  return t('assistant.analytics.points', {
    value: `${points > 0 ? '+' : points < 0 ? '−' : ''}${formatNumber(
      Math.abs(points),
      { maximumFractionDigits: 1 },
    )}`,
  })
}

/**
 * "Spring reopening on Instagram", "The workspace" — what the overview was
 * narrowed to, the campaign first and the platforms after it.
 */
function overviewTitle(
  t: TFunction,
  names: (slugs: string[]) => string,
  d: AnalyticsOverview,
  a: AnalyticsApplied,
): string {
  if (d.cards.length === 0) return t('assistant.analytics.overview.empty')
  const subject =
    a.campaign?.name || t('assistant.analytics.overview.workspace')
  if (a.platforms.length === 0) return subject
  return t('assistant.analytics.overview.on', {
    subject,
    platforms: names(a.platforms),
  })
}

function OverviewRows({ overview }: { overview: AnalyticsOverview }) {
  const { t } = useTranslation()
  return overview.cards.map((card) => {
    const measure = MEASURE_OF[card.metric]
    return (
      <Figure
        key={card.metric}
        label={measure ? measureCopy(t, measure).label : card.label}
        value={
          measure
            ? formatMeasure(t, measure, card.value)
            : formatNumber(card.value)
        }
        change={
          card.direction === 'flat'
            ? undefined
            : {
                text: signedPct(t, card.delta_pct),
                down: card.direction === 'down',
              }
        }
      />
    )
  })
}

/** Rows each end shows. */
const RANK_ROWS = 3

function TopPostsRows({ board }: { board: PerformersBoard }) {
  const { t } = useTranslation()
  const row = (p: PerformerRow) => (
    <ResultRow key={p.post_id} className="flex items-baseline gap-3 text-sm">
      <span className="min-w-0 flex-1 truncate text-foreground">
        {p.title || t('assistant.analytics.untitled')}
      </span>
      <span className={cn(FIGURE, 'shrink-0 text-secondary-foreground')}>
        {typeof p.against_typical === 'number'
          ? t('assistant.analytics.topPosts.typical', {
              value: formatNumber(p.against_typical, {
                maximumFractionDigits: 1,
              }),
            })
          : t('assistant.analytics.topPosts.reach', {
              value: formatCount(t, p.reach),
            })}
      </span>
    </ResultRow>
  )
  const best = (board.best ?? []).slice(0, RANK_ROWS)
  const worst = (board.worst ?? []).slice(0, RANK_ROWS)
  return (
    <>
      {best.map(row)}
      {worst.length > 0 && (
        <p className="pt-3 pb-1 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-secondary-foreground">
          {t('assistant.analytics.topPosts.weakest')}
        </p>
      )}
      {worst.map(row)}
    </>
  )
}

/** "Thursday", in the active language: 1 Jan 2024 was a Monday. */
function weekday(day: number, style: 'long' | 'short'): string {
  return (
    formatDate(new Date(Date.UTC(2024, 0, 1 + day)), {
      weekday: style,
      timeZone: 'UTC',
    }) ?? ''
  )
}

/** "Thursday at 18:00" — a slot as the headline says it. */
function slotLong(t: TFunction, s: RankedSlot): string {
  return t('assistant.analytics.bestTimes.at', {
    day: weekday(s.day, 'long'),
    hour: String(s.hour).padStart(2, '0'),
  })
}

/** "Thu 18:00" — a slot as a row says it. */
function slotShort(t: TFunction, s: RankedSlot): string {
  return t('assistant.analytics.bestTimes.slot', {
    day: weekday(s.day, 'short'),
    hour: String(s.hour).padStart(2, '0'),
  })
}

function bestTimesTitle(t: TFunction, s: BestTimesSummary | undefined): string {
  return s?.best && !s.tooFew
    ? slotLong(t, s.best)
    : t('assistant.analytics.bestTimes.none')
}

function runnerUpMeta(
  t: TFunction,
  s: BestTimesSummary | undefined,
): string | undefined {
  return s?.runnerUp && !s.tooFew
    ? t('assistant.analytics.bestTimes.then', {
        slot: slotLong(t, s.runnerUp),
      })
    : undefined
}

/**
 * The strongest slot, the best on another day and the weakest, each with its
 * figure — average interactions per post, a count and not a rate — and the
 * posts it rests on. Too few posts in any slot ranks nothing, and says so.
 */
function BestTimesRows({ summary }: { summary?: BestTimesSummary }) {
  const { t } = useTranslation()
  if (!summary || summary.tooFew) return null
  const rows: [RankedSlot | undefined, boolean][] = [
    [summary.best, false],
    [summary.runnerUp, false],
    [summary.weakest, true],
  ]
  return rows.map(([slot, weakest]) =>
    slot ? (
      <Figure
        key={`${slot.day}-${slot.hour}`}
        label={slotShort(t, slot)}
        value={t('assistant.analytics.bestTimes.avg', {
          value: formatNumber(slot.interactions, { maximumFractionDigits: 0 }),
        })}
        sub={
          weakest
            ? t('assistant.analytics.bestTimes.weakest', counted(slot.posts))
            : t('assistant.analytics.posts.count', counted(slot.posts))
        }
      />
    ) : null,
  )
}

function decayTitle(t: TFunction, s: DecaySummary | undefined): string {
  return s?.halfLife?.hours
    ? t('assistant.analytics.decay.half', {
        hours: formatNumber(s.halfLife.hours, { maximumFractionDigits: 0 }),
      })
    : t('assistant.analytics.decay.title')
}

/** A curve's points from its buckets, one step each, and where it crosses half. */
function curveOf(buckets: DecayBucket[], halfBucket?: string) {
  const points = buckets.map((b, i) => ({ hour: i, share: b.pct / 100 }))
  const at = buckets.findIndex((b) => b.label === halfBucket)
  return { points, milestones: at >= 0 ? [{ share: 0.5, hour: at }] : [] }
}

/**
 * How engagement builds: the curve with where it crosses half marked, then
 * each platform's own half-life. A read with no buckets says there are too
 * few posts rather than drawing an empty card.
 */
function DecayRows({
  buckets,
  summary,
}: {
  buckets: DecayBucket[]
  summary?: DecaySummary
}) {
  const { t } = useTranslation()
  const { resolve } = usePlatformCatalog()
  if (buckets.length === 0) {
    return (
      <ResultRow className="text-sm text-secondary-foreground">
        {t('assistant.analytics.decay.tooFew')}
      </ResultRow>
    )
  }
  const curve = curveOf(buckets, summary?.halfLife?.bucket)
  return (
    <>
      <div className="py-2.5">
        <DecayCurve
          points={curve.points}
          milestones={curve.milestones}
          tone="accent"
        />
      </div>
      {(summary?.platforms ?? []).map((p) => (
        <Figure
          key={p.platform}
          label={resolve(p.platform)?.name ?? p.platform}
          value={
            p.halfLife?.hours
              ? t('assistant.analytics.decay.hours', {
                  value: formatNumber(p.halfLife.hours, {
                    maximumFractionDigits: 0,
                  }),
                })
              : '—'
          }
          sub={t('assistant.analytics.decay.toHalf')}
        />
      ))}
    </>
  )
}

/** Each platform's best cadence, the rate the publisher measured at it. */
function bestCadences(rows: FrequencyRow[]): FrequencyRow[] {
  const best = new Map<string, FrequencyRow>()
  for (const r of rows) {
    const held = best.get(r.platform)
    if (!held || r.rate > held.rate) best.set(r.platform, r)
  }
  return [...best.values()].sort((a, b) => b.rate - a.rate)
}

function perWeek(value: number): string {
  return formatNumber(value, {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })
}

/**
 * How often the workspace posts (CON-479): the weekly average, from the
 * posts published through Ogen. Without that count, the publisher's best
 * cadence, as before.
 */
function frequencyTitle(
  t: TFunction,
  rows: FrequencyRow[],
  s: FrequencySummary | undefined,
): string {
  if (s?.cadence)
    return t('assistant.analytics.frequency.perWeek', {
      value: perWeek(s.cadence.perWeek),
    })
  const top = bestCadences(rows)[0]
  return top
    ? t('assistant.analytics.frequency.title', counted(top.perWeek))
    : t('assistant.analytics.frequency.none')
}

function frequencyMeta(
  t: TFunction,
  s: FrequencySummary | undefined,
): string | undefined {
  return s?.cadence
    ? t('assistant.analytics.frequency.lastMonth', counted(s.cadence.lastMonth))
    : undefined
}

/**
 * The weeks as bars, this week in teal, then each platform's own rate. The
 * publisher's cadence rows only stand in when Ogen's count isn't there.
 */
function FrequencyRows({
  rows,
  summary,
}: {
  rows: FrequencyRow[]
  summary?: FrequencySummary
}) {
  const { t } = useTranslation()
  const { resolve } = usePlatformCatalog()
  const cadence = summary?.cadence
  if (cadence) {
    const max = Math.max(...cadence.weeks.map((w) => w.posts), 1)
    return (
      <>
        {cadence.weeks.length > 0 && (
          <div
            className="flex h-16 items-end gap-1 py-2.5"
            role="img"
            aria-label={t('assistant.analytics.frequency.aria')}
          >
            {cadence.weeks.map((w) => (
              <span
                key={w.weekStart}
                title={t('assistant.analytics.frequency.week', {
                  week: day(w.weekStart),
                  ...counted(w.posts),
                })}
                className={cn(
                  'min-w-0 flex-1',
                  w.current ? 'bg-accent-ink' : 'bg-quaternary',
                )}
                style={{ height: `${Math.max(4, (w.posts / max) * 100)}%` }}
              />
            ))}
          </div>
        )}
        {cadence.platforms.map((p) => (
          <Figure
            key={p.platform}
            label={resolve(p.platform)?.name ?? p.platform}
            value={t('assistant.analytics.frequency.aWeek', {
              value: perWeek(p.perWeek),
            })}
          />
        ))}
      </>
    )
  }
  return bestCadences(rows).map((r) => (
    <Figure
      key={r.platform}
      label={t('assistant.analytics.frequency.row', {
        platform: resolve(r.platform)?.name ?? r.platform,
        ...counted(r.perWeek),
      })}
      value={t('assistant.analytics.percent', {
        value: formatNumber(r.rate, { maximumFractionDigits: 1 }),
      })}
      sub={t('assistant.analytics.frequency.weeks', counted(r.weeks))}
    />
  ))
}

/**
 * The followers as one line across the window — every account summed by
 * day — and the day they grew most, with the post that reached most then.
 */
function FollowerRows({
  accounts,
  biggest,
}: {
  accounts: FollowerAccount[]
  biggest?: FollowerDay
}) {
  const { t } = useTranslation()
  const length = Math.max(0, ...accounts.map((a) => a.series.length))
  const summed = Array.from({ length }, (_, i) =>
    accounts.reduce((sum, a) => sum + (a.series[i] ?? 0), 0),
  )
  return (
    <>
      {summed.length > 1 && (
        <div className="py-2.5">
          <Sparkline
            className="h-12"
            points={summed.map((value, i) => ({ date: String(i), value }))}
            direction="neutral"
          />
        </div>
      )}
      {biggest && (
        <Figure
          label={t('assistant.analytics.followers.biggest')}
          value={day(biggest.date)}
          sub={
            biggest.postTitle
              ? t('assistant.analytics.followers.gainWith', {
                  gain: growth(biggest.gain),
                  post: biggest.postTitle,
                })
              : growth(biggest.gain)
          }
        />
      )}
    </>
  )
}

/**
 * The list's sort keys (the server's `sort_by`) that are a figure a row
 * carries. Any other key — likes, saves, published_at — words the list by
 * its size and shows reach and rate, rather than naming a figure it hasn't.
 */
const SORT_MEASURE: Record<string, MeasureId> = {
  engagement: 'engagement_rate',
  reach: 'reach',
}

/**
 * "3 lowest on LinkedIn" — the list by what it was sorted on and which way,
 * and the platform when it is one. A list whose sort the server didn't say
 * is counted.
 */
function postsTitle(
  t: TFunction,
  names: (slugs: string[]) => string,
  d: PostsList,
  a: AnalyticsApplied,
): string {
  if (!d.sortBy || !SORT_MEASURE[d.sortBy])
    return t('assistant.analytics.posts.title', counted(d.total))
  const n = counted(d.items.length)
  const low = d.order === 'asc'
  if (a.platforms.length === 1) {
    const platform = names(a.platforms)
    return low
      ? t('assistant.analytics.posts.lowestOn', { ...n, platform })
      : t('assistant.analytics.posts.highestOn', { ...n, platform })
  }
  return low
    ? t('assistant.analytics.posts.lowest', n)
    : t('assistant.analytics.posts.highest', n)
}

function sortedBy(t: TFunction, d: PostsList): string | undefined {
  const measure = d.sortBy ? SORT_MEASURE[d.sortBy] : undefined
  return measure
    ? t('assistant.analytics.posts.sortedBy', {
        measure: measureCopy(t, measure).label.toLowerCase(),
      })
    : undefined
}

/** OPEN: the dashboard narrowed to what the list read. */
function PostsOpen({ applied }: { applied: AnalyticsApplied }) {
  const { t } = useTranslation()
  return (
    <Link
      to="/analytics"
      search={{
        ...(applied.preset
          ? { window: applied.preset }
          : applied.from && applied.to
            ? { from: applied.from, to: applied.to }
            : {}),
        ...(applied.platforms.length > 0
          ? { platform: applied.platforms.join(',') }
          : {}),
        ...(applied.campaign ? { campaign_id: applied.campaign.id } : {}),
      }}
      className={TEXT_ACTION_CLASS}
    >
      {t('assistant.analytics.posts.open')}
    </Link>
  )
}

/**
 * Each post with its date under it and the one figure the list was sorted
 * on; a list that doesn't say shows reach and rate, as before.
 */
function PostRows({ list }: { list: PostsList }) {
  const { t } = useTranslation()
  const measure = list.sortBy ? SORT_MEASURE[list.sortBy] : undefined
  return list.items.map((p) => (
    <ResultRow key={p.postId} className="flex items-baseline gap-3 text-sm">
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-foreground">
          {p.title || t('assistant.analytics.untitled')}
        </span>
        {p.publishedAt && (
          <span className="text-[12.5px] text-secondary-foreground">
            {day(p.publishedAt)}
          </span>
        )}
      </span>
      <span className={cn(FIGURE, 'shrink-0 text-foreground')}>
        {measure === 'reach'
          ? formatCount(t, p.reach)
          : measure
            ? formatMeasure(t, 'engagement_rate', p.rate)
            : t('assistant.analytics.posts.figures', {
                reach: formatCount(t, p.reach),
                rate: formatMeasure(t, 'engagement_rate', p.rate),
              })}
      </span>
    </ResultRow>
  ))
}

/** A whole calendar month, named: "March". Anything else, its days. */
function periodName(t: TFunction, a: AnalyticsApplied): string {
  if (!a.from || !a.to) return ''
  const from = new Date(`${a.from}T00:00:00Z`)
  const to = new Date(`${a.to}T00:00:00Z`)
  const last = new Date(
    Date.UTC(from.getUTCFullYear(), from.getUTCMonth() + 1, 0),
  )
  if (
    from.getUTCDate() === 1 &&
    to.getUTCFullYear() === last.getUTCFullYear() &&
    to.getUTCMonth() === last.getUTCMonth() &&
    to.getUTCDate() === last.getUTCDate()
  )
    return formatDate(from, { month: 'long', timeZone: 'UTC' }) ?? ''
  return periodLabel(t, a.from, a.to)
}

/** A metric's change as the board has it: points for a rate, the count for posts, else a percent. */
function changeText(t: TFunction, m: PeriodMetric): string {
  if (m.unit === 'rate') return signedPoints(t, m.change)
  if (m.metric === 'posts_published') return growth(m.change)
  return m.changePct !== null
    ? signedPct(t, m.changePct)
    : t('assistant.analytics.compare.new')
}

/**
 * Two periods side by side, with the change the server worked out (CON-479):
 * the later period's name over its column, a tally of where it did better in
 * the headline, both periods' days in the footer, and a note when they are
 * not the same length. A metric that fell is amber even when the rest rose —
 * that is the one worth asking about.
 */
function CompareCard({
  compare,
  cite,
}: {
  compare: PeriodComparison
  cite: Cite
}) {
  const { t } = useTranslation()
  const first = periodName(t, compare.first)
  const second = periodName(t, compare.second)
  const days = (a: AnalyticsApplied) =>
    a.from && a.to ? periodLabel(t, a.from, a.to) : ''
  const scope = cite(
    { ...compare.first, from: undefined, to: undefined, preset: undefined },
    {
      extra: undefined,
    },
  )
  const footer = [
    t('assistant.analytics.compare.vs', {
      first: days(compare.first),
      second: days(compare.second),
    }),
    scope,
  ]
    .filter(Boolean)
    .join(' · ')
  if (compare.unavailable || compare.metrics.length === 0) {
    return (
      <ResultBlock
        status={t('assistant.analytics.compare.word')}
        tone="warning"
        title={unavailableTitle(t, compare.unavailable)}
      >
        <CiteFooter line={footer} />
      </ResultBlock>
    )
  }
  // Rises against falls; an unchanged metric counts for neither period.
  const up = compare.metrics.filter((m) => m.change > 0).length
  const down = compare.metrics.filter((m) => m.change < 0).length
  const total = compare.metrics.length
  const lengths =
    compare.first.from &&
    compare.first.to &&
    compare.second.from &&
    compare.second.to
      ? [
          daysIn(compare.first.from, compare.first.to),
          daysIn(compare.second.from, compare.second.to),
        ]
      : null
  return (
    <ResultBlock
      status={t('assistant.analytics.compare.word')}
      title={
        up > down
          ? t('assistant.analytics.compare.beat', { first, second })
          : down > up
            ? t('assistant.analytics.compare.trailed', { first, second })
            : t('assistant.analytics.compare.level', { first, second })
      }
      meta={
        up === down
          ? t('assistant.analytics.compare.split', {
              up: formatNumber(up),
              down: formatNumber(down),
            })
          : t('assistant.analytics.compare.on', {
              won: formatNumber(Math.max(up, down)),
              total: formatNumber(total),
            })
      }
    >
      <div className="flex gap-3 pb-1.5 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-secondary-foreground">
        <span className="min-w-0 flex-1" />
        <span className="w-16 shrink-0 truncate text-right">{first}</span>
        <span className="w-16 shrink-0 truncate text-right">{second}</span>
        <span className="w-16 shrink-0 text-right">
          {t('assistant.analytics.compare.change')}
        </span>
      </div>
      {compare.metrics.map((m) => {
        const measure = MEASURE_OF[m.metric]
        const value = (v: number) =>
          measure ? formatMeasure(t, measure, v) : formatNumber(v)
        return (
          <ResultRow
            key={m.metric}
            className="flex items-baseline gap-3 text-sm"
          >
            <span className="min-w-0 flex-1 truncate text-foreground">
              {measure ? measureCopy(t, measure).label : m.label}
            </span>
            <span
              className={cn(
                FIGURE,
                'w-16 shrink-0 text-right text-secondary-foreground',
              )}
            >
              {value(m.first)}
            </span>
            <span
              className={cn(FIGURE, 'w-16 shrink-0 text-right text-foreground')}
            >
              {value(m.second)}
            </span>
            <span
              className={cn(
                FIGURE,
                'w-16 shrink-0 text-right text-[12.5px]',
                m.change < 0 ? 'text-warning-ink' : 'text-secondary-foreground',
              )}
            >
              {changeText(t, m)}
            </span>
          </ResultRow>
        )
      })}
      <CiteFooter line={footer} />
      {lengths && lengths[0] !== lengths[1] && (
        <p className="pt-2 text-[12.5px] text-secondary-foreground">
          {t('assistant.analytics.compare.lengths', {
            first: formatNumber(lengths[0]),
            second: formatNumber(lengths[1]),
          })}
        </p>
      )}
    </ResultBlock>
  )
}

/** "Workspace analysis", "Spring reopening analysis". */
function analysisName(
  t: TFunction,
  analysis: NonNullable<TrailStep['ideas'][number]['analysis']>,
): string {
  return analysis.campaignName
    ? t('assistant.analytics.more.analysisOf', {
        lens: analysis.campaignName,
      })
    : t('assistant.analytics.more.workspaceAnalysis')
}

/**
 * Where the examples came from, a level a row (CON-479): each post with its
 * rate, then the idea it was made from, the analysis behind the idea, and
 * the asset with the passages the analysis cited. A post with nothing behind
 * it says so. Shown on the offer before the yes, and after it when nothing
 * was offered.
 */
export function TrailRows({ trail }: { trail: TrailStep[] }) {
  const { t } = useTranslation()
  return trail.map((step) => (
    <div
      key={step.postId}
      className="flex flex-col gap-1.5 border-t border-border py-2.5 text-sm"
    >
      <span className="flex items-baseline gap-3">
        <span className="min-w-0 flex-1 truncate text-foreground">
          {step.title || t('assistant.analytics.untitled')}
        </span>
        {step.rate !== undefined && (
          <span className={cn(FIGURE, 'shrink-0 text-secondary-foreground')}>
            {formatMeasure(t, 'engagement_rate', step.rate)}
          </span>
        )}
      </span>
      {step.noTrail ? (
        <span className="text-[12.5px] text-secondary-foreground">
          {t('assistant.analytics.more.ownWords')}
        </span>
      ) : (
        <>
          {step.ideas.map((idea) => (
            <Fragment key={idea.id}>
              <TrailLine
                depth={1}
                icon={<LightbulbIcon aria-hidden className="size-3.5" />}
              >
                {idea.title}
              </TrailLine>
              {idea.analysis && (
                <TrailLine
                  depth={2}
                  icon={<ChartBarIcon aria-hidden className="size-3.5" />}
                >
                  {analysisName(t, idea.analysis)}
                </TrailLine>
              )}
              {idea.asset && (
                <TrailLine
                  depth={idea.analysis ? 3 : 2}
                  icon={<AssetTypeBadge type={idea.asset.type} />}
                >
                  <Link
                    to="/assets/$assetId"
                    params={{ assetId: idea.asset.id }}
                    className="hover:underline"
                  >
                    {idea.passages.length > 0
                      ? t('assistant.analytics.more.assetAt', {
                          asset: idea.asset.title,
                          passages: formatList(idea.passages),
                        })
                      : idea.asset.title}
                  </Link>
                </TrailLine>
              )}
            </Fragment>
          ))}
          {step.assets
            .filter((a) => !step.ideas.some((i) => i.asset?.id === a.id))
            .map((asset) => (
              <TrailLine
                key={asset.id}
                depth={1}
                icon={<AssetTypeBadge type={asset.type} />}
              >
                <Link
                  to="/assets/$assetId"
                  params={{ assetId: asset.id }}
                  className="hover:underline"
                >
                  {asset.title}
                </Link>
              </TrailLine>
            ))}
        </>
      )}
    </div>
  ))
}

function TrailLine({
  depth,
  icon,
  children,
}: {
  depth: number
  icon: ReactNode
  children: ReactNode
}) {
  return (
    <span
      className="flex items-center gap-2 text-[12.5px] text-secondary-foreground"
      style={{ paddingLeft: `${depth * 16}px` }}
    >
      <span className="flex size-3.5 shrink-0 items-center justify-center">
        {icon}
      </span>
      <span className="min-w-0 truncate">{children}</span>
    </span>
  )
}

/**
 * "More like these": the trail — the offer showed it before the yes, and a
 * confirmed offer collapses to one line, so the result keeps it — then the ideas
 * it saved and one sources line for all of them. They are ideas, not posts —
 * nothing reached the calendar — and OPEN lands on just these on Ideas. A run
 * that saved none draws no DONE card.
 */
function MoreLikeTheseCard({ more }: { more: MoreLikeThese }) {
  const { t } = useTranslation()
  const said = more.ideas.flatMap((i) => (i.grounding ? [i.grounding] : []))
  const grounding: Grounding | undefined =
    said.length === 0
      ? undefined
      : {
          mode: said.some((g) => g.mode === 'grounded')
            ? 'grounded'
            : 'exploratory',
          sources: said.flatMap((g) => g.sources),
        }
  const search = more.filter ? searchFromViewQuery(more.filter) : undefined
  const open = more.campaignId ? (
    <Link
      to="/campaigns/$campaignId/ideas"
      params={{ campaignId: more.campaignId }}
      search={search as never}
      className={TEXT_ACTION_CLASS}
    >
      {t('assistant.analytics.more.open')}
    </Link>
  ) : (
    <Link to="/ideas" search={search as never} className={TEXT_ACTION_CLASS}>
      {t('assistant.analytics.more.open')}
    </Link>
  )
  const lonely = more.trail.length > 0 && more.trail.every((s) => s.noTrail)
  return (
    <div className="flex flex-col gap-5">
      {more.trail.length > 0 && (
        <ResultBlock
          status={t('assistant.analytics.more.trailWord')}
          title={
            lonely
              ? t('assistant.analytics.more.noTrail')
              : t('assistant.analytics.more.trail')
          }
        >
          <TrailRows trail={more.trail} />
        </ResultBlock>
      )}
      {more.ideas.length > 0 && (
        <ResultBlock
          status={t('assistant.analytics.more.doneWord')}
          title={t(
            'assistant.analytics.more.planned',
            counted(more.ideas.length),
          )}
          meta={t('assistant.analytics.more.onIdeas')}
          action={open}
        >
          {more.ideas.map((idea) => (
            <ResultRow key={idea.id} className="flex flex-col gap-0.5 text-sm">
              <span className="text-foreground">{idea.title}</span>
              {idea.angle && (
                <span className="text-[12.5px] text-secondary-foreground">
                  {idea.angle}
                </span>
              )}
            </ResultRow>
          ))}
          {grounding && <SourcesLine grounding={grounding} />}
        </ResultBlock>
      )}
    </div>
  )
}
