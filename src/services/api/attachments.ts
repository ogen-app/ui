import type {
  AttachmentListResponse,
  PostAttachmentWithValidation,
} from '@/types/attachments'
import { apiUrl } from './base'
import { apiJson, apiVoid } from './http'

const base = (postId: string) => `/api/posts/${postId}/attachments`

export function listAttachments(postId: string): Promise<AttachmentListResponse> {
  return apiJson<AttachmentListResponse>(base(postId), 'Unable to fetch attachments')
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

export function deleteAttachment(postId: string, attachmentId: string): Promise<void> {
  return apiVoid(`${base(postId)}/${attachmentId}`, 'Unable to delete attachment', {
    method: 'DELETE',
  })
}
