import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib'
import { RankBar, TrendChart } from './charts'
import { InsightLine } from './ComparisonSections'
import { DeltaChip } from './MeasureTile'
import {
  Basis,
  FigureGrid,
  FigureTile,
  NotYet,
  SectionCard,
  Todos,
} from './shell'
import { accumulate, formatCount } from './format'
import type { Goal, GoalSignal, OutcomesView } from './types'

/**
 * Did any of this do anything?
 *
 * The one question an owner actually funds, and the one no engagement metric
 * answers. It sits directly under "what happened" rather than at the bottom,
 * because for the person who reads this screen twice a year it *is* the screen.
 *
 * Built on the same card flow as "What happened": the goals are the key
 * figures, the selected one gets the trend and the breakdown, then the finding,
 * then the to-dos, then the notes. Before this it was a stack of goal cards
 * each carrying its own bar, sparkline and contributor list — which made two
 * goals measured at different rungs look like two different kinds of object,
 * and left the reader asking why one had a progress bar and the other didn't.
 *
 * The section is built to be shippable before conversion tracking exists. A
 * goal carries the rung it is currently measured at, and the copy never claims
 * a rung above it: a goal watched through link clicks says "clicks through to
 * /book", never "bookings". An unmeasured goal is still worth rendering —
 * "you told us this is what you want, here is the closest thing we can see"
 * is a far better answer than an absent section, and it makes the upgrade
 * obvious instead of hypothetical.
 */
export function OutcomesSection({ view }: { view: OutcomesView }) {
  const { t } = useTranslation()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const goal = view.goals.find((g) => g.id === selectedId) ?? view.goals[0]

  if (!goal) {
    return (
      <SectionCard title={t('analytics.outcomes.title')} scope="lens">
        <NotYet title={t('analytics.outcomes.noGoalTitle')}>
          {t('analytics.outcomes.noGoalBody')}
        </NotYet>
        {view.upgrade && <UpgradeNote upgrade={view.upgrade} />}
      </SectionCard>
    )
  }

  const unmeasured = goal.signal === 'unmeasured' || goal.value === null
  const todos = [
    !unmeasured &&
      !goal.target && {
        id: 'target',
        // The goal's own label, unchanged. Lower-casing it to fit the sentence
        // is a rule that only holds in English.
        text: t('analytics.outcomes.noTarget', { goal: goal.label }),
        action: t('analytics.outcomes.setOne'),
      },
    view.upgrade && {
      id: 'upgrade',
      text: view.upgrade.label,
      action: t('analytics.outcomes.connectSource'),
    },
  ].filter((item): item is { id: string; text: string; action: string } =>
    Boolean(item),
  )

  return (
    <SectionCard
      title={t('analytics.outcomes.title')}
      scope="lens"
      status={<SignalBadge signal={view.bestAvailableSignal} />}
    >
      <FigureGrid>
        {view.goals.map((g) => (
          <GoalTile
            key={g.id}
            goal={g}
            selected={g.id === goal.id}
            onSelect={
              view.goals.length > 1 ? () => setSelectedId(g.id) : undefined
            }
          />
        ))}
      </FigureGrid>

      <GoalDetail goal={goal} />

      {goal.insight && <InsightLine insight={goal.insight} />}

      <Todos items={todos} />

      {/* Notes last. The upgrade's detail is an argument for doing the to-do
          above, not a finding — it belongs down here with the provenance. */}
      {view.basis && <Basis>{view.basis}</Basis>}
      {view.upgrade && <Basis>{view.upgrade.detail}</Basis>}
    </SectionCard>
  )
}

/** A goal as a key figure: what it is, where it stands, and at which rung. */
function GoalTile({
  goal,
  selected,
  onSelect,
}: {
  goal: Goal
  selected: boolean
  onSelect?: () => void
}) {
  const { t } = useTranslation()
  const unmeasured = goal.signal === 'unmeasured' || goal.value === null
  const d =
    goal.value !== null && goal.previous !== null && goal.previous !== 0
      ? {
          fraction: (goal.value - goal.previous) / Math.abs(goal.previous),
          direction:
            Math.abs((goal.value - goal.previous) / Math.abs(goal.previous)) <
            0.02
              ? ('flat' as const)
              : goal.value > goal.previous
                ? ('up' as const)
                : ('down' as const),
          good: goal.value >= goal.previous,
        }
      : null

  return (
    <FigureTile selected={selected} onSelect={onSelect}>
      <span className="text-xs text-secondary-foreground truncate">
        {goal.label}
      </span>

      {unmeasured ? (
        <span className="font-display text-3xl font-medium leading-none text-tertiary-foreground">
          {t('analytics.units.none')}
        </span>
      ) : (
        <span className="font-display text-3xl font-medium leading-none truncate">
          {formatCount(t, goal.value ?? 0)}
        </span>
      )}

      <div className="flex items-center gap-2">
        {d && <DeltaChip delta={d} />}
        {/* The rung travels with the number, even here. Two goals side by side
            can be watched through different signals, and the tile is where
            they get read against each other. */}
        <span className="text-xs text-tertiary-foreground truncate">
          {t(`analytics.outcomes.signalShort.${goal.signal}` as const)}
        </span>
      </div>
    </FigureTile>
  )
}

/** The selected goal, drawn out: how it is counted, its trend, and what drove it. */
function GoalDetail({ goal }: { goal: Goal }) {
  const { t } = useTranslation()
  const unmeasured = goal.signal === 'unmeasured' || goal.value === null

  if (unmeasured) {
    return (
      <NotYet
        title={t('analytics.outcomes.notCountedTitle', { goal: goal.label })}
      >
        {t('analytics.outcomes.notCountedBody')}
      </NotYet>
    )
  }

  const value = goal.value ?? 0
  const contributors = goal.topContributors ?? []
  const leader = contributors[0]?.value ?? 0

  return (
    <div className="mt-2 flex flex-col gap-2">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-sm font-medium">
          {t('analytics.outcomes.overThePeriod', { goal: goal.label })}
        </h3>
        <span className="text-xs text-tertiary-foreground">
          {/* The honesty line. Never omitted, never softened. */}
          {t(
            goal.destination
              ? 'analytics.outcomes.measuredByAt'
              : 'analytics.outcomes.measuredBy',
            {
              signal: t(
                `analytics.outcomes.signalNoun.${goal.signal}` as const,
              ),
              destination: goal.destination,
            },
          )}
        </span>
      </div>

      {goal.series.length > 1 && (
        <TrendChart
          series={accumulate(goal.series, value)}
          target={goal.target?.value}
          endLabel={t('analytics.charts.today')}
        />
      )}

      <Basis className="text-[13px] text-foreground">
        {goal.target
          ? t(
              goal.target.per === 'week'
                ? 'analytics.outcomes.towardsTargetWeek'
                : 'analytics.outcomes.towardsTargetMonth',
              {
                value: formatCount(t, value),
                target: formatCount(t, goal.target.value),
              },
            )
          : t('analytics.outcomes.soFar', { value: formatCount(t, value) })}
      </Basis>

      {contributors.length > 0 && (
        <div className="flex flex-col gap-1.5 pt-1">
          <h4 className="text-xs font-medium">
            {t('analytics.outcomes.mostlyFrom')}
          </h4>
          <ul className="flex flex-col gap-2">
            {contributors.map((c) => (
              <li key={c.label} className="flex flex-col gap-1">
                <div className="flex items-baseline justify-between gap-3 text-xs">
                  <span className="truncate text-secondary-foreground">
                    {c.label}
                  </span>
                  <span className="shrink-0 tabular-nums">
                    {formatCount(t, c.value)}
                  </span>
                </div>
                <RankBar fraction={leader === 0 ? 0 : c.value / leader} />
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

/**
 * How far we can currently see, named by its *source* rather than its jargon.
 *
 * "Visits tracked" was the earlier copy and it answered nothing: visits to
 * what, tracked by whom, and is that good? Naming the connection instead makes
 * the badge self-explaining and makes the missing rung obvious.
 */
function SignalBadge({ signal }: { signal: GoalSignal }) {
  const { t } = useTranslation()
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-secondary-foreground">
      <span
        className={cn(
          'size-1.5 rounded-full',
          signal === 'conversions'
            ? 'bg-positive'
            : signal === 'unmeasured'
              ? 'bg-quinary-foreground'
              : 'bg-warning',
        )}
        aria-hidden
      />
      {t(`analytics.outcomes.signalBadge.${signal}` as const)}
    </span>
  )
}

/** What the next rung would buy, stated as a gain rather than a lack. */
function UpgradeNote({
  upgrade,
}: {
  upgrade: { label: string; detail: string }
}) {
  return (
    <div className="flex flex-col gap-0.5 rounded-md border border-border px-3.5 py-2.5">
      <p className="text-sm">{upgrade.label}</p>
      <Basis>{upgrade.detail}</Basis>
    </div>
  )
}
