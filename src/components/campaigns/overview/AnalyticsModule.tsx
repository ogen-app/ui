import { useTranslation } from 'react-i18next'
import { StatusBadge } from '@/components/ui/status-badge.tsx'
import { Skeleton } from '@/components/ui/skeleton.tsx'
import { MeasureTile } from '@/components/analytics/MeasureTile'
import { FigureGrid } from '@/components/analytics/shell'
import { formatDay, periodPhrase } from '@/components/analytics/format'
import {
  useAnalyticsOverview,
  type AnalyticsOverviewResult,
} from '@/hooks/useAnalyticsOverview'
import { OverviewCard } from './OverviewCard.tsx'

/**
 * How the campaign is performing, on the Overview (CON-175).
 *
 * The counterpart to the Content module above it: Content is about posts as
 * work — what is drafted, scheduled, published — and this is about what those
 * posts did once they were out. The figures are the Analytics tab's own first
 * row — the server's overview narrowed to this campaign (`campaign_id`,
 * CON-288) over the dashboard's default period — so the card and the page it
 * opens never disagree. Figures and a link, deliberately: the card exists to
 * say whether it is worth opening the section, not to be the section.
 */
export function AnalyticsModule({ campaignId }: { campaignId: string }) {
  const result = useAnalyticsOverview(undefined, [], campaignId)
  return <AnalyticsModuleView campaignId={campaignId} {...result} />
}

/** The card as pure rendering — every state is an argument. */
export function AnalyticsModuleView({
  campaignId,
  view,
  isPending,
  isError,
  isUnavailable,
  isEmpty,
}: AnalyticsOverviewResult & { campaignId: string }) {
  const { t } = useTranslation()
  // A workspace that measures nothing has nothing to preview — the card would
  // be a permanent apology on a screen about this campaign. The tab says why.
  if (isUnavailable) return null

  const link = { target: 'analytics' as const, campaignId }

  if (isPending) {
    return (
      <OverviewCard section="analytics">
        <Skeleton className="h-20 w-full" />
      </OverviewCard>
    )
  }

  if (isEmpty) {
    return (
      <OverviewCard
        section="analytics"
        status={
          <StatusBadge
            tone="neutral"
            label={t('campaignOverview.analytics.nothingMeasured')}
          />
        }
        link={link}
      >
        <p className="text-sm text-secondary-foreground">
          {t('campaignOverview.analytics.emptyBody')}
        </p>
      </OverviewCard>
    )
  }

  if (isError || !view) {
    return (
      <OverviewCard section="analytics" link={link}>
        <p className="text-sm text-tertiary-foreground">
          {t('campaignOverview.analytics.error')}
        </p>
      </OverviewCard>
    )
  }

  const anchor = view.comparedToDate ? formatDay(view.comparedToDate) : null

  return (
    <OverviewCard
      section="analytics"
      status={
        <span className="min-w-0 truncate text-sm text-tertiary-foreground">
          {periodPhrase(t, view.period)}
        </span>
      }
      link={link}
    >
      <FigureGrid>
        {view.readings.map((reading) => (
          <MeasureTile
            key={reading.measure}
            reading={reading}
            comparedTo={anchor}
          />
        ))}
      </FigureGrid>
    </OverviewCard>
  )
}
