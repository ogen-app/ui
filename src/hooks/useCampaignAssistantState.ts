import { useQuery } from '@tanstack/react-query'
import { getCampaignAssistantState } from '@/services/api/assistant'

/**
 * Under the campaign's own key, so every campaign write re-reads it, and so
 * does every campaign turn that completes (`assistantStore`).
 */
export const campaignAssistantStateKey = (campaignId: string) =>
  ['campaigns', campaignId, 'assistant-state'] as const

/**
 * The campaign as the assistant reads it (CON-483): the goal period, the
 * calendar's problems and the sources' readiness, with the starters that
 * lead with those numbers.
 */
export function useCampaignAssistantState(campaignId: string | undefined) {
  return useQuery({
    queryKey: campaignAssistantStateKey(campaignId ?? ''),
    queryFn: () => getCampaignAssistantState(campaignId ?? ''),
    enabled: !!campaignId,
  })
}
