import type {
  Asset,
  AssetChunkPage,
  AudioStatus,
  TranscriptEntry,
  BulkTagPayload,
  CreateAssetPayload,
  UpdateAssetPayload,
} from '@/types/content'
import { ApiError } from './errors'
import { apiJson, apiVoid } from './http'

const BASE = '/api/content-bank/assets'

export function listAssets(): Promise<Asset[]> {
  return apiJson<Asset[]>(BASE, 'Unable to fetch assets')
}

export function getAsset(id: string): Promise<Asset> {
  return apiJson<Asset>(`${BASE}/${id}`, 'Unable to fetch asset')
}

/**
 * One page of an asset's chunks, in order, without their embeddings
 * (CON-312). The server caps a page at 500 and defaults to 100.
 */
export function listAssetChunks(
  id: string,
  offset = 0,
  limit = 100,
): Promise<AssetChunkPage> {
  return apiJson<AssetChunkPage>(
    `${BASE}/${id}/chunks?offset=${offset}&limit=${limit}`,
    'Unable to read this document',
  )
}

export function createAsset(payload: CreateAssetPayload): Promise<Asset> {
  return apiJson<Asset>(BASE, 'Unable to create asset', {
    method: 'POST',
    body: payload,
  })
}

/**
 * Submits a web page to be scraped into an asset (CON-222).
 *
 * Ingestion is asynchronous: what comes back is an asset with no content yet,
 * whose `status` walks `pending → processing → ready | partial | failed` while
 * a worker reads the page. The reply is 201 for a URL this workspace hasn't
 * saved and 200 for one it has — in which case that asset is re-scraped in
 * place rather than duplicated. Both answers are the asset to follow, so the
 * distinction stops here.
 *
 * A 409 means this deployment has no scraping key configured, which is a state
 * to explain rather than an error the user caused.
 */
export function createUrlAsset(url: string): Promise<Asset> {
  return apiJson<Asset>(`${BASE}/url`, 'Unable to read that page', {
    method: 'POST',
    body: { url },
  })
}

export function updateAsset(
  id: string,
  payload: UpdateAssetPayload,
): Promise<Asset> {
  return apiJson<Asset>(`${BASE}/${id}`, 'Unable to update asset', {
    method: 'PUT',
    body: payload,
  })
}

/**
 * Files tags across a selection in one request (CON-279).
 *
 * Returns the assets it touched, hydrated — assets outside this workspace are
 * skipped rather than refused, so the reply is also the answer to "which of
 * these did anything happen to".
 */
export function bulkTagAssets(payload: BulkTagPayload): Promise<Asset[]> {
  return apiJson<Asset[]>(`${BASE}/tags`, 'Unable to tag those documents', {
    method: 'POST',
    body: payload,
  })
}

export function deleteAsset(id: string): Promise<void> {
  return apiVoid(`${BASE}/${id}`, 'Unable to delete asset', {
    method: 'DELETE',
  })
}

/**
 * How far a recording's transcription has got (CON-282), or null before a run
 * exists — the server answers 404 for that, which is a state and not an error.
 */
export async function getAudioStatus(id: string): Promise<AudioStatus | null> {
  try {
    return await apiJson<AudioStatus>(
      `${BASE}/${id}/audio`,
      'Unable to read this recording',
    )
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return null
    throw err
  }
}

export async function getAudioTranscript(
  id: string,
): Promise<TranscriptEntry[]> {
  const body = await apiJson<{ transcript: TranscriptEntry[] | null }>(
    `${BASE}/${id}/audio/transcript`,
    'Unable to read this transcript',
  )
  return body.transcript ?? []
}

/**
 * Re-drives only the parts of the recording that failed. A 409 means there
 * were none — or that audio isn't configured on this deployment.
 */
export function retryAudio(id: string): Promise<void> {
  return apiVoid(`${BASE}/${id}/audio/retry`, 'Unable to retry', {
    method: 'POST',
  })
}

/** Transcribes the whole recording again, replacing the transcript. */
export function reextractAudio(id: string): Promise<void> {
  return apiVoid(
    `${BASE}/${id}/audio/reextract`,
    'Unable to transcribe again',
    {
      method: 'POST',
      body: {},
    },
  )
}
