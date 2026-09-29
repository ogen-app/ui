import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import {
  listAssets,
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
import { invalidateEntitlements } from './useEntitlements'

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
export function useAssets({ enabled = true }: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: ASSETS_KEY,
    queryFn: listAssets,
    // Off means "don't fetch for my sake", never "don't answer": a disabled
    // query still reads whatever the cache holds, which is what lets the
    // upload modal check for duplicates on a screen that has the list open
    // without pulling it down on one that doesn't.
    enabled,
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
      qc.invalidateQueries({ queryKey: ASSETS_KEY, exact: true })
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
      qc.invalidateQueries({ queryKey: ASSETS_KEY, exact: true })
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
      qc.invalidateQueries({ queryKey: ASSETS_KEY, exact: true })
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
