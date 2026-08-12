import { Skeleton } from '@/components/ui/skeleton'
import { ComparisonBar, type ComparisonAxis } from './ComparisonBar'
import { NowSection, SideBySideSection } from './ComparisonSections'
import { OutcomesSection } from './OutcomesSection'
import { PerformersSection } from './PerformersSection'
import { NextSection, PatternsSection } from './StandingSections'
import { NotYet, SectionCard } from './shell'
import type {
  AnalyticsScope,
  AnalyticsSurfaceState,
  MeasureId,
  Period,
  SleeveDimension,
} from './types'

/**
 * The workspace and campaign surfaces are the same composition.
 *
 * They ask the same question of different amounts of data, so making them two
 * screens would mean maintaining two answers. The scope changes the title, the
 * sleeves that make sense to compare, and whether pacing has a finish line —
 * nothing structural.
 *
 * The order is the argument: **what happened → did it do anything → which
 * posts carried it and which dragged → where to spend the next hour → what we
 * know → what's next.**
 * It runs from the most
 * frequently asked to the least, so the operator who opens this weekly reads
 * the top and leaves, while the owner who opens it twice a year reads the
 * whole thing top to bottom — and that same order is what a monthly digest
 * would follow, so one layout defines both.
 *
 * Only the first three sections obey the period lens. The last two say so on
 * themselves.
 */
export function AnalyticsSurface({
  scope,
  state,
  axis,
  onAxisChange,
  period,
  periods,
  onPeriodChange,
  dimension,
  onDimensionChange,
  measure,
  onMeasureChange,
}: {
  scope: AnalyticsScope
  state: AnalyticsSurfaceState
  axis: ComparisonAxis
  onAxisChange: (axis: ComparisonAxis) => void
  period: Period
  periods: Period[]
  onPeriodChange: (period: Period) => void
  dimension: SleeveDimension
  onDimensionChange: (dimension: SleeveDimension) => void
  measure: MeasureId
  onMeasureChange: (measure: MeasureId) => void
}) {
  if (state.isPending) return <SurfaceSkeleton />

  if (state.isUnavailable) {
    return (
      <Wrapper>
        <SectionCard title="Analytics">
          <NotYet title="Nothing is being measured for this workspace">
            Analytics isn't switched on here yet. Everything else — planning,
            generating, scheduling, publishing — works exactly as it does now, and
            the moment measurement is connected these screens fill in from the
            posts you have already sent.
          </NotYet>
        </SectionCard>
      </Wrapper>
    )
  }

  if (state.isError || !state.data) {
    return (
      <Wrapper>
        <SectionCard title="Analytics">
          <NotYet title="Couldn't load analytics">
            {scope.kind === 'campaign' ? 'The campaign' : 'The workspace'} itself is
            unaffected — nothing here changes what is scheduled or published. Try
            again in a moment.
          </NotYet>
        </SectionCard>
      </Wrapper>
    )
  }

  const { now, outcomes, performers, sideBySide, patterns, next } = state.data

  // A cold surface still has a plan, and a plan is knowable on day one. So
  // "what's next" renders while everything retrospective is honestly absent —
  // the screen is useful before it has a single measured post, which is the
  // window in which people decide whether it was worth setting up.
  if (state.isCold) {
    return (
      <Wrapper>
        <SectionCard title="What happened" scope="lens">
          <NotYet title="Nothing measured yet">
            {now.coverage.published === 0
              ? 'Once this starts publishing, what each post earns shows up here — reach, interactions, and how that compares with what you normally do.'
              : `${now.coverage.published} ${now.coverage.published === 1 ? 'post has' : 'posts have'} gone out, and the platforms haven't reported on them yet. This usually takes a few hours.`}
          </NotYet>
        </SectionCard>
        <OutcomesSection view={outcomes} />
        <NextSection view={next} />
      </Wrapper>
    )
  }

  return (
    <Wrapper>
      <ComparisonBar
        axis={axis}
        onAxisChange={onAxisChange}
        period={period}
        periods={periods}
        onPeriodChange={onPeriodChange}
        dimension={dimension}
        onDimensionChange={onDimensionChange}
        measure={measure}
        onMeasureChange={onMeasureChange}
      />

      {axis === 'time' ? (
        <NowSection view={now} />
      ) : (
        <SideBySideSection view={sideBySide} />
      )}

      <OutcomesSection view={outcomes} />
      <PerformersSection view={performers} />
      <PatternsSection view={patterns} />
      <NextSection view={next} />
    </Wrapper>
  )
}

function Wrapper({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-col gap-3 pb-10">{children}</div>
}

function SurfaceSkeleton() {
  return (
    <Wrapper>
      <Skeleton className="h-9 w-full max-w-content mx-auto" />
      <Skeleton className="h-72 w-full max-w-content mx-auto" />
      <Skeleton className="h-40 w-full max-w-content mx-auto" />
      <Skeleton className="h-56 w-full max-w-content mx-auto" />
    </Wrapper>
  )
}
