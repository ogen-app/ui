import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createPostVersion,
  listPostVersions,
  restorePostVersion,
} from '@/services/api/posts'
import { postKey } from '@/hooks/usePost'

// Own namespace (not under postKey): usePost invalidates the post entry on
// every autosave settle, and prefix-matching would drag the version list
// along with each keystroke burst.
export const postVersionsKey = (postId: string) =>
  ['post-versions', postId] as const

/** Version history for a post, newest first. */
export function usePostVersions(postId: string) {
  return useQuery({
    queryKey: postVersionsKey(postId),
    queryFn: () => listPostVersions(postId),
    select: (versions) =>
      [...versions].sort((a, b) => b.version_number - a.version_number),
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
      // The response carries the fully hydrated restored post.
      qc.setQueryData(postKey(postId), result.post)
      qc.invalidateQueries({ queryKey: postVersionsKey(postId) })
    },
  })
}
