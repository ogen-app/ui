import type { Campaign, UpdateCampaignPayload } from '@/types/campaigns'
import type { Asset, AssetStatus } from '@/types/content'

/**
 * What a campaign writes from (CON-210).
 *
 * A campaign owns a set of documents. There is no mode: the empty set means
 * the campaign writes from its brief alone, and any other set means the brief
 * plus those documents. The three-mode picker this replaces
 * (`campaign` / `all` / `selected`) is gone — nobody understood it in
 * interviews, and its middle mode meant "every asset in the workspace", which
 * has no referent once a campaign owns its own.
 *
 * The two campaign fields underneath are unchanged, because generation still
 * reads them (CON-118, `content_plan/assets.go`):
 *
 * - `use_assets: false` — the campaign's own brief only.
 * - `use_assets: true`, `asset_ids: [...]` — the brief plus exactly those.
 *
 * `use_assets: true` with an *empty* list is the one combination the front end
 * no longer writes: server-side it still means every asset in the workspace,
 * which is the model being retired. `seedsWholeBank` below finds campaigns
 * left in that state so they can be pinned to the set they were generating
 * from before it changes meaning under them.
 */
export type MembershipFields = Required<
  Pick<UpdateCampaignPayload, 'use_assets' | 'asset_ids'>
>

/**
 * The two campaign fields for a membership set.
 *
 * An empty set writes `use_assets: false` rather than an empty list, because
 * an empty list is how the server spells *everything* — writing it would hand
 * the campaign the opposite of what the user did. This is exactly what the old
 * `sourcesPayload("selected", ids)` did, so what reaches the server for any
 * given on-screen state is unchanged.
 */
export function membershipPayload(assetIds: string[]): MembershipFields {
  return assetIds.length > 0
    ? { use_assets: true, asset_ids: assetIds }
    : { use_assets: false, asset_ids: [] }
}

/**
 * A campaign saved under the old whole-bank mode.
 *
 * Read as a set, `use_assets: true, asset_ids: []` is an *empty* bank — the
 * campaign silently loses every source it has been generating from, and
 * nothing on screen would differ. These have to be pinned to the bank's
 * current ids on first sight of the page.
 */
export function seedsWholeBank(
  campaign: Pick<Campaign, 'use_assets' | 'asset_ids'>,
): boolean {
  return campaign.use_assets && campaign.asset_ids.length === 0
}

/** The campaign's own documents, in the order the bank lists them. */
export function campaignAssets(
  assets: Asset[],
  campaign: Pick<Campaign, 'asset_ids'>,
): Asset[] {
  const owned = new Set(campaign.asset_ids)
  return assets.filter((asset) => owned.has(asset.id))
}

/**
 * Whether retrieval can actually reach an asset.
 *
 * - `ready`   — chunked and embedded; the retriever can pull passages from it.
 * - `waiting` — `pending`/`processing`; nothing to retrieve *yet*.
 * - `never`   — `failed`/`partial`; the server skips these outright
 *               (CON-118 §10), so one sitting in a campaign is silently inert.
 */
export type Retrievability = 'ready' | 'waiting' | 'never'

export function retrievability(status: AssetStatus): Retrievability {
  switch (status) {
    case 'ready':
      return 'ready'
    case 'pending':
    case 'processing':
      return 'waiting'
    case 'partial':
    case 'failed':
      return 'never'
  }
}
