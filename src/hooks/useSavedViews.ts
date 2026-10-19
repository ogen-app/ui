import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { viewerTimeZone } from '@/lib/assetFilter'
import {
  createSavedView,
  deleteSavedView,
  listSavedViews,
  updateSavedView,
  type SavedView,
  type SavedViewSurface,
} from '@/services/api/savedViews'
import { ASSET_LIST_KEY } from './useContent'

/**
 * A list's smart groups (CON-388 §5, CON-392): `/api/saved-views` for one
 * surface, each with the count its menu shows.
 *
 * Each surface's key sits under its own list's, on purpose: a group's count
 * is a count of that list's rows, so every write and every event that
 * refreshes the list refreshes the counts beside it too. Ideas' is under
 * `['ideas']`; Assets' under the asset list's key (`ASSET_LIST_KEY`), which
 * every asset write and analysis event already invalidates. A shared group's
 * own changes arrive as `saved_view.*` on `entity:saved_views:<surface>`
 * (`lib/eventRouting`).
 */
export const IDEA_VIEWS_KEY = ['ideas', 'savedViews'] as const
export const ASSET_VIEWS_KEY = [...ASSET_LIST_KEY, 'savedViews'] as const

const SURFACES = {
  ideas: { key: IDEA_VIEWS_KEY, counts: ['undecided'] },
  assets: { key: ASSET_VIEWS_KEY, counts: ['total'] },
} as const satisfies Record<
  SavedViewSurface,
  { key: readonly unknown[]; counts: readonly string[] }
>

export function useSavedViews(
  surface: SavedViewSurface,
  { enabled = true }: { enabled?: boolean } = {},
) {
  const [timeZone] = useState(viewerTimeZone)
  const { key, counts } = SURFACES[surface]
  return useQuery({
    enabled,
    queryKey: key,
    queryFn: () => listSavedViews(surface, { counts: [...counts], timeZone }),
    staleTime: 30_000,
  })
}

/** Saving, renaming, sharing and deleting groups. Each refreshes the menu. */
export function useSavedViewWriter(surface: SavedViewSurface) {
  const qc = useQueryClient()
  const { key } = SURFACES[surface]
  const settle = () => qc.invalidateQueries({ queryKey: key })

  const create = useMutation({
    mutationFn: (fields: { name: string; query: string; shared: boolean }) =>
      createSavedView({ surface, ...fields }),
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
    // Out of the menu at once; a failure puts it back on the refetch.
    onMutate: (id) =>
      qc.setQueryData<SavedView[]>(key, (views) =>
        views?.filter((v) => v.id !== id),
      ),
    onSettled: settle,
  })
  return { create, update, remove }
}
