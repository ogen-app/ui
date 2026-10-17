import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { viewerTimeZone } from '@/lib/assetFilter'
import {
  createSavedView,
  deleteSavedView,
  listSavedViews,
  updateSavedView,
  type SavedView,
} from '@/services/api/savedViews'

/**
 * The Ideas page's smart groups (CON-388 §5): `/api/saved-views` for the
 * `ideas` surface, each with its undecided count.
 *
 * Keyed under `['ideas']` on purpose: a group's count is a count of ideas, so
 * every write and every `ideas.*` event that refreshes the lists refreshes the
 * counts beside them too. A shared group's own changes arrive as
 * `saved_view.*` on `entity:saved_views:ideas` (`lib/eventRouting`).
 */
export const IDEA_VIEWS_KEY = ['ideas', 'savedViews'] as const

export function useIdeaViews({ enabled = true }: { enabled?: boolean } = {}) {
  const [timeZone] = useState(viewerTimeZone)
  return useQuery({
    enabled,
    queryKey: IDEA_VIEWS_KEY,
    queryFn: () => listSavedViews('ideas', { counts: ['undecided'], timeZone }),
    staleTime: 30_000,
  })
}

/** Saving, renaming, sharing and deleting groups. Each refreshes the panel. */
export function useIdeaViewWriter() {
  const qc = useQueryClient()
  const settle = () => qc.invalidateQueries({ queryKey: IDEA_VIEWS_KEY })

  const create = useMutation({
    mutationFn: (fields: { name: string; query: string; shared: boolean }) =>
      createSavedView({ surface: 'ideas', ...fields }),
    onSettled: settle,
  })
  const update = useMutation({
    mutationFn: ({
      id,
      ...change
    }: {
      id: string
      name?: string
      query?: string
      shared?: boolean
    }) => updateSavedView(id, change),
    onSettled: settle,
  })
  const remove = useMutation({
    mutationFn: (id: string) => deleteSavedView(id),
    // Out of the panel at once; a failure puts it back on the refetch.
    onMutate: (id) =>
      qc.setQueryData<SavedView[]>(IDEA_VIEWS_KEY, (views) =>
        views?.filter((v) => v.id !== id),
      ),
    onSettled: settle,
  })
  return { create, update, remove }
}
