import { useCallback } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createPostVersion,
  deletePostVersion,
  listPostVersions,
  restorePost,
  type PostVersion,
} from '@/services/api/posts'
import { postKey } from '@/hooks/usePost'
import { flushPendingSave } from '@/lib/pendingSaves'
import { invalidateCampaignPosts } from '@/lib/postCache'
import { postVersionsKey } from '@/lib/queryKeys'
import { toast } from '@/stores/toastStore'

export { postVersionsKey }

type UsePostVersionsResult = {
  /** Newest first — the reverse of what the API returns. */
  versions: PostVersion[]
  loading: boolean
  error: Error | null

  /** Snapshots the current text. Resolves once the list has the new version. */
  save: (note: string) => Promise<void>
  saving: boolean

  /** Rolls the content back to `versionNumber`, as a new version on top. */
  restore: (versionNumber: number) => Promise<void>
  restoring: boolean

  /** Discards a snapshot. Leaves the post's content alone. */
  remove: (version: PostVersion) => Promise<void>
  removing: boolean
}

/**
 * A post's saved versions, and the two things you can do to them.
 *
 * Both writes flush the editor's pending autosave first. The editor debounces
 * by 600ms, and the server snapshots and restores against its *stored* copy —
 * so without the flush, saving a version would capture the text as it was
 * before the last few keystrokes, and restoring would let a queued PUT land
 * afterwards and overwrite the restored content with pre-restore edits.
 */
export function usePostVersions(postId: string): UsePostVersionsResult {
  const qc = useQueryClient()

  const query = useQuery({
    queryKey: postVersionsKey(postId),
    queryFn: () => listPostVersions(postId),
    enabled: !!postId,
    // Newest first: the list is read top-down as "what happened recently",
    // and the current version is the one people look for.
    select: (rows) => [...rows].reverse(),
  })

  const saveMutation = useMutation({
    meta: { errorTitle: 'Unable to save a version' },
    mutationFn: async (note: string) => {
      await flushPendingSave(postId)
      return createPostVersion(postId, note)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: postVersionsKey(postId) }),
  })

  const restoreMutation = useMutation({
    meta: { errorTitle: 'Unable to restore the version' },
    mutationFn: async (versionNumber: number) => {
      await flushPendingSave(postId)
      return restorePost(postId, versionNumber)
    },
    onSuccess: (post) => {
      // The response is the hydrated post, so the editor can take it directly
      // rather than refetching what we already hold.
      qc.setQueryData(postKey(postId), post)
      // The restore itself added a version, and auto-saved one before it if
      // there were unsnapshotted edits — so the list is two behind, not one.
      void qc.invalidateQueries({ queryKey: postVersionsKey(postId) })
      // New content is new readiness: the calendar, the overview roll-up and
      // the Campaigns-list summaries are all computed from it.
      invalidateCampaignPosts(qc, post.campaign_id)
    },
  })

  const removeMutation = useMutation({
    meta: { errorTitle: 'Unable to delete the version' },
    mutationFn: (version: PostVersion) => deletePostVersion(postId, version.id),
    onSuccess: () => qc.invalidateQueries({ queryKey: postVersionsKey(postId) }),
  })

  const { mutateAsync: saveVersion } = saveMutation
  const save = useCallback(
    async (note: string) => {
      await saveVersion(note)
      toast.success('Version saved')
    },
    [saveVersion],
  )

  const { mutateAsync: restoreVersion } = restoreMutation
  const restore = useCallback(
    async (versionNumber: number) => {
      await restoreVersion(versionNumber)
      toast.success(`Restored version ${versionNumber}`, {
        description: 'Saved as a new version — the earlier ones are still here.',
      })
    },
    [restoreVersion],
  )

  const { mutateAsync: removeVersion } = removeMutation
  const remove = useCallback(
    async (version: PostVersion) => {
      await removeVersion(version)
      toast.success(`Version ${version.version_number} deleted`)
    },
    [removeVersion],
  )

  return {
    versions: query.data ?? [],
    loading: query.isPending,
    error: query.error,
    save,
    saving: saveMutation.isPending,
    restore,
    restoring: restoreMutation.isPending,
    remove,
    removing: removeMutation.isPending,
  }
}
