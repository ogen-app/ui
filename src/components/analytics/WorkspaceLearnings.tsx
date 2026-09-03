import {
  CalendarBlankIcon,
  ClockIcon,
  TrendDownIcon,
  TrendUpIcon,
} from '@phosphor-icons/react'
import { Trans, useTranslation } from 'react-i18next'
import { cn } from '@/lib'
import { formatNumber } from '@/lib/intl'
import { Skeleton } from '@/components/ui/skeleton'
import { DecayCurve, SlotHeatmap } from './charts'
import { Picker } from './ComparisonBar'
import { Basis, NotYet, SectionCard } from './shell'
import { formatHours, shortWeekdays } from './format'
import {
  LEARNINGS_METRICS,
  metricLabel,
  type HeatmapView,
  type LifespanView,
  type PatternView,
} from '@/lib/analyticsLearningsView'
import type { AnalyticsLearningsResult } from '@/hooks/useAnalyticsLearnings'
import type { LearningsMetric } from '@/types/analytics'

/**
 * What we've learned — the workspace's standing lessons (CON-239).
 *
 * The card that closes the trilogy, and the only one the period picker does not
 * govern. "Your posts land on Thursday evenings" is a property of how this
 * workspace works, not of the last 28 days, and a section sitting silently
 * under a date control claims otherwise — so the card is marked `all-time` and
 * says so in its own header.
 *
 * Three sections from one call, and **each withdraws on its own**: a workspace
 * can know when it posts and not yet know how long a post lives, because the
 * heatmap needs measured posts and the curve needs *settled* ones — posts that
 * have stopped earning. So `insufficient_history` is checked per section and
 * the other two carry on, which is the shape the server sends and the reason
 * this card cannot have a single empty state.
 *
 * Nothing here is graded a second time. The server enforces its own minimum
 * support and withdraws below it, so what arrives is what it was willing to
 * stand behind — the same rule the performers board follows for `direction`.
 */
export function WorkspaceLearningsView({
  result,
  metric,
  onChangeMetric,
  everyPlatform = false,
}: {
  result: AnalyticsLearningsResult
  metric: LearningsMetric
  onChangeMetric: (metric: LearningsMetric) => void
  /** Whether a platform filter is on screen that this card is not counted under. */
  everyPlatform?: boolean
}) {
  const { t } = useTranslation()
  const { view, isPending, isError, isUnavailable, isEmpty } = result

  if (isPending) {
    return <Skeleton className="h-96 w-full max-w-content mx-auto" />
  }

  if (isUnavailable) {
    return (
      <Shell
        metric={metric}
        onChangeMetric={onChangeMetric}
        withPicker={false}
        everyPlatform={everyPlatform}
      >
        <NotYet title={t('analytics.learned.unavailableTitle')}>
          {t('analytics.learned.unavailableBody')}
        </NotYet>
      </Shell>
    )
  }

  // Above the error branch, like the other two cards: `no_data` is a successful
  // answer with no payload, and reporting it as a failure tells a workspace
  // that has simply never published that something is broken.
  if (isEmpty) {
    return (
      <Shell
        metric={metric}
        onChangeMetric={onChangeMetric}
        withPicker={false}
        everyPlatform={everyPlatform}
      >
        <NotYet title={t('analytics.learned.emptyTitle')}>
          {t('analytics.learned.emptyBody')}
        </NotYet>
      </Shell>
    )
  }

  if (isError || !view) {
    return (
      <Shell
        metric={metric}
        onChangeMetric={onChangeMetric}
        withPicker={false}
        everyPlatform={everyPlatform}
      >
        <NotYet title={t('analytics.learned.errorTitle')}>
          {t('analytics.learned.errorBody')}
        </NotYet>
      </Shell>
    )
  }

  return (
    <Shell
      metric={metric}
      onChangeMetric={onChangeMetric}
      withPicker
      qualifier={view.historySince ?? undefined}
      everyPlatform={everyPlatform}
    >
      <Section
        icon={CalendarBlankIcon}
        title={t('analytics.learned.whenPostsLand')}
      >
        {view.heatmap ? (
          <Slots heatmap={view.heatmap} />
        ) : (
          <NotYet title={t('analytics.learned.slotsNotYetTitle')}>
            {t('analytics.learned.slotsInsufficientBody')}
          </NotYet>
        )}
      </Section>

      <Section
        icon={ClockIcon}
        title={t('analytics.learned.howLongAPostLives')}
      >
        {view.lifespan ? (
          <Lifespan lifespan={view.lifespan} />
        ) : (
          <NotYet title={t('analytics.learned.lifespanNotYetTitle')}>
            {view.settledPosts === 0
              ? t('analytics.learned.lifespanNoneSettled')
              : t('analytics.learned.lifespanSomeSettled', {
                  count: view.settledPosts,
                })}
          </NotYet>
        )}
      </Section>

      {view.patterns ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <PatternColumn
            title={t('analytics.learned.whatWorks')}
            note={t('analytics.learned.againstMedian')}
            tone="positive"
            patterns={view.patterns.works}
            empty={t('analytics.learned.nothingSeparated')}
          />
          <PatternColumn
            title={t('analytics.learned.whatsFading')}
            // Not "against the 90 days before last", which was the first
            // attempt and reads as a window nobody asked about. `trend` is the
            // segment's own movement across the window — its referent is the
            // stretch before it, which "change over" says without naming two.
            note={t('analytics.learned.changeOver', {
              window: view.trendWindow,
            })}
            tone="negative"
            patterns={view.patterns.fading}
            empty={t('analytics.learned.nothingFallen')}
          />
        </div>
      ) : (
        <NotYet title={t('analytics.learned.noPatternsTitle')}>
          {t('analytics.learned.noPatternsBody')}
        </NotYet>
      )}

      {view.lastRefreshedAt && (
        <Basis>
          {t('analytics.learned.updated', { when: view.lastRefreshedAt })}
        </Basis>
      )}
    </Shell>
  )
}

/**
 * The card's frame, so every withdrawal keeps the heading it withdrew from.
 *
 * `scope="all-time"` is the load-bearing prop: it prints the line saying the
 * period picker above does not reach this card, which is the difference between
 * a standing lesson and a figure for the month.
 */
function Shell({
  metric,
  onChangeMetric,
  withPicker,
  qualifier,
  everyPlatform = false,
  children,
}: {
  metric: LearningsMetric
  onChangeMetric: (metric: LearningsMetric) => void
  withPicker: boolean
  qualifier?: string
  everyPlatform?: boolean
  children: React.ReactNode
}) {
  const { t } = useTranslation()
  return (
    <SectionCard
      title={t('analytics.learned.title')}
      scope="all-time"
      everyPlatform={everyPlatform}
      qualifier={qualifier}
      status={
        withPicker ? (
          <Picker
            label={t('analytics.learned.metric')}
            value={metricLabel(t, metric)}
            options={LEARNINGS_METRICS.map((id) => ({
              value: id,
              label: metricLabel(t, id),
            }))}
            onChange={(v) => onChangeMetric(v as LearningsMetric)}
          />
        ) : undefined
      }
    >
      {children}
    </SectionCard>
  )
}

function Section({
  icon: Icon,
  title,
  children,
}: {
  icon: typeof ClockIcon
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <Icon className="size-4 text-tertiary-foreground" aria-hidden />
        <h3 className="text-sm font-medium">{title}</h3>
      </div>
      {children}
    </div>
  )
}

/**
 * The slots this workspace publishes into.
 *
 * The named slot underneath is the part that can be acted on — a heatmap alone
 * makes the reader hunt for the darkest square and guess at the hour — and it
 * carries the number of posts behind it, which is what keeps a "best time"
 * resting on two posts from reading like a finding.
 */
function Slots({ heatmap }: { heatmap: HeatmapView }) {
  const { t, i18n } = useTranslation()
  const posts = t('analytics.learned.measuredPosts', {
    count: heatmap.measuredPosts,
  })
  const strongestPosts = heatmap.strongest
    ? t('analytics.units.posts', { count: heatmap.strongest.postCount })
    : ''

  return (
    <>
      <SlotHeatmap
        grid={heatmap.grid}
        days={shortWeekdays(i18n.language)}
        label={
          heatmap.strongest
            ? t('analytics.learned.slotsAriaStrongest', {
                metric: heatmap.metric,
                slot: heatmap.strongest.label,
                posts: strongestPosts,
              })
            : t('analytics.learned.slotsAria', {
                metric: heatmap.metric,
                posts,
              })
        }
      />

      {heatmap.strongest && (
        <p className="text-sm">
          <Trans
            i18nKey="analytics.learned.strongestSlot"
            values={{ slot: heatmap.strongest.label, posts: strongestPosts }}
            components={[<strong key="0" className="font-medium" />]}
          />
        </p>
      )}

      {/*
        Three things, and the third is the one that matters most: the hours are
        the server's, in UTC, with no offset on the wire. A workspace three
        hours ahead reading "18:00" as its own evening would be rearranging its
        week around the wrong slot — and the offset can't be applied here,
        because an aggregate over a year of posts has no single date to apply
        it on.
      */}
      <Basis>
        {t('analytics.learned.slotsBasisUtc', {
          posts,
          metric: heatmap.metric,
        })}
      </Basis>
    </>
  )
}

/**
 * How a post matures, as a curve rather than a single half-life.
 *
 * "Half of it arrives in 19 hours" is a fact people nod at and cannot use. The
 * shape is the usable part: the distance between the first mark and the last is
 * the window in which a boost, a re-share or answering the comments still moves
 * where the post ends up. It is also the rule behind marking a young post's
 * figures as still counting on the board above, so showing it here means that
 * behaviour is explained rather than merely enforced.
 */
function Lifespan({ lifespan }: { lifespan: LifespanView }) {
  const { t } = useTranslation()
  return (
    <>
      <p className="text-sm">
        <Trans
          i18nKey="analytics.learned.halfLife"
          values={{ span: lifespan.half }}
          components={[<strong key="0" className="font-medium" />]}
        />
      </p>

      {lifespan.curve.length > 0 && (
        <>
          <DecayCurve
            points={lifespan.curve}
            milestones={lifespan.milestones}
            height="md"
          />
          <div className="flex justify-between text-xs text-tertiary-foreground">
            <span>{t('analytics.charts.published')}</span>
            <span>
              {t('analytics.charts.later', { span: lifespan.horizon })}
            </span>
          </div>
        </>
      )}

      <ul className="flex flex-wrap gap-x-5 gap-y-1">
        {lifespan.milestones.map((m) => (
          <li key={m.share} className="flex items-baseline gap-1.5 text-xs">
            <span className="font-medium tabular-nums">
              {t('analytics.units.percent', {
                value: formatNumber(Math.round(m.share * 100)),
              })}
            </span>
            <span className="text-secondary-foreground">
              {t('analytics.learned.milestone', {
                span: formatHours(t, m.hour),
              })}
            </span>
          </li>
        ))}
      </ul>

      <Basis>
        {t('analytics.learned.lifespanBasisWorkspace', {
          count: lifespan.settledPosts,
        })}
      </Basis>
    </>
  )
}

function PatternColumn({
  title,
  note,
  tone,
  patterns,
  empty,
}: {
  title: string
  /** What the figures are measured against — said once, not on every card. */
  note: string
  tone: 'positive' | 'negative'
  patterns: PatternView[]
  empty: string
}) {
  const { t } = useTranslation()
  const Icon = tone === 'positive' ? TrendUpIcon : TrendDownIcon

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-col gap-0.5">
        <div className="flex items-center gap-2">
          <Icon
            className={cn(
              'size-4',
              tone === 'positive' ? 'text-positive' : 'text-negative',
            )}
            aria-hidden
          />
          <h3 className="text-sm font-medium">{title}</h3>
        </div>
        <p className="text-xs text-tertiary-foreground">{note}</p>
      </div>

      {patterns.length === 0 ? (
        <p className="text-xs text-secondary-foreground">{empty}</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {patterns.map((pattern) => (
            <li key={pattern.id} className="flex flex-col gap-0.5">
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-sm">{pattern.headline}</span>
                {/* The one mark on the card, and it is a delta — which is where
                    the shell's contract allows a colour. The prose beside it
                    narrates the same number; this is the version you can scan a
                    column of. */}
                {pattern.figure && (
                  <span
                    className={cn(
                      'shrink-0 text-sm font-medium tabular-nums',
                      tone === 'positive' ? 'text-positive' : 'text-negative',
                    )}
                  >
                    {pattern.figure}
                  </span>
                )}
              </div>
              <span className="text-xs text-secondary-foreground">
                {pattern.detail}
              </span>
              {/* The metric is on the card rather than in the header because
                  the miner picks it per segment — a card can be about saves on
                  a board set to reach. */}
              <Basis>
                {t('analytics.learned.patternBasis', {
                  support: pattern.support,
                  metric: pattern.metric,
                })}
              </Basis>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
