import { useEffect } from 'react'
import { useLocation } from '@tanstack/react-router'
import { useCampaigns } from '@/hooks/useCampaigns'
import { whereOf, type Where } from '@/lib/campaignScope'
import { useCampaignScopeStore } from '@/stores/campaignScopeStore'

/**
 * Where the tab is, and which campaign the menu is filtered to.
 *
 * `scope` is the address's own answer when it has one, and the remembered
 * filter on a page that carries none (`lib/campaignScope`). A remembered id
 * counts only while it is one of the workspace's active campaigns.
 */
export function useCampaignScope(): {
  where: Where
  scope: string | null
  /** The workspace's campaign when it has exactly one (`placeLink`). */
  soleCampaignId: string | null
} {
  const pathname = useLocation({ select: (location) => location.pathname })
  const where = whereOf(pathname)

  const remembered = useCampaignScopeStore((state) => state.campaignId)
  const setRemembered = useCampaignScopeStore((state) => state.setCampaignId)
  const { data: campaigns } = useCampaigns()

  // Every address that names a scope is the latest choice, however it was
  // reached — the switcher, a card, a link in a notification, Back.
  useEffect(() => {
    if (where.scope !== undefined && where.scope !== remembered) {
      setRemembered(where.scope)
    }
  }, [where.scope, remembered, setRemembered])

  const soleCampaignId = campaigns?.length === 1 ? campaigns[0].id : null
  if (where.scope !== undefined) {
    return { where, scope: where.scope, soleCampaignId }
  }
  const valid = campaigns?.some((campaign) => campaign.id === remembered)
  return { where, scope: valid ? remembered : null, soleCampaignId }
}
