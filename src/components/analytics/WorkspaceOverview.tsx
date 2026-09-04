import { useTranslation } from 'react-i18next'
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
  everyPlatform = false,
}: AnalyticsOverviewResult & {
  /**
   * Whether a platform filter is on screen that this card is not counted under.
   * `GET /overview` takes no `platform`, so on the workspace page this is true
   * whenever the filter is offered at all — and the card says so rather than
   * letting a filtered page be read as filtered throughout.
   */
  everyPlatform?: boolean
}) {
  const { t } = useTranslation()

  if (isPending) {
    return <Skeleton className="h-96 w-full max-w-content mx-auto" />
  }

  if (isUnavailable) {
    return (
      <SectionCard title={t('analytics.now.title')}>
        <NotYet title={t('analytics.now.unavailableTitle')}>
          {t('analytics.now.unavailableBody')}
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
      <SectionCard title={t('analytics.now.title')}>
        <NotYet title={t('analytics.now.emptyTitle')}>
          {t('analytics.now.emptyBody')}
        </NotYet>
      </SectionCard>
    )
  }

  // `!view` and not just `isError`: a query that resolves without a payload —
  // or one React Query has parked mid-retry — must explain itself rather than
  // leave the skeleton spinning, which is indistinguishable from a hung app.
  if (isError || !view) {
    return (
      <SectionCard title={t('analytics.now.title')}>
        <NotYet title={t('analytics.now.errorTitle')}>
          {t('analytics.now.errorBody')}
        </NotYet>
      </SectionCard>
    )
  }

  return <NowSection view={view} everyPlatform={everyPlatform} />
}
