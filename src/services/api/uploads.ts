import type { Asset } from '@/types/content'
import { STORAGE_UPLOAD_FAILED_CODE } from '@/lib/assetStatus'
import { apiUrl, workspaceHeader } from './base'
import { deleteAsset } from './content'
import { ApiError } from './errors'
import { apiJson } from './http'
import { StorageUploadError, putToStorage } from './storageUpload'

const UPLOAD_URL = '/api/content-bank/assets/upload'
const AUDIO_URL = '/api/content-bank/assets/audio'

/** Per-file outcome returned by the backend's batch upload endpoint. */
export type UploadResult = {
  filename: string
  asset_id?: string
  status: 'created' | 'failed'
  error?: string
  /** Why it failed, machine-readable (CON-281) — see `lib/uploadError`. */
  code?: string
  asset?: Asset
}

type UploadOptions = {
  onProgress?: (percent: number) => void
  signal?: AbortSignal
}

/**
 * Uploads a single file to the content bank. Uses XMLHttpRequest (not fetch) so
 * the transfer progress can be reported per file via `onProgress`. The endpoint
 * accepts a batch under the `files` field and always responds 201 with a
 * `results` array; we send one file per request, so we return `results[0]`.
 */
export function uploadAssetFile(
  file: File,
  opts: UploadOptions = {},
): Promise<UploadResult> {
  return new Promise((resolve, reject) => {
    const form = new FormData()
    form.append('files', file)

    const xhr = new XMLHttpRequest()
    xhr.open('POST', apiUrl(UPLOAD_URL), true)
    xhr.withCredentials = true
    xhr.responseType = 'json'
    // The upload takes a different transport but lands in the same workspace
    // as everything else this tab does (CON-147). `setRequestHeader` has to
    // come after `open`, which is why it isn't part of the options above.
    for (const [key, value] of Object.entries(workspaceHeader(UPLOAD_URL))) {
      xhr.setRequestHeader(key, value)
    }

    if (opts.onProgress) {
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          opts.onProgress?.(Math.round((e.loaded / e.total) * 100))
        }
      }
    }

    xhr.onload = () => {
      const body = xhr.response as {
        results?: UploadResult[]
        error?: string
      } | null
      if (xhr.status < 200 || xhr.status >= 300) {
        reject(new Error(extractError(body, 'Upload failed')))
        return
      }
      const result = body?.results?.[0]
      if (!result) {
        reject(new Error('Server returned no upload result'))
        return
      }
      resolve(result)
    }

    xhr.onerror = () => reject(new Error('Network error during upload'))
    xhr.onabort = () => reject(new DOMException('Upload aborted', 'AbortError'))

    if (opts.signal) {
      if (opts.signal.aborted) {
        xhr.abort()
        return
      }
      opts.signal.addEventListener('abort', () => xhr.abort(), { once: true })
    }

    xhr.send(form)
  })
}

function extractError(body: unknown, fallback: string): string {
  if (body && typeof body === 'object' && 'error' in body) {
    const e = (body as { error?: unknown }).error
    if (typeof e === 'string' && e.length > 0) return e
  }
  return fallback
}

type PresignedAudio = {
  asset: Asset
  upload_url: string
  storage_key: string
  method: 'PUT'
  /** Exactly what the PUT must send — the Content-Type is signed. */
  headers: Record<string, string>
}

/**
 * Uploads one recording to the content bank (CON-282). Three steps, because
 * audio never goes through the API process — an hour of speech is hundreds of
 * megabytes:
 *
 *   1. `presign`  — creates a `pending` AUDIO asset and a 30-minute PUT URL.
 *   2. PUT        — the bytes go straight to object storage.
 *   3. `finalize` — the server checks the stored size against the 5 GiB cap and
 *                   the plan's storage, then starts transcription.
 *
 * Answers in the same shape as `uploadAssetFile` — a failure is a result with
 * a code, not a rejection — so the upload store treats the two alike.
 * Progress is reported against the PUT alone, the only step that moves bytes.
 *
 * **Presign creates the asset before a byte has moved**, so a PUT that fails —
 * a bucket without CORS for this origin, a dropped connection — would leave a
 * `pending` recording in the list that nothing will ever process. It is deleted
 * again on the way out, and so is one finalize refused, since that asset is
 * equally dead. Not on a finalize that never answered: that one may have
 * started, and deleting it would throw away a transcription in flight.
 */
export async function uploadAudioFile(
  file: File,
  opts: UploadOptions = {},
): Promise<UploadResult> {
  const failed = (code: string | undefined, error: string): UploadResult => ({
    filename: file.name,
    status: 'failed',
    code,
    error,
  })

  let presigned: PresignedAudio
  try {
    presigned = await apiJson<PresignedAudio>(
      `${AUDIO_URL}/presign`,
      'Upload failed',
      { method: 'POST', body: { filename: file.name } },
    )
  } catch (err) {
    if (err instanceof ApiError) return failed(audioCode(err), err.message)
    throw err
  }
  const assetId = presigned.asset.id

  try {
    await putToStorage(presigned.upload_url, file, {
      headers: presigned.headers,
      onProgress: opts.onProgress,
      signal: opts.signal,
    })
  } catch (err) {
    void discard(assetId)
    if (err instanceof StorageUploadError) {
      return failed(STORAGE_UPLOAD_FAILED_CODE, err.message)
    }
    throw err
  }

  try {
    const asset = await apiJson<Asset>(
      `${AUDIO_URL}/finalize`,
      'Upload failed',
      {
        method: 'POST',
        body: { asset_id: assetId },
      },
    )
    return {
      filename: file.name,
      status: 'created',
      asset_id: asset.id,
      asset,
    }
  } catch (err) {
    if (err instanceof ApiError) {
      void discard(assetId)
      return failed(audioCode(err), err.message)
    }
    throw err
  }
}

/**
 * The upload code for an audio endpoint's refusal. Unlike `/upload`, these
 * answer with a status and `{error}` rather than a coded result, so the status
 * is what says which it was.
 */
function audioCode(err: ApiError): string | undefined {
  if (err.code) return err.code
  switch (err.status) {
    // `entitlement_exceeded` — the asset count at presign, storage at finalize.
    case 402:
      return 'quota_exceeded'
    // "over the 5 GiB cap", measured against the stored object.
    case 413:
      return 'too_large'
    // Audio ingestion isn't configured on this deployment.
    case 409:
      return 'service_unavailable'
    default:
      return undefined
  }
}

/** Best-effort: an orphan that outlives this is a row somebody can delete. */
function discard(assetId: string): Promise<void> {
  return deleteAsset(assetId).catch(() => {})
}
