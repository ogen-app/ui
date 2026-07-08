import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createPostVersion,
  listPostVersions,
  restorePostVersion,
} from '@/services/api/posts'
import { postKey } from '@/hooks/usePost'
import { markPostContentReplaced } from '@/stores/postContentRevisionStore'
import type { PostVersion } from '@/types/posts'

// Own namespace (not under postKey): usePost invalidates the post entry on
// every autosave settle, and prefix-matching would drag the version list
// along with each keystroke burst.
export const postVersionsKey = (postId: string) =>
  ['post-versions', postId] as const

// Stable reference so TanStack Query memoizes the result instead of
// re-sorting on every render.
const newestFirst = (versions: PostVersion[]) =>
  [...versions].sort((a, b) => b.version_number - a.version_number)

/** Version history for a post, newest first. */
export function usePostVersions(postId: string) {
  return useQuery({
    queryKey: postVersionsKey(postId),
    queryFn: () => listPostVersions(postId),
    select: newestFirst,
  })
}

export function useCreatePostVersion(postId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (note: string) => createPostVersion(postId, note),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: postVersionsKey(postId) })
    },
  })
}

export function useRestorePostVersion(postId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (versionNumber: number) => restorePostVersion(postId, versionNumber),
    onSuccess: (result) => {
      // The response carries the fully hydrated restored post; seed the cache
      // before signalling the editor to remount and re-read it.
      qc.setQueryData(postKey(postId), result.post)
      qc.invalidateQueries({ queryKey: postVersionsKey(postId) })
      markPostContentReplaced(postId)
    },
  })
}
