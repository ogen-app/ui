import { useDismissedFindings } from '@/hooks/useCampaignProblems'

/**
 * Whether a finding is ignored: the campaign's list once it is read, which
 * every turn shares and a reload brings back; until then, what this turn
 * ignored and what the check found already dismissed.
 */
export function useIsIgnored(
  campaignId: string | undefined,
  ignoredHere: string[],
  dismissedBefore: string[],
): (key: string) => boolean {
  const list = useDismissedFindings(campaignId).data
  return (key: string) =>
    list
      ? list.includes(key)
      : ignoredHere.includes(key) || dismissedBefore.includes(key)
}
