import { useQuery } from '@tanstack/react-query'
import { getCampaignProblems } from '@/services/api/campaignProblems'

/**
 * Under the campaign's own key, so every campaign write re-reads it, and an
 * assistant turn that touched posts does through `refreshTouched`.
 */
export const campaignProblemsKey = (campaignId: string) =>
  ['campaigns', campaignId, 'problems'] as const

/** The campaign's calendar problems, with their fixes (CON-462). */
export function useCampaignProblems(campaignId: string) {
  return useQuery({
    queryKey: campaignProblemsKey(campaignId),
    queryFn: () => getCampaignProblems(campaignId),
    // Problems are about the posts, which change on screens that don't know
    // this read exists, so the Overview re-reads them on every arrival.
    staleTime: 0,
  })
}
