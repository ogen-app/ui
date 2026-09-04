import type {
  Campaign,
  CampaignType,
  CreateCampaignPayload,
  UpdateCampaignPayload,
} from '@/types/campaigns'
import type { CampaignSummariesResponse, PostSummary } from '@/types/posts'
import { apiJson, apiVoid } from './http'

const BASE = '/api/campaigns'
const TYPES_BASE = '/api/campaign_types'

export function listCampaigns(): Promise<Campaign[]> {
  return apiJson<Campaign[]>(BASE, 'Unable to fetch campaigns')
}

export function getCampaign(id: string): Promise<Campaign> {
  return apiJson<Campaign>(`${BASE}/${id}`, 'Unable to fetch campaign')
}

export function createCampaign(
  payload: CreateCampaignPayload,
): Promise<Campaign> {
  return apiJson<Campaign>(BASE, 'Unable to create campaign', {
    method: 'POST',
    body: payload,
  })
}

export function updateCampaign(
  id: string,
  payload: UpdateCampaignPayload,
): Promise<Campaign> {
  return apiJson<Campaign>(`${BASE}/${id}`, 'Unable to update campaign', {
    method: 'PUT',
    body: payload,
  })
}

export function deleteCampaign(id: string): Promise<void> {
  return apiVoid(`${BASE}/${id}`, 'Unable to delete campaign', {
    method: 'DELETE',
  })
}

/**
 * Attaches documents to a campaign's content bank, touching no other field
 * (CON-233).
 *
 * One atomic UPDATE of `asset_ids` server-side: ids the campaign already has
 * keep their position, new ones append in the order given, and two attaches
 * landing at once both survive — which is what the whole-campaign PUT could not
 * promise, since each carried the set as its caller had read it. Adding an id
 * the campaign already holds is a no-op.
 *
 * It also turns `use_assets` on, in the same statement. That flag is not a
 * second decision the client makes: since CON-210 retired the three-mode
 * picker, "the campaign writes from these documents" is the *only* thing a
 * non-empty set can mean, and generation reads the flag before it reads the set
 * (`resolveAssets` returns early when it is false). A campaign whose documents
 * were attached but whose flag stayed off would show a full list and generate
 * from none of it.
 *
 * Returns the campaign hydrated, so the cache can take the server's own copy
 * rather than a locally-patched one.
 */
export function addCampaignAssets(
  id: string,
  assetIds: string[],
): Promise<Campaign> {
  return apiJson<Campaign>(
    `${BASE}/${id}/assets`,
    'Unable to add to this campaign',
    {
      method: 'POST',
      body: { asset_ids: assetIds },
    },
  )
}

/**
 * Detaches one document from a campaign's content bank, leaving the asset
 * itself alone (CON-233). Removing an id the campaign does not hold is a no-op,
 * not a 404.
 *
 * `use_assets` is re-derived from what the set becomes, so detaching the *last*
 * document turns it off. That is the half of the flag that has to be a server
 * decision rather than a client one: `use_assets: true` over an empty list is
 * how the server spells "every asset in the workspace", so a client that
 * cleared the set and left the flag alone would hand the campaign the whole
 * workspace bank — the exact opposite of what the user just did, with nothing
 * on screen to show for it.
 *
 * One id per request by design: the ids are a set, so N removals are N
 * independent statements and a partial failure leaves a coherent campaign.
 */
export function removeCampaignAsset(
  id: string,
  assetId: string,
): Promise<Campaign> {
  return apiJson<Campaign>(
    `${BASE}/${id}/assets/${assetId}`,
    'Unable to remove from this campaign',
    { method: 'DELETE' },
  )
}

/**
 * Every campaign's posts in one request, as slim projections (CON-152).
 *
 * Replaces the burst of `GET /campaigns/:id/posts` the Campaigns list used to
 * fire — one per card, each fully hydrated — with a single call. Returned as a
 * lookup rather than the wire's array because that is how every caller uses
 * it: a card asks for its own campaign and expects `[]` when it has no posts,
 * and the server omits empty campaigns entirely.
 */
export async function listCampaignSummaries(): Promise<
  Record<string, PostSummary[]>
> {
  const res = await apiJson<CampaignSummariesResponse>(
    `${BASE}/summaries`,
    'Unable to fetch campaign summaries',
  )
  const byCampaign: Record<string, PostSummary[]> = {}
  for (const summary of res.summaries ?? []) {
    byCampaign[summary.campaign_id] = summary.posts ?? []
  }
  return byCampaign
}

export function listCampaignTypes(): Promise<CampaignType[]> {
  return apiJson<CampaignType[]>(TYPES_BASE, 'Unable to fetch campaign types')
}
