import { WorkspaceOverviewView } from '@/components/analytics/WorkspaceOverview'
import {
  DEFAULT_OVERVIEW_WINDOW,
  useAnalyticsOverview,
} from '@/hooks/useAnalyticsOverview'

/**
 * The Overview's analytics card: the analytics page's own overview card, the
 * same read narrowed to this campaign over its default window — so the
 * figures on the campaign's front page are the ones its Analytics section
 * opens on, and every state (not set up, nothing yet, failed) reads the same.
 */
export function CampaignAnalytics({ campaignId }: { campaignId: string }) {
  const overview = useAnalyticsOverview(
    { window: DEFAULT_OVERVIEW_WINDOW },
    [],
    campaignId,
  )
  return <WorkspaceOverviewView {...overview} />
}
