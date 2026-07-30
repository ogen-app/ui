import { useCallback } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  getAutoPublishAllowlist,
  setAutoPublishAllowlist,
} from '@/services/api/autoPublish'

export const AUTO_PUBLISH_ALLOWLIST_KEY = ['auto-publish-allowlist'] as const

export function useAutoPublishAllowlist() {
  return useQuery({
    queryKey: AUTO_PUBLISH_ALLOWLIST_KEY,
    queryFn: getAutoPublishAllowlist,
    staleTime: Infinity,
  })
}

/**
 * Adds or removes one platform from the workspace allowlist.
 *
 * The endpoint replaces the whole list, so a single toggle has to send every
 * other platform back with it. That read-modify-write is why the current list
 * is taken from the query cache at call time rather than captured earlier: two
 * toggles in quick succession would otherwise have the second one resurrect
 * the state the first just changed.
 */
export function useToggleAutoPublish() {
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: setAutoPublishAllowlist,
    onSuccess: (platforms) =>
      queryClient.setQueryData(AUTO_PUBLISH_ALLOWLIST_KEY, platforms),
    // A rejected write leaves the cache showing the server's last known list,
    // so the switch springs back rather than lying about what is allowed.
    onError: () =>
      queryClient.invalidateQueries({ queryKey: AUTO_PUBLISH_ALLOWLIST_KEY }),
  })

  const { mutateAsync } = mutation
  const toggle = useCallback(
    (zernioId: string, allowed: boolean) => {
      const current =
        queryClient.getQueryData<string[]>(AUTO_PUBLISH_ALLOWLIST_KEY) ?? []
      const next = allowed
        ? Array.from(new Set([...current, zernioId]))
        : current.filter((id) => id !== zernioId)
      return mutateAsync(next)
    },
    [mutateAsync, queryClient],
  )

  return { toggle, isPending: mutation.isPending }
}
