import type { Campaign } from '@/types/campaigns'

/**
 * A stored date's own day, as UTC midnight. The digits are read rather than
 * the instant, for `lib/postGoal`'s reason: `end_date` is the day at
 * `T00:00:00`, and parsing it in the browser's zone lands it on the day before
 * anywhere west of UTC.
 */
function dayOf(value: string | null): number | null {
  const match = value ? /^(\d{4})-(\d{2})-(\d{2})/.exec(value) : null
  if (!match) return null
  return Date.UTC(+match[1], +match[2] - 1, +match[3])
}

export type CampaignRow = {
  campaign: Campaign
  window: [number, number] | null
}

/**
 * Campaigns in the order they start, a campaign with no dates last rather
 * than left off — with each one's window, for the rows that print it.
 * One order for the Strategy hub's Campaigns card and the "Chosen by" line
 * on a voice's or an audience's card, which name the same campaigns a level
 * apart.
 */
export function campaignsByStart(campaigns: Campaign[]): CampaignRow[] {
  const rows: CampaignRow[] = campaigns.map((campaign) => {
    const start = dayOf(campaign.start_date)
    const end = dayOf(campaign.end_date)
    return {
      campaign,
      window:
        start !== null && end !== null && end >= start ? [start, end] : null,
    }
  })
  return rows.sort(
    (a, b) =>
      (a.window?.[0] ?? Infinity) - (b.window?.[0] ?? Infinity) ||
      (a.window?.[1] ?? 0) - (b.window?.[1] ?? 0),
  )
}
