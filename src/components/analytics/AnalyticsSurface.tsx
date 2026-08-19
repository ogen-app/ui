import { Skeleton } from '@/components/ui/skeleton'
import { NowSection } from './ComparisonSections'
import { PerformersSection } from './PerformersSection'
import { PlatformFilter } from './PlatformFilter'
import { QualitySection } from './QualitySection'
import { NotYet, SectionCard } from './shell'
import type { AnalyticsScope, AnalyticsSurfaceState, Period } from './types'

/**
 * The campaign analytics surface: the cards that are actually built, in the
 * order the question arrives.
 *
 * **What happened → which posts carried it and which dragged → was the score we
 * gave them worth anything.** Three cards, each reviewable on its own in
 * `/design/analytics/widgets`. The order runs from most-asked to least, so an
 * operator who opens this weekly reads the top and leaves.
 *
 * Only the first two are under the period lens. Quality against results sits
 * outside it and says so on itself: whether an element of the score predicts
 * anything is a property of this campaign's content rather than of the last 28
 * days, and the sample settles it — three bands need more posts than a
 * four-week window holds.
 *
 * Deliberately shorter than the composition this started as. Outcomes, Side by
 * side, What we've learned and What's next were designed alongside these and are
 * out of scope for now — they are parked on the harness under "Not in scope"
 * rather than half-rendered here, because a card on a real surface is a promise
 * that the number in it is being maintained. The sections themselves still
 * compile and still have their fixtures; bringing one back is adding a line
 * here.
 *
 * With Side by side out, the axis switch goes with it: a two-way control with
 * one destination is a control that only reports the state it is already in. The
 * period lens stays — the two cards it governs are the two most read — but it
 * has moved into the platform bar rather than holding a row of its own. One line
 * above the cards now carries the whole scope: these platforms, this window, and
 * a card that steps outside it says so in its own header.
 */
export function AnalyticsSurface({
  scope,
  state,
  period,
  periods,
  onPeriodChange,
  selectedPlatforms,
  onPlatformsChange,
}: {
  scope: AnalyticsScope
  state: AnalyticsSurfaceState
  period: Period
  periods: Period[]
  onPeriodChange: (period: Period) => void
  /** Platform ids every figure below is counted over. */
  selectedPlatforms: string[]
  onPlatformsChange: (selected: string[]) => void
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

  const { platforms, now, performers, quality } = state.data

  // One scope line, not two. The platforms decide what is in the numbers and
  // the period decides how far back they reach; nobody reads one without the
  // other, and on its own row the period looked like page furniture.
  const scopeBar = (
    <PlatformFilter
      platforms={platforms}
      selected={selectedPlatforms}
      onChange={onPlatformsChange}
      period={period}
      periods={periods}
      onPeriodChange={onPeriodChange}
    />
  )

  if (state.isCold) {
    return (
      <Wrapper>
        {/* The bar stays even with nothing to draw. It is a statement of what
            would be counted, and a scope line that appears only once figures
            arrive is one nobody knows they can change. */}
        {scopeBar}
        <SectionCard title="What happened" scope="lens">
          <NotYet title="Nothing measured yet">
            {now.coverage.published === 0
              ? 'Once this starts publishing, what each post earns shows up here — reach, interactions, and how that compares with what you normally do.'
              : `${now.coverage.published} ${now.coverage.published === 1 ? 'post has' : 'posts have'} gone out, and the platforms haven't reported on them yet. This usually takes a few hours.`}
          </NotYet>
        </SectionCard>
      </Wrapper>
    )
  }

  return (
    <Wrapper>
      {scopeBar}
      <NowSection view={now} />
      <PerformersSection view={performers} />
      <QualitySection view={quality} />
    </Wrapper>
  )
}

function Wrapper({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-col gap-3 pb-10">{children}</div>
}

function SurfaceSkeleton() {
  return (
    <Wrapper>
      {/* The scope bar's own height, so the cards don't jump up the page when
          the marks arrive. */}
      <Skeleton className="h-[4.5rem] w-full max-w-content mx-auto" />
      <Skeleton className="h-72 w-full max-w-content mx-auto" />
      <Skeleton className="h-56 w-full max-w-content mx-auto" />
      <Skeleton className="h-48 w-full max-w-content mx-auto" />
    </Wrapper>
  )
}
