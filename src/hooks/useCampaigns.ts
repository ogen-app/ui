import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  listCampaigns,
  listCampaignSummaries,
  getCampaign,
  createCampaign,
  updateCampaign,
  archiveCampaign,
  unarchiveCampaign,
  deleteCampaign,
  listCampaignTypes,
} from '@/services/api/campaigns'
import type {
  Campaign,
  CreateCampaignPayload,
  UpdateCampaignPayload,
} from '@/types/campaigns'
import type { MutationErrorMeta } from '@/lib/queryClient'
import { CAMPAIGN_SUMMARIES_KEY } from '@/lib/queryKeys'

const CAMPAIGNS_KEY = ['campaigns'] as const
// Exported so the assistant store can invalidate it from outside React. The
// campaign's post list nests under this key, so invalidating it covers both.
export const campaignKey = (id: string) => ['campaigns', id] as const
export const CAMPAIGN_TYPES_KEY = ['campaign-types'] as const
/**
 * The archived list is a sibling key, not a variant of the active one: it is a
 * different read, and a campaign moves between them rather than changing
 * inside one. Deliberately outside `CAMPAIGNS_KEY`, so the sidebar's list and
 * `useCampaign`'s seed can never be served an archived campaign — and both
 * are invalidated together on every archive.
 */
const ARCHIVED_CAMPAIGNS_KEY = ['campaigns-archived'] as const

export function useCampaigns() {
  return useQuery({
    queryKey: CAMPAIGNS_KEY,
    queryFn: () => listCampaigns(),
  })
}

/** Campaigns that have been put away (CON-156). Fetched only where shown. */
export function useArchivedCampaigns(enabled = true) {
  return useQuery({
    queryKey: ARCHIVED_CAMPAIGNS_KEY,
    queryFn: () => listCampaigns(true),
    enabled,
  })
}

/**
 * One campaign, seeded from the campaigns list while its own fetch runs.
 *
 * The list is already in cache on every authenticated screen — the sidebar
 * mounts `useCampaigns()` — and `GET /api/campaigns` hydrates the same tags,
 * platforms and campaign type that `GET /api/campaigns/:id` does, so the entry
 * in it is the whole campaign, not a summary of one. Without the seed, opening
 * a campaign showed a full-screen spinner for as long as the round trip took,
 * even though the app already had the record in hand: three layouts in a row
 * — spinner, then skeletons, then the page — where one was warranted.
 *
 * `initialDataUpdatedAt` hands over the list's own timestamp so the seed ages
 * like the data it came from: it goes stale on the normal 30s clock and
 * refetches, rather than being taken for a fresh read of this campaign.
 */
export function useCampaign(id: string) {
  const qc = useQueryClient()
  return useQuery({
    queryKey: campaignKey(id),
    queryFn: () => getCampaign(id),
    enabled: !!id,
    initialData: () =>
      qc.getQueryData<Campaign[]>(CAMPAIGNS_KEY)?.find((c) => c.id === id),
    initialDataUpdatedAt: () => qc.getQueryState(CAMPAIGNS_KEY)?.dataUpdatedAt,
  })
}

/**
 * Every campaign's posts, slim, in one request (CON-152) — keyed by campaign
 * id. The Campaigns list renders one card per campaign and each used to fetch
 * its own hydrated post list; this is that N+1 collapsed into a single query
 * the whole list shares.
 *
 * Cards read `data?.[campaign.id] ?? []` and take their load state from this
 * one query, so a campaign that is merely absent (no posts) is not mistaken
 * for one that hasn't loaded.
 */
export function useCampaignSummaries() {
  return useQuery({
    queryKey: CAMPAIGN_SUMMARIES_KEY,
    queryFn: listCampaignSummaries,
  })
}

export function useCreateCampaign() {
  const qc = useQueryClient()
  return useMutation({
    meta: { errorTitle: 'Unable to create the campaign' },
    mutationFn: (payload: CreateCampaignPayload) => createCampaign(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: CAMPAIGNS_KEY })
    },
  })
}

/**
 * The campaign PUT, shared by the settings form, the brief, the assets panel
 * and the content-usage form.
 *
 * `meta` is a parameter because those call sites describe the same request in
 * different words — toggling a platform is not "updating the campaign" to the
 * person doing it — and one of them (activate/deactivate) picks its wording
 * per click, which no static `meta` can express. See `MutationErrorMeta`.
 */
export function useUpdateCampaign(meta?: MutationErrorMeta) {
  const qc = useQueryClient()
  return useMutation({
    meta,
    mutationFn: ({
      id,
      payload,
    }: {
      id: string
      payload: UpdateCampaignPayload
    }) => updateCampaign(id, payload),
    onSuccess: (_data, { id }) => {
      qc.invalidateQueries({ queryKey: CAMPAIGNS_KEY })
      qc.invalidateQueries({ queryKey: campaignKey(id) })
    },
  })
}

/**
 * Archiving and its undo (CON-156).
 *
 * Both lists are invalidated on either, because either moves a campaign from
 * one to the other — and the summaries with them, since the Campaigns list
 * scores its cards from that one batched query and would go on counting posts
 * for a campaign that is no longer on screen.
 */
function useArchiveMutation(
  fn: (id: string) => Promise<void>,
  errorTitle: string,
) {
  const qc = useQueryClient()
  return useMutation({
    meta: { errorTitle },
    mutationFn: fn,
    onSuccess: (_data, id) => {
      qc.invalidateQueries({ queryKey: CAMPAIGNS_KEY })
      qc.invalidateQueries({ queryKey: ARCHIVED_CAMPAIGNS_KEY })
      qc.invalidateQueries({ queryKey: CAMPAIGN_SUMMARIES_KEY })
      qc.invalidateQueries({ queryKey: campaignKey(id) })
    },
  })
}

export function useArchiveCampaign() {
  return useArchiveMutation(archiveCampaign, 'Unable to archive the campaign')
}

export function useUnarchiveCampaign() {
  return useArchiveMutation(
    unarchiveCampaign,
    'Unable to bring the campaign back',
  )
}

export function useDeleteCampaign() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteCampaign(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: CAMPAIGNS_KEY })
      qc.invalidateQueries({ queryKey: ARCHIVED_CAMPAIGNS_KEY })
      qc.invalidateQueries({ queryKey: CAMPAIGN_SUMMARIES_KEY })
    },
  })
}

export function useCampaignTypes() {
  return useQuery({
    queryKey: CAMPAIGN_TYPES_KEY,
    queryFn: listCampaignTypes,
    staleTime: Infinity,
  })
}
