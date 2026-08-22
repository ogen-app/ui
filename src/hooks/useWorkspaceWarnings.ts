import { useMemo } from 'react'
import { useCampaigns, useCampaignSummaries } from '@/hooks/useCampaigns'
import { usePlatformViews } from '@/hooks/usePlatforms'
import { useFeatureFlag } from '@/config/featureFlags'
import { workspaceWarnings, type WorkspaceWarning } from '@/lib/workspaceWarnings'

/**
 * The workspace's warnings (CON-225), scored by `lib/workspaceWarnings`.
 *
 * Costs no request of its own: campaigns, the batched post summaries and the
 * platform list are all already in cache on an authenticated screen — the same
 * three the Campaigns list reads. Everything is settled together on purpose:
 * scoring a campaign against a half-arrived summaries map would show a "no
 * posts scheduled" warning to a campaign whose posts are still in flight.
 */
export function useWorkspaceWarnings(): {
  warnings: WorkspaceWarning[]
  isLoading: boolean
  isError: boolean
} {
  const enabled = useFeatureFlag('tasks')
  const campaignsQuery = useCampaigns()
  const summariesQuery = useCampaignSummaries()
  const platformViews = usePlatformViews()

  const settled = campaignsQuery.isSuccess && summariesQuery.isSuccess
  const dataUpdatedAt = Math.max(campaignsQuery.dataUpdatedAt, summariesQuery.dataUpdatedAt)

  const warnings = useMemo(
    () =>
      enabled && settled
        ? workspaceWarnings(
            campaignsQuery.data ?? [],
            summariesQuery.data ?? {},
            platformViews,
            // One clock per delivery of the data, as the feed does: several of
            // these rules are time-based, and a fresh `new Date()` per render
            // would rescore the whole workspace on every paint.
            new Date(dataUpdatedAt || Date.now()),
          )
        : [],
    [enabled, settled, dataUpdatedAt, campaignsQuery.data, summariesQuery.data, platformViews],
  )

  return {
    warnings,
    isLoading: enabled && (campaignsQuery.isLoading || summariesQuery.isLoading),
    isError: enabled && (campaignsQuery.isError || summariesQuery.isError),
  }
}
