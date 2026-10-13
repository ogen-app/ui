import { useMemo } from 'react'
import {
  keepPreviousData,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import {
  queryAssets,
  getAsset,
  getAudioStatus,
  getAudioTranscript,
  listAssetChunks,
  reextractAudio,
  reextractImage,
  regenerateAltText,
  retryAudio,
  createAsset,
  createUrlAsset,
  updateAsset,
  bulkTagAssets,
  deleteAsset,
} from '@/services/api/content'
import { i18next } from '@/i18n'
import { retrievability } from '@/lib/campaignSources'
import { isSessionExpiring } from '@/lib/sessionExpiry'
import { ApiError } from '@/services/api/errors'
import { toast } from '@/stores/toastStore'
import type {
  Asset,
  BulkTagPayload,
  CreateAssetPayload,
  UpdateAssetPayload,
} from '@/types/content'
import type { AssetListPage, AssetQueryParams } from '@/types/assetList'
import { invalidateEntitlements } from './useEntitlements'

export const ASSETS_KEY = ['assets'] as const
export const assetKey = (id: string) => ['assets', id] as const

/** How often to look again while something in the list is still extracting. */
const PROCESSING_POLL_MS = 3000

/**
 * Every read of the Assets query (CON-374), whatever its filters. Under
 * `ASSETS_KEY`, so anything that invalidates the assets reaches every list —
 * and narrower than it, so a write that only changes what the *list* shows
 * (an idea answered, a campaign joined) need not refetch an open document.
 */
export const ASSET_LIST_KEY = ['assets', 'list'] as const

/** How many rows a page of the list brings in. */
export const ASSET_PAGE_SIZE = 50

/**
 * The Assets query, a page at a time, watching itself while anything loaded is
 * still being read.
 *
 * `params` is the whole query — filters, scope, sort, the facets to count —
 * and the Query key, so two screens asking the same question share one cache
 * entry. The rows of the previous question stay on screen while the next one
 * loads (`keepPreviousData`), so narrowing the list never flashes it empty.
 *
 * Extraction happens after an upload returns, so a fresh document lands as
 * `processing` with nothing on the client to notice it settle; the poll covers
 * that, and covers documents that started processing somewhere else. Facets
 * are asked for on the first page only — they describe the whole match, not a
 * page of it.
 */
export function useAssetList(
  params: AssetQueryParams,
  {
    enabled = true,
    facets = [],
  }: { enabled?: boolean; facets?: string[] } = {},
) {
  const query = useInfiniteQuery({
    queryKey: [...ASSET_LIST_KEY, params, facets],
    queryFn: ({ pageParam }) =>
      queryAssets({
        ...params,
        limit: String(ASSET_PAGE_SIZE),
        ...(pageParam
          ? { cursor: pageParam }
          : facets.length
            ? { facets: facets.join(',') }
            : {}),
      }),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.next_cursor ?? undefined,
    placeholderData: keepPreviousData,
    enabled,
    refetchInterval: (q) =>
      q.state.data?.pages.some((page) =>
        page.assets.some((asset) => retrievability(asset.status) === 'waiting'),
      )
        ? PROCESSING_POLL_MS
        : false,
  })
  const pages = query.data?.pages
  const rows = useMemo(
    () => pages?.flatMap((page) => page.assets) ?? [],
    [pages],
  )
  const first = pages?.[0]
  return {
    query,
    rows,
    total: first?.total ?? 0,
    totalUnfiltered: first?.total_unfiltered ?? 0,
    facets: first?.facets ?? NO_FACETS,
    /** Every group of the whole match, in display order — every page carries it. */
    groups: first?.groups ?? NO_GROUPS,
    ideasUndecidedTotal: first?.ideas_undecided_total ?? 0,
  }
}

const NO_FACETS: AssetListPage['facets'] = {}
const NO_GROUPS: AssetListPage['groups'] = []

/**
 * How many assets a query would match, without its rows — what a suggestion
 * or an empty state says removing or adding something would leave.
 */
export function useAssetCount(
  params: AssetQueryParams,
  { enabled = true }: { enabled?: boolean } = {},
) {
  return useQuery({
    queryKey: [...ASSET_LIST_KEY, 'count', params],
    queryFn: async () => (await queryAssets({ ...params, limit: '1' })).total,
    enabled,
    staleTime: 30_000,
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

export const assetChunksKey = (id: string) => ['assets', id, 'chunks'] as const

/** How many chunks each "show more" brings in. */
const CHUNK_PAGE = 100

/**
 * The asset's chunks, a page at a time (CON-312).
 *
 * Under `['assets', id]`, so anything that invalidates the asset — its own
 * poll settling, an `asset.updated` event — takes the chunks with it: a
 * re-extraction replaces every one of them. Enable it only once the asset has
 * settled; while it is still being read there is nothing stable to page.
 */
export function useAssetChunks(id: string, { enabled }: { enabled: boolean }) {
  return useInfiniteQuery({
    queryKey: assetChunksKey(id),
    queryFn: ({ pageParam }) => listAssetChunks(id, pageParam, CHUNK_PAGE),
    initialPageParam: 0,
    getNextPageParam: (last) => {
      const next = last.offset + last.chunks.length
      return next < last.total && last.chunks.length > 0 ? next : undefined
    },
    enabled: enabled && !!id,
  })
}

export const audioStatusKey = (id: string) => ['assets', id, 'audio'] as const
export const transcriptKey = (id: string) =>
  ['assets', id, 'audio', 'transcript'] as const

const AUDIO_SETTLED = new Set(['complete', 'partial', 'failed'])

/**
 * A recording's transcription run, watching itself until it settles — the
 * asset's own poll says *that* it is still going, this says how far.
 *
 * A recording with no run yet answers `null`, and that only means "not yet"
 * while the asset is still being read: once `assetSettled`, nothing is coming,
 * and polling on would go on for as long as the screen stays open. A failed
 * read stops it too — a re-run or an `asset.updated` invalidates this key, so
 * the next run is still picked up.
 */
export function useAudioStatus(
  id: string,
  { assetSettled }: { assetSettled: boolean },
) {
  return useQuery({
    queryKey: audioStatusKey(id),
    queryFn: () => getAudioStatus(id),
    enabled: !!id,
    refetchInterval: (query) => {
      if (query.state.status === 'error') return false
      const status = query.state.data?.extraction.status
      if (status) return AUDIO_SETTLED.has(status) ? false : PROCESSING_POLL_MS
      return assetSettled ? false : PROCESSING_POLL_MS
    },
  })
}

/** The transcript, once there is one to read. */
export function useAudioTranscript(
  id: string,
  { enabled }: { enabled: boolean },
) {
  return useQuery({
    queryKey: transcriptKey(id),
    queryFn: () => getAudioTranscript(id),
    enabled: enabled && !!id,
  })
}

/**
 * Re-runs a recording's transcription: only its failed parts (`retry`), or
 * the whole of it (`reextract`). Either way the asset goes back to being read,
 * so everything under it is re-fetched — status, run, transcript.
 */
export function useRerunAudio(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (mode: 'retry' | 'reextract') =>
      mode === 'retry' ? retryAudio(id) : reextractAudio(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: assetKey(id) })
      qc.invalidateQueries({ queryKey: ASSET_LIST_KEY })
    },
  })
}

/**
 * A fresh alt text for an image. The server saves it, so the cached asset is
 * patched with it rather than refetched — a refetch mid-edit would bring the
 * rest of the asset back with it.
 */
export function useRegenerateAltText(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => regenerateAltText(id),
    onSuccess: (alt_text) => {
      qc.setQueryData<Asset>(assetKey(id), (asset) =>
        asset ? { ...asset, alt_text } : asset,
      )
      qc.invalidateQueries({ queryKey: ASSET_LIST_KEY })
    },
  })
}

/** Reads an image again; the asset goes back to pending and is watched. */
export function useReextractImage(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => reextractImage(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: assetKey(id) })
      qc.invalidateQueries({ queryKey: ASSET_LIST_KEY })
    },
  })
}

export function useCreateAsset() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: CreateAssetPayload) => createAsset(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ASSETS_KEY })
      // A row in the bank, which is what `content_bank_assets` counts — the
      // server charges a written note, an uploaded file and a scraped page to
      // that one key alike (CON-295).
      invalidateEntitlements(qc)
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
      // A row in the bank, which is what `content_bank_assets` counts — the
      // server charges a written note, an uploaded file and a scraped page to
      // that one key alike (CON-295).
      invalidateEntitlements(qc)
    },
  })
}

/**
 * Saves an asset.
 *
 * One refusal is worded here rather than by the default toast: `content_locked`
 * (CON-312), a changed `content` on a PDF, office document or recording. No
 * screen sends one — those types open read-only — so reaching it means the
 * screen was wrong about what it had open, and the asset is re-read so the
 * right screen replaces it.
 */
export function useUpdateAsset() {
  const qc = useQueryClient()
  return useMutation({
    meta: { errorToast: false },
    onError: (err, { id }) => {
      // The default toast's own guard, which opting out skips: a 401 has
      // already started the redirect to the login screen.
      if (isSessionExpiring()) return
      if (err instanceof ApiError && err.code === 'content_locked') {
        toast.error(i18next.t('content.locked.title'), {
          description: i18next.t('content.locked.body'),
        })
        qc.invalidateQueries({ queryKey: assetKey(id) })
        return
      }
      toast.error(err instanceof Error ? err.message : 'Unable to update asset')
    },
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

/**
 * Tags a selection in one request (CON-279).
 *
 * The list is invalidated rather than patched: the server decides what each
 * asset ends up carrying — dedupe, order, assets it skipped — and a client-side
 * merge of `add`/`remove` would be a second opinion about the same rows.
 */
export function useBulkTagAssets() {
  const qc = useQueryClient()
  return useMutation({
    meta: { errorTitle: 'Unable to tag those documents' },
    mutationFn: (payload: BulkTagPayload) => bulkTagAssets(payload),
    onSuccess: (assets) => {
      qc.invalidateQueries({ queryKey: ASSETS_KEY })
      for (const asset of assets) {
        qc.invalidateQueries({ queryKey: assetKey(asset.id) })
      }
    },
  })
}

export function useDeleteAsset() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteAsset(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ASSETS_KEY })
      // A row in the bank, which is what `content_bank_assets` counts — the
      // server charges a written note, an uploaded file and a scraped page to
      // that one key alike (CON-295).
      invalidateEntitlements(qc)
    },
  })
}

/** How many deletes are in flight at once — a selection can be every match. */
const DELETE_CONCURRENCY = 6

/**
 * Deletes many documents, and answers with the ids that are really gone.
 *
 * One request per id — the API has no bulk delete — but one refetch for the
 * lot: a selection can be "all 124 matching", and invalidating the list after
 * each of those would re-read it 124 times. The requests run a few at a time
 * rather than all at once, so a large selection doesn't queue every other
 * request in the tab behind it.
 *
 * A failure is counted rather than thrown, so one refused document doesn't
 * hide the forty that went — the caller says how many of each.
 */
export function useDeleteAssets() {
  const qc = useQueryClient()
  return useMutation({
    meta: { errorToast: false },
    mutationFn: async (ids: string[]) => {
      const gone: string[] = []
      const failed: unknown[] = []
      let next = 0
      const worker = async () => {
        while (next < ids.length) {
          const id = ids[next++]
          try {
            await deleteAsset(id)
            gone.push(id)
          } catch (error) {
            failed.push(error)
          }
        }
      }
      await Promise.all(
        Array.from(
          { length: Math.min(DELETE_CONCURRENCY, ids.length) },
          worker,
        ),
      )
      return { gone, failed }
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ASSETS_KEY })
      invalidateEntitlements(qc)
    },
  })
}
