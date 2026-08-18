import { useMemo } from 'react'

import { PlusIcon, XIcon } from '@phosphor-icons/react'
import { RailPanel } from '@/components/page-primitives/RailPanel'
import { AssetSection } from '../shared/AssetSection'
import type { Asset } from '@/types/content'
import type { Post } from '@/types/posts'
import { useAssets } from '@/hooks/useContent'
import { useCampaign } from '@/hooks/useCampaigns'
import { campaignAssets } from '@/lib/campaignSources'

type Props = {
  doc: Post
  changeDoc: (fn: (p: Post) => void) => void
  onClose?: () => void
}

/**
 * Which of the campaign's documents this post was written from.
 *
 * It used to offer the whole workspace bank in a third section, and adding
 * from it quietly attached the asset to the campaign as a side effect. Both
 * are gone (CON-210): a campaign shows what it holds and nothing else, and
 * documents get into a campaign on its own Content page.
 */
export function PostContentUsageForm({ doc, changeDoc, onClose }: Props) {
  const assetIds = doc.used_asset_ids
  const { data: assets, isPending: assetsPending } = useAssets()
  const { data: campaign, isLoading: campaignPending } = useCampaign(doc.campaign_id)
  // The campaign decides which assets exist here at all, so a list split
  // before it lands would move rows between the two sections.
  const loading = assetsPending || campaignPending

  const { selected, available } = useMemo(() => {
    const held = campaign ? campaignAssets(assets ?? [], campaign) : []
    const selectedSet = new Set(assetIds)
    const byId = new Map(held.map((a) => [a.id, a]))

    const selected: Asset[] = []
    for (const id of assetIds) {
      const a = byId.get(id)
      if (a) selected.push(a)
    }

    return {
      selected,
      available: held.filter((a) => !selectedSet.has(a.id)),
    }
  }, [assets, assetIds, campaign])

  const addAsset = (id: string) => {
    changeDoc((d) => {
      if (d.used_asset_ids.includes(id)) return
      d.used_asset_ids.push(id)
    })
  }

  const removeAsset = (id: string) => {
    changeDoc((d) => {
      const idx = d.used_asset_ids.indexOf(id)
      if (idx >= 0) d.used_asset_ids.splice(idx, 1)
    })
  }

  return (
    <RailPanel title="Content pieces" onClose={onClose}>
      <AssetSection
        title="SELECTED"
        assets={selected}
        emptyLabel="No documents used"
        actionIcon={XIcon}
        actionAriaLabel={(a) => `Remove ${a.title || 'Untitled'}`}
        onAction={(a) => removeAsset(a.id)}
        defaultOpen
        loading={loading}
      />
      <AssetSection
        title="IN THIS CAMPAIGN"
        assets={available}
        emptyLabel="Add documents on the campaign's Content page"
        actionIcon={PlusIcon}
        actionAriaLabel={(a) => `Add ${a.title || 'Untitled'}`}
        onAction={(a) => addAsset(a.id)}
        loading={loading}
      />
    </RailPanel>
  )
}
