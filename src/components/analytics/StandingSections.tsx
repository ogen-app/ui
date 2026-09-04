import {
  CalendarBlankIcon,
  ClockIcon,
  TrendDownIcon,
  TrendUpIcon,
} from '@phosphor-icons/react'
import type { TFunction } from 'i18next'
import { Trans, useTranslation } from 'react-i18next'
import { cn } from '@/lib'
import { formatDate, formatNumber } from '@/lib/intl'
import { DecayCurve, Heatmap } from './charts'
import { Basis, NotYet, SectionCard } from './shell'
import { formatCount, formatHours, supports } from './format'
import type {
  NextView,
  Pacing,
  Pattern,
  PatternsView,
  ShelfLife,
  Urgency,
} from './types'

/* ------------------------------------------------------------- patterns -- */

/**
 * What we have learned, full stop.
 *
 * The section that makes "Performance" the wrong name for this screen. None of
 * it belongs to a date range: a shelf life of nineteen hours is a property of
 * the content, not of March, and putting it under a window control would imply
 * that changing the window changes the answer. It is marked `all-time` so the
 * lens above visibly does not reach it.
 *
 * Everything here is sample-gated. A best-time grid drawn from nine posts is
 * indistinguishable from one drawn from nine hundred, and someone will
 * rearrange their week around it.
 */
export function PatternsSection({ view }: { view: PatternsView }) {
  const { t, i18n } = useTranslation()
  const timingReady =
    view.bestTimes && supports(view.bestTimes.sample, 'timing')

  return (
    <SectionCard title={t('analytics.learned.title')} scope="all-time">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <CalendarBlankIcon
            className="size-4 text-tertiary-foreground"
            aria-hidden
          />
          <h3 className="text-sm font-medium">
            {t('analytics.learned.whenPostsLand')}
          </h3>
        </div>
        {timingReady && view.bestTimes ? (
          <>
            <Heatmap grid={view.bestTimes.grid} />
            {/*
              The conclusion the grid exists to support. A heatmap on its own
              makes the reader hunt for the darkest square and guess at the
              hour; naming the slot — with the number of posts behind it —
              is the part they can act on, and the part that keeps a "best
              time" resting on one post from reading like a finding.

              `<Trans>` rather than a bold span around an interpolation: the
              emphasis is inside the sentence, and a sentence split around a
              tag is a sentence no locale can reorder.
            */}
            {view.bestTimes.best && (
              <p className="text-sm">
                <Trans
                  i18nKey="analytics.learned.strongestSlot"
                  values={{
                    slot: slotLabel(
                      t,
                      i18n.language,
                      view.bestTimes.best.day,
                      view.bestTimes.best.hour,
                    ),
                    posts: t('analytics.units.posts', {
                      count: view.bestTimes.best.sample,
                    }),
                  }}
                  components={[<strong key="0" className="font-medium" />]}
                />
              </p>
            )}
            <Basis>
              {t('analytics.learned.slotsBasis', {
                posts: t('analytics.learned.measuredPosts', {
                  count: view.bestTimes.sample,
                }),
              })}
            </Basis>
          </>
        ) : (
          <NotYet title={t('analytics.learned.slotsNotYetTitle')}>
            {view.bestTimes
              ? t('analytics.learned.slotsNotYetBodyWithCount', {
                  count: view.bestTimes.sample,
                })
              : t('analytics.learned.slotsNotYetBody')}
          </NotYet>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <ClockIcon className="size-4 text-tertiary-foreground" aria-hidden />
          <h3 className="text-sm font-medium">
            {t('analytics.learned.howLongAPostLives')}
          </h3>
        </div>
        {view.shelfLife && supports(view.shelfLife.sample, 'pattern') ? (
          <MaturityCurve shelfLife={view.shelfLife} />
        ) : (
          <NotYet title={t('analytics.learned.lifespanNotYetTitle')}>
            {t('analytics.learned.lifespanNotYetBody')}
          </NotYet>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <PatternColumn
          title={t('analytics.learned.whatWorks')}
          tone="positive"
          patterns={view.winners}
          empty={t('analytics.learned.nothingSeparated')}
        />
        <PatternColumn
          title={t('analytics.learned.whatsFading')}
          tone="negative"
          patterns={view.fading}
          empty={t('analytics.learned.nothingFallen')}
        />
      </div>
    </SectionCard>
  )
}

/** `Thursday 18:00` — a slot named the way someone would say it out loud. */
function slotLabel(
  t: TFunction,
  locale: string,
  day: number,
  hour: number,
): string {
  return t('analytics.units.slot', {
    day: longWeekday(day, locale),
    hour: t('analytics.units.hourOfDay', {
      hour: String(hour).padStart(2, '0'),
    }),
  })
}

/** Monday-first, full names, from `Intl` — see `shortWeekdays`. */
function longWeekday(day: number, locale: string): string {
  return formatDate(
    new Date(Date.UTC(2024, 0, 1 + day)),
    { weekday: 'long', timeZone: 'UTC' },
    locale,
  )
}

/**
 * How a post matures, as a curve rather than a single half-life.
 *
 * "Half of it arrives in 19 hours" is a fact people nod at and cannot use. The
 * shape is the usable part: the distance between 50% and 95% is the window in
 * which a boost, a re-share or answering the comments still changes where the
 * post ends up, and after it nothing anyone does moves the number. It is also
 * the rule behind marking a young post's figures as still counting, so showing
 * it here means that behaviour is explained rather than merely enforced.
 */
function MaturityCurve({ shelfLife }: { shelfLife: ShelfLife }) {
  const { t } = useTranslation()
  const last = shelfLife.curve[shelfLife.curve.length - 1]
  const half = shelfLife.milestones.find((m) => m.share === 0.5)

  return (
    <>
      {half && (
        <p className="text-sm">
          <Trans
            i18nKey="analytics.learned.halfLife"
            values={{ span: formatHours(t, half.hour) }}
            components={[<strong key="0" className="font-medium" />]}
          />
        </p>
      )}

      <DecayCurve
        points={shelfLife.curve}
        milestones={shelfLife.milestones}
        height="md"
      />

      <div className="flex justify-between text-xs text-tertiary-foreground">
        <span>{t('analytics.charts.published')}</span>
        <span>
          {last &&
            t('analytics.charts.later', { span: formatHours(t, last.hour) })}
        </span>
      </div>

      <ul className="flex flex-wrap gap-x-5 gap-y-1">
        {shelfLife.milestones.map((m) => (
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
        {t('analytics.learned.lifespanBasis', { count: shelfLife.sample })}
      </Basis>
    </>
  )
}

function PatternColumn({
  title,
  tone,
  patterns,
  empty,
}: {
  title: string
  tone: 'positive' | 'negative'
  patterns: Pattern[]
  empty: string
}) {
  const { t } = useTranslation()
  const Icon = tone === 'positive' ? TrendUpIcon : TrendDownIcon
  return (
    <div className="flex flex-col gap-2">
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
      {patterns.length === 0 ? (
        <p className="text-xs text-secondary-foreground">{empty}</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {patterns.map((p) => (
            <li key={p.id} className="flex flex-col gap-0.5">
              <span className="text-sm">{p.title}</span>
              <span className="text-xs text-secondary-foreground">
                {p.detail}
              </span>
              {/* How far to trust it, in words rather than a coloured mark. The
                  dot that used to sit here graded the sample it was printed
                  beside, and a colour is a verdict — this is a note. */}
              <Basis>
                {p.confidence === 'low'
                  ? t('analytics.learned.patternTooFew', {
                      support: t('analytics.learned.patternSupport', {
                        count: p.sample,
                      }),
                    })
                  : t('analytics.learned.patternSupport', { count: p.sample })}
              </Basis>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

/* ----------------------------------------------------------------- next -- */

/**
 * Where this is heading, and what to do about it.
 *
 * Also outside the lens, for the opposite reason to Patterns: it is about a
 * period that hasn't happened. The action list is the only thing on any of
 * these surfaces that leads back out into the product — analytics that only
 * leads to more analytics is a dead end, so every row names the place the work
 * would be done.
 */
export function NextSection({ view }: { view: NextView }) {
  const { t } = useTranslation()
  return (
    <SectionCard title={t('analytics.next.title')} scope="ahead">
      {view.pacing && <PacingBlock pacing={view.pacing} />}

      {view.actions.length === 0 ? (
        <NotYet title={t('analytics.next.nothingTitle')}>
          {t('analytics.next.nothingBody')}
        </NotYet>
      ) : (
        <ul className="flex flex-col">
          {view.actions.map((a) => (
            <li
              key={a.id}
              className="flex items-start gap-3 border-b border-border py-3 last:border-0"
            >
              <UrgencyDot urgency={a.urgency} />
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="text-sm">{a.title}</span>
                <span className="text-xs text-secondary-foreground">
                  {a.detail}
                </span>
              </div>
              <button
                type="button"
                className="shrink-0 text-xs font-medium underline underline-offset-2"
              >
                {a.target}
              </button>
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  )
}

/**
 * Plan against reality.
 *
 * An evergreen campaign gets a rate and nothing else. Projecting a total for
 * it would mean inventing a finish line the user never set, and the number
 * would look exactly as authoritative as a real one.
 */
function PacingBlock({ pacing }: { pacing: Pacing }) {
  const { t } = useTranslation()
  const fraction =
    pacing.planned === 0 ? 0 : Math.min(1, pacing.published / pacing.planned)
  const behind = pacing.published < pacing.planned

  return (
    <div className="flex flex-col gap-2 rounded-md bg-secondary px-4 py-3">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <span className="text-sm font-medium">
          {t('analytics.next.pacing', {
            published: pacing.published,
            planned: pacing.planned,
            period: pacing.periodLabel,
          })}
        </span>
        <span
          className={cn('text-xs', behind ? 'text-warning' : 'text-positive')}
        >
          {behind ? t('analytics.next.behind') : t('analytics.next.onPlan')}
        </span>
      </div>

      <div className="h-1.5 w-full overflow-hidden rounded-full bg-quaternary">
        <div
          className={cn(
            'h-full rounded-full',
            behind ? 'bg-warning' : 'bg-positive',
          )}
          style={{ width: `${Math.max(2, fraction * 100)}%` }}
        />
      </div>

      {pacing.kind === 'bounded' && pacing.projected !== undefined ? (
        <Basis>
          {t(
            pacing.target === undefined
              ? 'analytics.next.projected'
              : 'analytics.next.projectedAgainstTarget',
            {
              date: pacing.endsOn,
              projected: formatCount(t, pacing.projected),
              target:
                pacing.target === undefined
                  ? undefined
                  : formatCount(t, pacing.target),
            },
          )}
        </Basis>
      ) : (
        <Basis>{t('analytics.next.evergreen')}</Basis>
      )}
    </div>
  )
}

function UrgencyDot({ urgency }: { urgency: Urgency }) {
  return (
    <span
      className={cn(
        'mt-1.5 size-1.5 shrink-0 rounded-full',
        urgency === 'now'
          ? 'bg-attention'
          : urgency === 'soon'
            ? 'bg-warning'
            : 'bg-quinary-foreground',
      )}
      aria-hidden
    />
  )
}
