import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  listAssets,
  getAsset,
  createAsset,
  createUrlAsset,
  updateAsset,
  deleteAsset,
} from '@/services/api/content'
import { retrievability } from '@/lib/campaignSources'
import type { CreateAssetPayload, UpdateAssetPayload } from '@/types/content'

export const ASSETS_KEY = ['assets'] as const
export const assetKey = (id: string) => ['assets', id] as const

/** How often to look again while something in the list is still extracting. */
const PROCESSING_POLL_MS = 3000

/**
 * The asset list, which watches itself while anything in it is processing.
 *
 * Extraction happens after the upload returns, so a freshly added document
 * lands as `processing` and becomes readable some seconds later with nothing
 * on the client to notice. The tracker used to poll each upload it knew about;
 * this covers the same ground from the list itself, and also covers assets
 * that started processing somewhere else — another tab, another campaign, or
 * before this page was open.
 */
export function useAssets() {
  return useQuery({
    queryKey: ASSETS_KEY,
    queryFn: listAssets,
    refetchInterval: (query) =>
      query.state.data?.some(
        (asset) => retrievability(asset.status) === 'waiting',
      )
        ? PROCESSING_POLL_MS
        : false,
  })
}

/**
 * One document, watching itself while it is still being read.
 *
 * The same self-poll as the list, for the same deployment state: the
 * `asset.updated` broadcast is the normal way a scrape or extraction reports
 * done, but with the event stream down an open document would say "Reading…"
 * forever — the list isn't mounted here to backstop it, and window-focus
 * refetches are off app-wide.
 */
export function useAsset(id: string) {
  return useQuery({
    queryKey: assetKey(id),
    queryFn: () => getAsset(id),
    enabled: !!id,
    refetchInterval: (query) =>
      query.state.data && retrievability(query.state.data.status) === 'waiting'
        ? PROCESSING_POLL_MS
        : false,
  })
}

export function useCreateAsset() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: CreateAssetPayload) => createAsset(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ASSETS_KEY })
    },
  })
}

/**
 * Hands a URL to the scraper.
 *
 * The asset it resolves with is a placeholder — no title, no content — and the
 * work happens in a background job. What fills it in is `asset.updated` on the
 * broadcast stream (`lib/eventRouting`), with the list's own poll behind it for
 * deployments where the stream is down.
 */
export function useCreateUrlAsset() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (url: string) => createUrlAsset(url),
    // Reported inline, beside the field the URL was typed into: a toast about
    // the value you are still looking at explains nothing the field can't.
    meta: { errorToast: false },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ASSETS_KEY })
    },
  })
}

export function useUpdateAsset() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string
      payload: UpdateAssetPayload
    }) => updateAsset(id, payload),
    onSuccess: (_data, { id }) => {
      qc.invalidateQueries({ queryKey: ASSETS_KEY })
      qc.invalidateQueries({ queryKey: assetKey(id) })
    },
  })
}

export function useDeleteAsset() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteAsset(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ASSETS_KEY })
    },
  })
}
