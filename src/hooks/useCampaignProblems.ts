import { useQuery } from '@tanstack/react-query'
import {
  getCampaignProblems,
  listDismissedFindings,
} from '@/services/api/campaignProblems'

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

/**
 * The campaign's dismissed findings, by key (CON-478). Every finding in the
 * rail — the calendar's, the review's, any turn's — reads whether it is
 * ignored from here, so an ignore in one turn reaches the others and a
 * reloaded thread remembers it. IGNORE and RESTORE write it at once.
 */
export const dismissedFindingsKey = (campaignId: string) =>
  ['campaigns', campaignId, 'dismissedFindings'] as const

export function useDismissedFindings(campaignId: string | undefined) {
  return useQuery({
    queryKey: dismissedFindingsKey(campaignId ?? ''),
    queryFn: () => listDismissedFindings(campaignId ?? ''),
    enabled: !!campaignId,
  })
}
