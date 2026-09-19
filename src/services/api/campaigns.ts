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

/**
 * The active set — neither archived nor deleted — or the archived one instead
 * (CON-156). They are two lists, never one filtered client-side: the server
 * excludes archived campaigns from the default read, so an "archived" flag on
 * a row that was never sent could only ever be false.
 */
export function listCampaigns(archived = false): Promise<Campaign[]> {
  return apiJson<Campaign[]>(
    archived ? `${BASE}?archived=true` : BASE,
    'Unable to fetch campaigns',
  )
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

/**
 * Attaches documents to a campaign's content-bank set, and nothing else
 * (CON-233).
 *
 * A union server-side, in one atomic UPDATE: two people attaching different
 * documents at the same moment both land, which a read-modify-write of the
 * whole record could not promise. Re-attaching something the campaign already
 * holds is a no-op, and the server keeps `use_assets` in lockstep with the set
 * — attaching turns generation on, so the client never computes that flag.
 *
 * An empty list is a wasted round trip (the server answers it with a plain
 * read), so callers guard it; `lib/campaignMembership` is the one that does.
 */
export function addCampaignAssets(
  id: string,
  assetIds: string[],
): Promise<Campaign> {
  return apiJson<Campaign>(
    `${BASE}/${id}/assets`,
    'Unable to add to this campaign',
    { method: 'POST', body: { asset_ids: assetIds } },
  )
}

/**
 * Detaches one document, leaving the document itself alone (CON-233).
 *
 * One id per request because that is the endpoint's shape, and it is the right
 * shape: removal is idempotent, so a detach that raced another one is not an
 * error and nothing has to be resent. Detaching the last document re-derives
 * `use_assets` to false rather than leaving `true` over an empty list — which
 * the server reads as "every asset in the workspace".
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
 * Takes a campaign out of the active list, reversibly (CON-156).
 *
 * Both of these are idempotent and answer 204, so nothing comes back to
 * re-seed the cache with — the caller invalidates instead. Archiving is *not*
 * an update: it has its own endpoint precisely so it can't be smuggled into a
 * whole-resource PUT alongside a field the user was editing.
 */
export function archiveCampaign(id: string): Promise<void> {
  return apiVoid(`${BASE}/${id}/archive`, 'Unable to archive campaign', {
    method: 'POST',
  })
}

export function unarchiveCampaign(id: string): Promise<void> {
  return apiVoid(`${BASE}/${id}/unarchive`, 'Unable to unarchive campaign', {
    method: 'POST',
  })
}

/**
 * Removes a campaign from the workspace.
 *
 * A soft delete server-side since CON-156 — the row is stamped and kept as a
 * safety net — but that is an operational detail, not a promise to the user:
 * there is no restore, in the app or on the API, and every read behaves as if
 * the campaign is gone. Nothing in the UI should offer it back.
 */
export function deleteCampaign(id: string): Promise<void> {
  return apiVoid(`${BASE}/${id}`, 'Unable to delete campaign', {
    method: 'DELETE',
  })
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
