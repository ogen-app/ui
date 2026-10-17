import { apiJson, apiVoid } from './http'

/**
 * Saved views — smart groups — of any filterable list (CON-389, ogen#225).
 *
 * A view is a **named address**, never a list of rows: the list's own query
 * string, which the server validates with that list's parser and stores in
 * canonical form (keys sorted, values sorted and comma-joined), dropping what
 * only pages or displays (`cursor`, `limit`, `facets`, `tz`, and for Ideas the
 * `pile`). So a view keeps working — matching nothing for that value — after a
 * document or campaign it names is gone.
 *
 *     GET    /api/saved-views?surface=ideas&counts=total,undecided&tz=…
 *     POST   /api/saved-views        {surface, name, query, shared}
 *     PATCH  /api/saved-views/:id    {name?, query?, shared?}   presence-aware
 *     DELETE /api/saved-views/:id    204
 *
 * The list is the caller's own views plus every shared one, newest first.
 * `can_edit` says whether the caller may change one: its creator, or an owner
 * when it is shared or its creator has left. `valid: false` is a stored query
 * that no longer parses (a retired parameter), and it carries no counts. A bad
 * query on a write is 400 `invalid_query` naming the `param`; a name is 1–80
 * characters. Shared views announce `saved_view.created|updated|deleted` on
 * `entity:saved_views:<surface>`.
 */

export type SavedViewSurface = 'ideas'

export type SavedView = {
  id: string
  surface: SavedViewSurface
  name: string
  /** The canonical query string, in the list's own parameter names. */
  query: string
  shared: boolean
  createdBy: string | null
  createdAt: string
  valid: boolean
  canEdit: boolean
  /** The counts asked for, by name; absent on an invalid view. */
  counts: Record<string, number>
}

type SavedViewBody = {
  id: string
  surface: SavedViewSurface
  name: string
  query: string
  shared: boolean
  created_by: string | null
  created_at: string
  valid: boolean
  can_edit: boolean
  counts?: Record<string, number>
}

/** The longest name the server takes. */
export const SAVED_VIEW_NAME_MAX = 80

function fromWire(body: SavedViewBody): SavedView {
  return {
    id: body.id,
    surface: body.surface,
    name: body.name,
    query: body.query,
    shared: body.shared,
    createdBy: body.created_by,
    createdAt: body.created_at,
    valid: body.valid,
    canEdit: body.can_edit,
    counts: body.counts ?? {},
  }
}

export async function listSavedViews(
  surface: SavedViewSurface,
  { counts, timeZone }: { counts: string[]; timeZone: string },
): Promise<SavedView[]> {
  const query = new URLSearchParams({
    surface,
    counts: counts.join(','),
    tz: timeZone,
  })
  const { views } = await apiJson<{ views: SavedViewBody[] | null }>(
    `/api/saved-views?${query}`,
    'Unable to load the smart groups',
  )
  return (views ?? []).map(fromWire)
}

export async function createSavedView(fields: {
  surface: SavedViewSurface
  name: string
  query: string
  shared: boolean
}): Promise<SavedView> {
  return fromWire(
    await apiJson<SavedViewBody>(
      '/api/saved-views',
      'Unable to save the group',
      { method: 'POST', body: fields },
    ),
  )
}

/** Sends only what is changing: the PATCH leaves an omitted field alone. */
export async function updateSavedView(
  id: string,
  change: { name?: string; query?: string; shared?: boolean },
): Promise<SavedView> {
  return fromWire(
    await apiJson<SavedViewBody>(
      `/api/saved-views/${id}`,
      'Unable to save the group',
      { method: 'PATCH', body: change },
    ),
  )
}

export async function deleteSavedView(id: string): Promise<void> {
  await apiVoid(`/api/saved-views/${id}`, 'Unable to delete the group', {
    method: 'DELETE',
  })
}
