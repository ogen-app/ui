import { useCallback, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  deleteAttachment,
  listAttachments,
  reorderAttachment,
  uploadAttachment,
  uploadVideoAttachment,
} from '@/services/api/attachments'
import { postKey } from '@/hooks/usePost'
import {
  attachmentKind,
  type AttachmentListResponse,
  type PostAttachmentWithValidation,
} from '@/types/attachments'

/**
 * Attachments are their own resource, not part of the post document, so
 * they live under their own key rather than inside `["post", id]` — the
 * post's debounced autosave PUTs the whole doc back and would otherwise
 * race the attachment mutations.
 */
export const postAttachmentsKey = (postId: string) =>
  [...postKey(postId), 'attachments'] as const

/**
 * Presigned GET URLs expire 15 minutes after the response is built
 * (`PresignedURLTTL` in the Go handler). Refetch comfortably inside that
 * window so images in a long editing session never start 403-ing.
 */
const PRESIGN_REFRESH_MS = 10 * 60 * 1000

export type PendingUpload = {
  // Local id — the server one doesn't exist until the upload lands.
  key: string
  name: string
  percent: number
  error?: string
}

export function usePostAttachments(postId: string) {
  const qc = useQueryClient()
  const [pending, setPending] = useState<PendingUpload[]>([])

  const query = useQuery({
    queryKey: postAttachmentsKey(postId),
    queryFn: () => listAttachments(postId),
    enabled: !!postId,
    refetchInterval: PRESIGN_REFRESH_MS,
    refetchIntervalInBackground: false,
  })

  const invalidate = useCallback(() => {
    void qc.invalidateQueries({ queryKey: postAttachmentsKey(postId) })
  }, [qc, postId])

  /**
   * Uploads sequentially: `CreateAtNextPosition` assigns positions on the
   * server, so parallel uploads would land in arrival order rather than the
   * order the user picked the files in.
   */
  const upload = useCallback(
    async (files: File[]): Promise<{ uploaded: number; errors: string[] }> => {
      const errors: string[] = []
      let uploaded = 0
      for (const [i, file] of files.entries()) {
        const key = `${Date.now()}-${i}-${file.name}`
        setPending((p) => [...p, { key, name: file.name, percent: 0 }])
        try {
          // Video never passes through the API process — it goes presign →
          // direct PUT → finalize (CON-148). Everything else posts the bytes
          // to the upload endpoint as before.
          const send =
            attachmentKind(file.type) === 'video' ? uploadVideoAttachment : uploadAttachment
          await send(postId, file, {
            onProgress: (percent) =>
              setPending((p) => p.map((u) => (u.key === key ? { ...u, percent } : u))),
          })
          uploaded += 1
        } catch (err) {
          errors.push(err instanceof Error ? err.message : `Unable to upload ${file.name}`)
        } finally {
          setPending((p) => p.filter((u) => u.key !== key))
        }
      }
      invalidate()
      return { uploaded, errors }
    },
    [postId, invalidate],
  )

  const remove = useMutation({
    // The user's word for it, and for the thing on screen — the API calls
    // this deleting an attachment.
    meta: { errorTitle: 'Unable to remove file' },
    mutationFn: (attachmentId: string) => deleteAttachment(postId, attachmentId),
    onSuccess: invalidate,
  })

  /**
   * Applies a whole new order.
   *
   * `post_attachments` has a `UNIQUE (post_id, position)` constraint and the
   * server updates one row at a time with no swap or re-pack, so renumbering
   * into 0..n-1 collides the moment a target position is still held by a
   * sibling — the API answers 500 (23505) and the move is lost.
   *
   * Renumbering into a fresh block above the current maximum sidesteps it:
   * every write lands on a position nobody holds, in any order, with no
   * temporary parking pass. Positions only have to be increasing (the list
   * endpoint sorts by them), never contiguous, and the list is capped at a
   * couple of dozen files, so the drift is harmless.
   *
   * FOLLOW-UP: a transactional bulk-reorder endpoint would make this one
   * atomic request instead of n — see CON-124.
   */
  const reorder = useMutation({
    // "media" rather than the API's "attachment": this is the drag-and-drop
    // list, and the user is looking at their files.
    meta: { errorTitle: 'Unable to reorder media' },
    mutationFn: async (ordered: PostAttachmentWithValidation[]) => {
      const base = Math.max(-1, ...ordered.map((a) => a.position)) + 1
      for (const [index, att] of ordered.entries()) {
        await reorderAttachment(postId, att.id, base + index)
      }
    },
    onMutate: async (ordered) => {
      await qc.cancelQueries({ queryKey: postAttachmentsKey(postId) })
      const previous = qc.getQueryData<AttachmentListResponse>(postAttachmentsKey(postId))
      if (previous) {
        // Mirror the numbering the mutation writes, so a second drag landing
        // before the refetch computes its block from the same base.
        const base = Math.max(-1, ...ordered.map((a) => a.position)) + 1
        qc.setQueryData<AttachmentListResponse>(postAttachmentsKey(postId), {
          ...previous,
          attachments: ordered.map((a, index) => ({ ...a, position: base + index })),
        })
      }
      return { previous }
    },
    // The rollback only; the toast comes from `meta.errorTitle` above.
    onError: (_err, _ordered, ctx) => {
      if (ctx?.previous) {
        qc.setQueryData(postAttachmentsKey(postId), ctx.previous)
      }
    },
    onSettled: invalidate,
  })

  return {
    attachments: query.data?.attachments ?? [],
    /** Post-level rule failures (count cap, image+PDF mix). */
    postValidation: query.data?.platform_validation ?? [],
    loading: query.isLoading,
    error: query.error ?? undefined,
    pending,
    upload,
    remove: remove.mutateAsync,
    removing: remove.isPending,
    reorder: reorder.mutate,
    reordering: reorder.isPending,
  }
}
