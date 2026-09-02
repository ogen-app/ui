import type {
  AttachmentListResponse,
  PostAttachmentWithValidation,
} from '@/types/attachments'
import { apiUrl, workspaceHeader } from './base'
import { apiJson, apiVoid } from './http'

const base = (postId: string) => `/api/posts/${postId}/attachments`

export function listAttachments(
  postId: string,
): Promise<AttachmentListResponse> {
  return apiJson<AttachmentListResponse>(
    base(postId),
    'Unable to fetch attachments',
  )
}

type UploadOptions = {
  onProgress?: (percent: number) => void
  signal?: AbortSignal
}

/**
 * Uploads one image or PDF under the `file` field. Uses XMLHttpRequest, not
 * fetch, so transfer progress can be reported (same reason as
 * `services/api/uploads.ts`). The server sniffs the real MIME — the `accept`
 * attribute and our client-side checks are convenience only.
 */
export function uploadAttachment(
  postId: string,
  file: File,
  opts: UploadOptions = {},
): Promise<PostAttachmentWithValidation> {
  return new Promise((resolve, reject) => {
    const form = new FormData()
    form.append('file', file)

    const xhr = new XMLHttpRequest()
    xhr.open('POST', apiUrl(base(postId)), true)
    xhr.withCredentials = true
    xhr.responseType = 'json'
    // Same workspace as the post it attaches to (CON-147). After `open`,
    // which is the only place `setRequestHeader` may be called.
    for (const [key, value] of Object.entries(workspaceHeader(base(postId)))) {
      xhr.setRequestHeader(key, value)
    }
    // A stalled connection fires none of onload/onerror/onabort, and an
    // unsettled promise leaves the pending tile stuck forever. Generous on
    // purpose: this bounds the whole request, and a legitimate large upload
    // on a slow link is slow, not stuck.
    xhr.timeout = 5 * 60_000

    if (opts.onProgress) {
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          opts.onProgress?.(Math.round((e.loaded / e.total) * 100))
        }
      }
    }

    xhr.onload = () => {
      const body = xhr.response as
        | (PostAttachmentWithValidation & { error?: string })
        | null
      if (xhr.status < 200 || xhr.status >= 300) {
        reject(new Error(body?.error || `Unable to upload ${file.name}`))
        return
      }
      if (!body?.id) {
        reject(new Error('Server returned no attachment'))
        return
      }
      resolve(body)
    }

    xhr.onerror = () => reject(new Error('Network error during upload'))
    xhr.onabort = () => reject(new DOMException('Upload aborted', 'AbortError'))
    xhr.ontimeout = () => reject(new Error(`Upload of ${file.name} timed out`))

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

type PresignedUpload = {
  upload_url: string
  s3_key: string
  /** Seconds the PUT URL stays valid — 30 minutes at the time of writing. */
  expires_in: number
}

/**
 * Uploads one video (CON-148). Three steps, because video does not go through
 * the API process at all:
 *
 *   1. `presign`  — declare the file; get a short-lived PUT URL and the key.
 *   2. PUT        — the bytes go straight to object storage.
 *   3. `finalize` — the server heads the object, probes it via video-service,
 *                   validates it and persists the attachment row.
 *
 * The response of step 3 is the same `attachmentResponse` an image upload
 * returns, so callers can treat the two interchangeably once it lands.
 *
 * Progress is reported against the PUT alone: it is the only step that moves
 * real bytes, and presign/finalize are single round-trips.
 */
export async function uploadVideoAttachment(
  postId: string,
  file: File,
  opts: UploadOptions = {},
): Promise<PostAttachmentWithValidation> {
  const presigned = await apiJson<PresignedUpload>(
    `${base(postId)}/presign`,
    `Unable to start the upload of ${file.name}`,
    {
      method: 'POST',
      body: {
        filename: file.name,
        content_type: file.type,
        size_bytes: file.size,
      },
    },
  )

  await putToStorage(presigned.upload_url, file, opts)

  // No alt_text: the media card has no field for it on upload, and the
  // attachment PATCH is where it gets set. Sending '' matches the image path.
  return apiJson<PostAttachmentWithValidation>(
    `${base(postId)}/finalize`,
    `Unable to finalize ${file.name}`,
    { method: 'POST', body: { s3_key: presigned.s3_key, alt_text: '' } },
  )
}

/**
 * PUTs the file to the presigned storage URL. XHR again for progress, and
 * `withCredentials` stays off on purpose — the URL carries its own signature,
 * and sending cookies to the storage origin both breaks the signature on some
 * providers and needs a CORS `Allow-Credentials` we should not require.
 *
 * The Content-Type must match what presign was told: it is part of what the
 * signature covers.
 */
function putToStorage(
  url: string,
  file: File,
  opts: UploadOptions,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('PUT', url, true)
    if (file.type) xhr.setRequestHeader('Content-Type', file.type)
    // No timeout: this is the one request that can legitimately run for many
    // minutes on a slow link, and the presigned URL's own expiry already
    // bounds it. `signal` remains the way to give up.

    if (opts.onProgress) {
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          opts.onProgress?.(Math.round((e.loaded / e.total) * 100))
        }
      }
    }

    xhr.onload = () => {
      if (xhr.status < 200 || xhr.status >= 300) {
        // The body is storage-provider XML, not our error envelope; surfacing
        // it verbatim would be noise.
        reject(
          new Error(
            `Storage rejected the upload of ${file.name} (${xhr.status})`,
          ),
        )
        return
      }
      resolve()
    }
    xhr.onerror = () =>
      reject(
        new Error(
          `Network error uploading ${file.name}. If this persists, the storage bucket may not allow uploads from this origin.`,
        ),
      )
    xhr.onabort = () => reject(new DOMException('Upload aborted', 'AbortError'))

    if (opts.signal) {
      if (opts.signal.aborted) {
        xhr.abort()
        return
      }
      opts.signal.addEventListener('abort', () => xhr.abort(), { once: true })
    }

    xhr.send(file)
  })
}

/**
 * Sets one attachment's `position`. The server writes the value verbatim —
 * it neither swaps nor re-packs the siblings (`UpdatePosition` in
 * `src/repository/post_attachments.go`) — and `post_attachments` carries a
 * `UNIQUE (post_id, position)` constraint, so writing a position a sibling
 * already holds fails with a 500 (SQLSTATE 23505).
 *
 * The caller therefore owns the whole ordering AND must keep it collision-
 * free at every step: renumber the list into a block above the current max
 * rather than into 0..n-1. See `usePostAttachments.reorder`.
 */
export function reorderAttachment(
  postId: string,
  attachmentId: string,
  position: number,
): Promise<PostAttachmentWithValidation> {
  return apiJson<PostAttachmentWithValidation>(
    `${base(postId)}/${attachmentId}`,
    'Unable to reorder attachment',
    { method: 'PATCH', body: { position } },
  )
}

export function deleteAttachment(
  postId: string,
  attachmentId: string,
): Promise<void> {
  return apiVoid(
    `${base(postId)}/${attachmentId}`,
    'Unable to delete attachment',
    {
      method: 'DELETE',
    },
  )
}
