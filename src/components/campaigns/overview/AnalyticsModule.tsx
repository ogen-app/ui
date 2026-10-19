import { useTranslation } from 'react-i18next'
import { StatusBadge } from '@/components/ui/status-badge.tsx'
import { Skeleton } from '@/components/ui/skeleton.tsx'
import { MetricTile } from '@/components/campaigns/analytics/MetricTile.tsx'
import { formatMeasure, measureCopy } from '@/components/analytics/format'
import {
  DEFAULT_OVERVIEW_WINDOW,
  useAnalyticsOverview,
  type AnalyticsOverviewResult,
} from '@/hooks/useAnalyticsOverview.ts'
import { useFeatureFlag } from '@/config/featureFlags.ts'
import { OverviewCard } from './OverviewCard.tsx'

/**
 * How the campaign is performing, on the Overview (CON-175).
 *
 * The counterpart to the Content module above it: Content is about posts as
 * work — what is drafted, scheduled, published — and this is about what those
 * posts did once they were out. That split is why the Overview's post
 * distribution moved off the Content card; totals belong on this side of the
 * line, and the Analytics page is where they lead.
 *
 * Four numbers and a link, deliberately: the card exists to say whether it is
 * worth opening the section, not to be the section. They are the server's
 * figures for this campaign over the Analytics page's default window
 * (CON-288) — the same answer the page opens on, so the two never disagree.
 * Followers are left off: the server counts them for the whole workspace
 * whatever the campaign, and on a card this small there is no room to say so.
 *
 * With `campaign-analytics` off there is no card at all. It used to hold its
 * place with a "coming soon" preview, which put a permanent apology in the
 * middle of a screen the user opens to find out what to do next — and the
 * flag's whole promise is that the app behaves exactly as it did before the
 * feature existed. Returning early also keeps the fetch unmounted, so nothing
 * is requested for a section that isn't there.
 */
export function AnalyticsModule({ campaignId }: { campaignId: string }) {
  const enabled = useFeatureFlag('campaign-analytics')
  if (!enabled) return null
  return <AnalyticsModuleLive campaignId={campaignId} />
}

function AnalyticsModuleLive({ campaignId }: { campaignId: string }) {
  const result = useAnalyticsOverview(DEFAULT_OVERVIEW_WINDOW, [], campaignId)
  return <AnalyticsModuleView campaignId={campaignId} {...result} />
}

/** The four, in the order the Analytics page's own card leads with. */
const SHOWN = ['reach', 'interactions', 'engagement_rate', 'published'] as const

/**
 * The card as pure rendering — every state it can be in is an argument, so the
 * states that need a particular deployment can be looked at without one.
 */
export function AnalyticsModuleView({
  campaignId,
  view,
  isPending,
  isError,
  isUnavailable,
  isEmpty,
}: AnalyticsOverviewResult & { campaignId: string }) {
  const { t } = useTranslation()

  // A workspace with no analytics database has no Analytics section to preview
  // — the card would be a permanent apology on a screen about this campaign.
  if (isUnavailable) return null

  if (isPending) {
    return (
      <OverviewCard section="analytics">
        <Skeleton className="h-20 w-full" />
      </OverviewCard>
    )
  }

  const link = { target: 'analytics' as const, campaignId }

  // `no_data` and a window whose posts haven't reported are one state here:
  // either way there is nothing to total, and the page says which it is.
  if (isEmpty || view?.coverage.measured === 0) {
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
          {t('campaignOverview.analytics.nothingMeasuredBody')}
        </p>
      </OverviewCard>
    )
  }

  if (isError || !view) {
    return (
      <OverviewCard section="analytics">
        <p className="text-sm text-tertiary-foreground">
          {t('campaignOverview.analytics.error')}
        </p>
      </OverviewCard>
    )
  }

  const readings = SHOWN.flatMap((measure) =>
    view.readings.filter((r) => r.measure === measure),
  )

  return (
    <OverviewCard section="analytics" link={link}>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {readings.map((r) => (
          <MetricTile
            key={r.measure}
            value={formatMeasure(t, r.measure, r.value)}
            label={measureCopy(t, r.measure).label}
          />
        ))}
      </div>
      <p className="text-xs text-tertiary-foreground">
        {t('campaignOverview.analytics.window', { count: view.period.days })}
      </p>
    </OverviewCard>
  )
}
