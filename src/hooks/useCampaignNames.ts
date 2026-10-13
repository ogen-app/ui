import { useMemo } from 'react'
import { useCampaigns } from '@/hooks/useCampaigns'

/**
 * Every live campaign's name by id — what turns the ids an asset row and the
 * Campaign facet carry (CON-374) back into words. Archived campaigns are in
 * neither, as they are not in the campaign list, so the active list is enough.
 *
 * `ready` is that list having arrived: until then a row's Campaign cell stays
 * blank rather than claiming "in no campaign" for a frame.
 */
export function useCampaignNames() {
  const active = useCampaigns()
  const names = useMemo(
    () => new Map((active.data ?? []).map((c) => [c.id, c.name])),
    [active.data],
  )
  return { names, ready: !!active.data }
}
