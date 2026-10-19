import { ChartLineUpIcon } from '@phosphor-icons/react'
import { StatusBadge } from '@/components/ui/status-badge.tsx'
import { OverviewCard } from '@/components/campaigns/overview/OverviewCard.tsx'
import { AnalyticsDashboard } from '@/components/analytics/AnalyticsDashboard'
import { useFeatureFlag } from '@/config/featureFlags.ts'

/**
 * The campaign's Analytics section (CON-175): the workspace dashboard, narrowed
 * to this campaign by the server (CON-288). What that narrowing does and does
 * not reach is `AnalyticsDashboard`'s to explain.
 *
 * `campaign-analytics` chooses between the numbers and a preview of them: with
 * the flag off the section is still here and still says what it will hold, it
 * just doesn't claim to measure anything. Splitting that decision across two
 * components rather than branching inside one keeps the fetch unmounted while
 * the section is a preview — an off flag makes no request.
 */
export function CampaignAnalyticsPanel({ campaignId }: { campaignId: string }) {
  const enabled = useFeatureFlag('campaign-analytics')
  if (!enabled) return <ComingSoon />
  return <AnalyticsDashboard campaignId={campaignId} />
}

/** What the section holds, named before it measures anything. */
const PLANNED: [string, string][] = [
  ['What happened', 'Reach, interactions and engagement across the campaign'],
  [
    'Performers and outliers',
    'Which of these posts carried the period, and which fell behind',
  ],
  ["What we've learned", 'When posts land and how long they keep earning'],
]

/**
 * The section before it measures anything: what it is for, and what it will
 * hold. No numbers, not even zeroes — a placeholder that invents figures is
 * worse than an empty page, because the reader can't tell which is which.
 */
function ComingSoon() {
  return (
    <div className="flex flex-col gap-3 pb-10">
      <OverviewCard
        title="Analytics"
        status={<StatusBadge tone="neutral" label="Coming soon" />}
      >
        <p className="text-sm text-secondary-foreground">
          How this campaign's posts did once they went out. This view isn't
          switched on yet — the rest of the campaign is unaffected, and the
          numbers will fill in here on their own once it is.
        </p>
        <ul className="flex flex-col gap-2">
          {PLANNED.map(([title, detail]) => (
            <li key={title} className="flex items-start gap-3">
              <ChartLineUpIcon
                className="mt-0.5 size-4 shrink-0 text-quaternary-foreground"
                aria-hidden
              />
              <div className="flex min-w-0 flex-col">
                <span className="text-sm text-secondary-foreground">
                  {title}
                </span>
                <span className="text-xs text-tertiary-foreground">
                  {detail}
                </span>
              </div>
            </li>
          ))}
        </ul>
      </OverviewCard>
    </div>
  )
}
