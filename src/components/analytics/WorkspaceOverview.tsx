import { Skeleton } from '@/components/ui/skeleton'
import { NowSection } from './ComparisonSections'
import { NotYet, SectionCard } from './shell'
import type { AnalyticsOverviewResult } from '@/hooks/useAnalyticsOverview'

/**
 * The workspace's "what happened over the last N days" card (CON-237).
 *
 * One card, from one call. `NowSection` is the same component the campaign
 * surface uses — the five figures, the chart behind whichever is selected, the
 * deterministic callouts and the freshness note — and it is reused rather than
 * reimplemented because the endpoint answers exactly the question that card was
 * designed around. What it is fed comes from `lib/analyticsOverviewView`, which
 * is where the wire and the view disagree and where those disagreements are
 * argued out.
 *
 * Two things the card will not show today, both because the server has no
 * source for them rather than because the design dropped them:
 *
 * - **The usual range.** Every card comes back `insufficient_history` and no
 *   band, so there are no "Above usual" verdict lines and no cone behind the
 *   chart. The delta against the previous stretch is the whole comparison for
 *   now, and the card's legend says only what it is actually drawing.
 * - **The publication rail.** The payload counts posts without naming them, so
 *   the marks that would say *because two posts went out on the 5th* have
 *   nothing to be built from.
 *
 * Split from the fetch so every state is an argument — the states that need a
 * particular deployment (no analytics database, a workspace that has published
 * nothing) are otherwise not reachable to look at.
 */
export function WorkspaceOverviewView({
  view,
  isPending,
  isError,
  isUnavailable,
  isEmpty,
}: AnalyticsOverviewResult) {
  if (isPending) {
    return <Skeleton className="h-96 w-full max-w-content mx-auto" />
  }

  if (isUnavailable) {
    return (
      <SectionCard title="What happened">
        <NotYet title="Nothing is being measured for this workspace">
          Analytics isn't switched on here yet. Everything else — planning,
          generating, scheduling, publishing — works exactly as it does now, and
          the moment measurement is connected this fills in from the posts you
          have already sent.
        </NotYet>
      </SectionCard>
    )
  }

  // Before the error branch, not after it. `no_data` is a *successful* answer
  // that carries no payload, so it reaches the `!view` fallback below and would
  // be reported as a failed request — telling a new workspace something is
  // broken when the truth is that it hasn't published yet.
  if (isEmpty) {
    return (
      <SectionCard title="What happened">
        <NotYet title="Nothing measured yet">
          Once this workspace starts publishing, what each post earns shows up
          here — reach, interactions, and how that compares with the stretch
          before.
        </NotYet>
      </SectionCard>
    )
  }

  // `!view` and not just `isError`: a query that resolves without a payload —
  // or one React Query has parked mid-retry — must explain itself rather than
  // leave the skeleton spinning, which is indistinguishable from a hung app.
  if (isError || !view) {
    return (
      <SectionCard title="What happened">
        <NotYet title="Couldn't load analytics">
          The workspace itself is unaffected — nothing here changes what is
          scheduled or published. Try again in a moment.
        </NotYet>
      </SectionCard>
    )
  }

  return <NowSection view={view} />
}
