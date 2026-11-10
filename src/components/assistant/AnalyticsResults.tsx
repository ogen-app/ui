import { Fragment, type ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'
import {
  formatCount,
  formatMeasure,
  measureCopy,
  shortWeekdays,
} from '@/components/analytics/format'
import { SlotHeatmap, Sparkline } from '@/components/analytics/charts'
import type { MeasureId } from '@/components/analytics/types'
import { usePlatformCatalog } from '@/hooks/usePlatforms'
import { counted, formatList, formatNumber } from '@/lib/intl'
import { cn } from '@/lib/styles'
import { periodLabel, windowDay as day } from '@/lib/analyticsCitation'
import type {
  AnalyticsApplied,
  AnalyticsRead,
  AnalyticsResults as Results,
  BestTimeSlot,
  DecayBucket,
  FollowerAccount,
  FrequencyRow,
  MoreLikeThese,
  PeriodComparison,
  PostsList,
} from '@/types/assistant'
import type {
  AnalyticsOverview,
  PerformerRow,
  PerformersBoard,
} from '@/types/analytics'
import { ResultBlock, ResultRow, SourcesLine } from './blocks'

/**
 * What the analytics pack read or wrote this turn (CON-463), one card each.
 * Every figure card ends on the filters the read actually applied — period,
 * platforms, campaign, in that order, with "every platform" and "the whole
 * workspace" spelled out — so a default the server picked is never mistaken
 * for what is on screen. The lessons and one post's figures stay with the
 * model's words, and are cited alone.
 */
export function AnalyticsResults({ results: r }: { results: Results }) {
  const { t } = useTranslation()
  const cite = useCitation()
  const entries: [string, ReactNode][] = [
    ['compare', r.compare && <CompareCard compare={r.compare} cite={cite} />],
    [
      'overview',
      r.overview && (
        <ReadCard
          read={r.overview}
          status={t('assistant.analytics.overview.word')}
          cite={cite}
          render={(d) => <OverviewRows overview={d} />}
          title={(d, a) =>
            a.campaign?.name ||
            (d.cards.length > 0
              ? t('assistant.analytics.overview.workspace')
              : t('assistant.analytics.overview.empty'))
          }
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
          note={t('assistant.analytics.note.publisher')}
          title={(d) => bestTimesTitle(t, d)}
          render={(d) => <BestTimesRows slots={d} />}
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
          note={t('assistant.analytics.note.publisher')}
          title={(d) => decayTitle(t, d)}
          render={(d) => <DecayRows buckets={d} />}
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
          note={t('assistant.analytics.note.publisher')}
          title={(d) => frequencyTitle(t, d)}
          render={(d) => <FrequencyRows rows={d} />}
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
          note={t('assistant.analytics.note.followers')}
          title={(d) =>
            formatNumber(d.reduce((sum, a) => sum + a.followers, 0))
          }
          meta={(d) =>
            growth(
              t,
              d.reduce((sum, a) => sum + a.growth, 0),
            )
          }
          render={(d) => <FollowerRows accounts={d} />}
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
          note={t('assistant.analytics.note.posts')}
          title={(d) => t('assistant.analytics.posts.title', counted(d.total))}
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
          line={cite(r.lessons.applied, t('assistant.analytics.note.lessons'))}
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

type Cite = (applied: AnalyticsApplied, note?: string) => string

/**
 * The filters a read applied, in words: period · platforms · campaign, and
 * what it can't be narrowed by in place of what it ignored.
 */
function useCitation(): Cite {
  const { t } = useTranslation()
  const { resolve } = usePlatformCatalog()
  return (a, note) => {
    const parts: string[] = []
    if (!note) {
      if (a.from && a.to) parts.push(periodLabel(t, a.from, a.to))
      else if (a.from)
        parts.push(t('assistant.analytics.cite.since', { day: day(a.from) }))
    }
    parts.push(
      a.platforms.length > 0
        ? formatList(a.platforms.map((s) => resolve(s)?.name ?? s))
        : t('assistant.analytics.cite.allPlatforms'),
    )
    if (note) parts.push(note)
    else parts.push(a.campaign?.name || t('assistant.analytics.cite.workspace'))
    return parts.join(' · ')
  }
}

function growth(t: TFunction, n: number): string {
  return t('assistant.analytics.followers.growth', {
    value: `${n > 0 ? '+' : n < 0 ? '−' : ''}${formatNumber(Math.abs(n))}`,
  })
}

/** The card's last line: what it read over, where sources sit elsewhere. */
function CiteFooter({ line }: { line: string }) {
  return (
    <p className="border-t border-border pt-2.5 text-[12.5px] text-tertiary-foreground">
      {line}
    </p>
  )
}

/** A read the model words alone, cited on one line. */
function CitedLine({ what, line }: { what: string; line: string }) {
  return (
    <p className="text-[12.5px] text-tertiary-foreground">
      <span className="text-secondary-foreground">{what}</span> {line}
    </p>
  )
}

/**
 * One windowed read: its figures, or why there are none, then what it read
 * over. A read with nothing to show says so in the card's own place rather
 * than vanishing, because the model's words around it still cite it.
 */
function ReadCard<T>({
  read,
  status,
  title,
  meta,
  note,
  cite,
  render,
}: {
  read: AnalyticsRead<T>
  status: string
  title: (data: T, applied: AnalyticsApplied) => string
  meta?: (data: T) => string | undefined
  /** What the read can't be narrowed by, cited in place of the window. */
  note?: string
  cite: Cite
  render: (data: T) => ReactNode
}) {
  const { t } = useTranslation()
  const line = cite(read.applied, note)
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

function Figure({
  label,
  value,
  change,
}: {
  label: string
  value: string
  change?: { text: string; down: boolean }
}) {
  return (
    <ResultRow className="flex items-baseline gap-3 text-sm">
      <span className="min-w-0 flex-1 truncate text-secondary-foreground">
        {label}
      </span>
      <span className="font-medium tabular-nums text-foreground">{value}</span>
      {change && (
        <span
          className={cn(
            'w-14 shrink-0 text-right text-[12.5px] tabular-nums',
            change.down ? 'text-warning' : 'text-tertiary-foreground',
          )}
        >
          {change.text}
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
      <span className="shrink-0 tabular-nums text-tertiary-foreground">
        {p.against_typical !== null
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
        <p className="pt-3 pb-1 text-[10.5px] font-semibold uppercase tracking-[0.1em] text-tertiary-foreground">
          {t('assistant.analytics.topPosts.weakest')}
        </p>
      )}
      {worst.map(row)}
    </>
  )
}

/** The hour as the publisher counts it, in UTC, which the card says. */
function slotName(t: TFunction, s: BestTimeSlot, days: string[]): string {
  return t('assistant.analytics.bestTimes.slot', {
    day: days[s.day] ?? '',
    hour: String(s.hour).padStart(2, '0'),
  })
}

function bestTimesTitle(t: TFunction, slots: BestTimeSlot[]): string {
  const top = [...slots].sort((a, b) => b.engagement - a.engagement)[0]
  return top
    ? slotName(t, top, shortWeekdays())
    : t('assistant.analytics.bestTimes.none')
}

function BestTimesRows({ slots }: { slots: BestTimeSlot[] }) {
  const { t, i18n } = useTranslation()
  const days = shortWeekdays(i18n.language)
  const max = Math.max(...slots.map((s) => s.engagement), 0)
  const grid: ({ score: number; title: string } | null)[][] = Array.from(
    { length: 7 },
    () => Array.from({ length: 24 }, () => null),
  )
  for (const s of slots) {
    if (s.day < 0 || s.day > 6 || s.hour < 0 || s.hour > 23) continue
    grid[s.day][s.hour] = {
      score: max > 0 ? s.engagement / max : 0,
      title: slotName(t, s, days),
    }
  }
  const top = [...slots]
    .sort((a, b) => b.engagement - a.engagement)
    .slice(0, RANK_ROWS)
  if (slots.length === 0) return null
  return (
    <>
      <div className="py-2.5">
        <SlotHeatmap
          grid={grid}
          days={days}
          label={t('assistant.analytics.bestTimes.aria')}
        />
      </div>
      {top.map((s) => (
        <Figure
          key={`${s.day}-${s.hour}`}
          label={slotName(t, s, days)}
          value={formatCount(t, s.engagement)}
          change={{
            text: t('assistant.analytics.posts.count', counted(s.posts)),
            down: false,
          }}
        />
      ))}
    </>
  )
}

function decayTitle(t: TFunction, buckets: DecayBucket[]): string {
  const half = buckets.find((b) => b.pct >= 50)
  return half
    ? t('assistant.analytics.decay.half', { age: half.label })
    : t('assistant.analytics.decay.title')
}

function DecayRows({ buckets }: { buckets: DecayBucket[] }) {
  const { t } = useTranslation()
  return buckets.map((b) => (
    <ResultRow key={b.label} className="flex items-center gap-3 text-sm">
      <span className="w-16 shrink-0 text-secondary-foreground">{b.label}</span>
      <span className="h-1.5 min-w-0 flex-1 bg-secondary">
        <span
          className="block h-full bg-foreground"
          style={{ width: `${Math.min(100, Math.max(0, b.pct))}%` }}
        />
      </span>
      <span className="w-12 shrink-0 text-right tabular-nums text-foreground">
        {t('assistant.analytics.percent', {
          value: formatNumber(b.pct, { maximumFractionDigits: 0 }),
        })}
      </span>
    </ResultRow>
  ))
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

function frequencyTitle(t: TFunction, rows: FrequencyRow[]): string {
  const top = bestCadences(rows)[0]
  return top
    ? t('assistant.analytics.frequency.title', counted(top.perWeek))
    : t('assistant.analytics.frequency.none')
}

function FrequencyRows({ rows }: { rows: FrequencyRow[] }) {
  const { t } = useTranslation()
  const { resolve } = usePlatformCatalog()
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
      change={{
        text: t('assistant.analytics.frequency.weeks', counted(r.weeks)),
        down: false,
      }}
    />
  ))
}

function FollowerRows({ accounts }: { accounts: FollowerAccount[] }) {
  const { t } = useTranslation()
  const { resolve } = usePlatformCatalog()
  return accounts.map((a) => (
    <ResultRow key={a.id} className="flex items-center gap-3 text-sm">
      <span className="min-w-0 flex-1 truncate text-secondary-foreground">
        {a.username
          ? t('assistant.analytics.followers.account', {
              username: a.username,
              platform: resolve(a.platform)?.name ?? a.platform,
            })
          : (resolve(a.platform)?.name ?? a.platform)}
      </span>
      {a.series.length > 1 && (
        <Sparkline
          className="w-16 shrink-0"
          points={a.series.map((value, i) => ({ date: String(i), value }))}
          direction="neutral"
        />
      )}
      <span className="font-medium tabular-nums text-foreground">
        {formatNumber(a.followers)}
      </span>
      <span
        className={cn(
          'w-14 shrink-0 text-right text-[12.5px] tabular-nums',
          a.growth < 0 ? 'text-warning' : 'text-tertiary-foreground',
        )}
      >
        {`${a.growth > 0 ? '+' : a.growth < 0 ? '−' : ''}${formatNumber(Math.abs(a.growth))}`}
      </span>
    </ResultRow>
  ))
}

function PostRows({ list }: { list: PostsList }) {
  const { t } = useTranslation()
  return list.items.map((p) => (
    <ResultRow key={p.postId} className="flex items-baseline gap-3 text-sm">
      <span className="min-w-0 flex-1 truncate">
        <span className="text-foreground">
          {p.title || t('assistant.analytics.untitled')}
        </span>
        <span className="ml-2 text-[12.5px] text-tertiary-foreground">
          {[p.platform, p.publishedAt ? day(p.publishedAt) : '']
            .filter(Boolean)
            .join(' · ')}
        </span>
      </span>
      <span className="shrink-0 tabular-nums text-tertiary-foreground">
        {t('assistant.analytics.posts.figures', {
          reach: formatCount(t, p.reach),
          rate: formatMeasure(t, 'engagement_rate', p.rate),
        })}
      </span>
    </ResultRow>
  ))
}

/**
 * Two periods side by side, with the change the server worked out. A metric
 * that fell is amber even when the rest rose — that is the one worth asking
 * about.
 */
function CompareCard({
  compare,
  cite,
}: {
  compare: PeriodComparison
  cite: Cite
}) {
  const { t } = useTranslation()
  const name = (a: AnalyticsApplied) =>
    a.from && a.to ? periodLabel(t, a.from, a.to) : ''
  const first = name(compare.first)
  const second = name(compare.second)
  // Both periods share one scope: the window's dates are the columns, so the
  // footer names only the platforms and the campaign.
  const scope = cite({ ...compare.first, from: undefined, to: undefined })
  const title = t('assistant.analytics.compare.title', { first, second })
  if (compare.unavailable || compare.metrics.length === 0) {
    return (
      <ResultBlock
        status={t('assistant.analytics.compare.word')}
        tone="warning"
        title={unavailableTitle(t, compare.unavailable)}
        meta={title}
      >
        <CiteFooter line={scope} />
      </ResultBlock>
    )
  }
  return (
    <ResultBlock status={t('assistant.analytics.compare.word')} title={title}>
      <div className="flex gap-3 pb-1.5 text-[10.5px] font-semibold uppercase tracking-[0.1em] text-tertiary-foreground">
        <span className="min-w-0 flex-1" />
        <span className="w-16 shrink-0 text-right">{first}</span>
        <span className="w-16 shrink-0 text-right">{second}</span>
        <span className="w-14 shrink-0 text-right">
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
            <span className="min-w-0 flex-1 truncate text-secondary-foreground">
              {measure ? measureCopy(t, measure).label : m.label}
            </span>
            <span className="w-16 shrink-0 text-right tabular-nums text-tertiary-foreground">
              {value(m.first)}
            </span>
            <span className="w-16 shrink-0 text-right font-medium tabular-nums text-foreground">
              {value(m.second)}
            </span>
            <span
              className={cn(
                'w-14 shrink-0 text-right text-[12.5px] tabular-nums',
                m.change < 0 ? 'text-warning' : 'text-tertiary-foreground',
              )}
            >
              {m.changePct !== null
                ? signedPct(t, m.changePct)
                : t('assistant.analytics.compare.new')}
            </span>
          </ResultRow>
        )
      })}
      <CiteFooter line={scope} />
    </ResultBlock>
  )
}

/**
 * "More like these": where the examples came from, then the ideas it saved.
 * The trail comes first so the ideas make sense; an example with nothing
 * recorded says so, and its ideas cite the post itself. They are ideas, not
 * posts — nothing reached the calendar.
 */
function MoreLikeTheseCard({ more }: { more: MoreLikeThese }) {
  const { t } = useTranslation()
  // The server labels each source by its kind ("Asset: …"); the line names
  // them, as every other sources line does.
  const sources = [
    ...new Set(
      more.ideas.flatMap((i) =>
        i.sources.map((s) => s.replace(/^(Post|Asset|Idea): /, '')),
      ),
    ),
  ]
  const open = more.campaignId ? (
    <Link
      to="/campaigns/$campaignId/ideas"
      params={{ campaignId: more.campaignId }}
      className="text-xs font-medium tracking-[0.03em] text-secondary-foreground hover:text-foreground"
    >
      {t('assistant.analytics.more.open')}
    </Link>
  ) : (
    <Link
      to="/ideas"
      className="text-xs font-medium tracking-[0.03em] text-secondary-foreground hover:text-foreground"
    >
      {t('assistant.analytics.more.open')}
    </Link>
  )
  const lonely = more.trail.length > 0 && more.trail.every((s) => s.noTrail)
  return (
    <div className="flex flex-col gap-5">
      <ResultBlock
        status={t('assistant.analytics.more.trailWord')}
        title={
          lonely
            ? t('assistant.analytics.more.noTrail')
            : t('assistant.analytics.more.trail', counted(more.trail.length))
        }
      >
        {more.trail.map((step) => (
          <ResultRow key={step.postId} className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-foreground">
              {step.title || t('assistant.analytics.untitled')}
            </span>
            {step.noTrail ? (
              <span className="text-[12.5px] text-tertiary-foreground">
                {t('assistant.analytics.more.ownWords')}
              </span>
            ) : (
              <>
                {step.ideas.map((idea) => (
                  <span
                    key={idea.id}
                    className="pl-4 text-[12.5px] text-secondary-foreground"
                  >
                    {idea.asset
                      ? t('assistant.analytics.more.ideaFrom', {
                          idea: idea.title,
                          asset: idea.asset.title,
                        })
                      : t('assistant.analytics.more.idea', {
                          idea: idea.title,
                        })}
                  </span>
                ))}
                {step.assets.map((asset) => (
                  <span
                    key={asset.id}
                    className="pl-4 text-[12.5px] text-secondary-foreground"
                  >
                    {t('assistant.analytics.more.used', { asset: asset.title })}
                  </span>
                ))}
              </>
            )}
          </ResultRow>
        ))}
        {more.grounding.length > 0 && (
          <ResultRow className="text-[12.5px] text-tertiary-foreground">
            {t('assistant.analytics.more.grounding', {
              assets: formatList(more.grounding.map((a) => a.title)),
            })}
          </ResultRow>
        )}
      </ResultBlock>
      <ResultBlock
        status={t('assistant.analytics.more.doneWord')}
        title={t(
          'assistant.analytics.more.planned',
          counted(more.ideas.length),
        )}
        meta={t('assistant.analytics.more.onIdeas')}
        action={more.ideas.length > 0 ? open : undefined}
      >
        {more.ideas.map((idea) => (
          <ResultRow key={idea.id} className="flex flex-col gap-0.5 text-sm">
            <span className="text-foreground">{idea.title}</span>
            {idea.angle && (
              <span className="text-[12.5px] text-tertiary-foreground">
                {idea.angle}
              </span>
            )}
          </ResultRow>
        ))}
      </ResultBlock>
      {more.ideas.length > 0 && (
        <SourcesLine
          grounding={{
            mode: sources.length > 0 ? 'grounded' : 'exploratory',
            sources: sources.map((title) => ({ id: title, title })),
          }}
        />
      )}
    </div>
  )
}
