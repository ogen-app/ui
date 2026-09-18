import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { listPlatforms } from '@/services/api/platforms'
import {
  buildPlatformViews,
  getPlatformByZernioId,
  type PlatformInfo,
  type PlatformView,
} from '@/lib/platformDictionary'
import type { Platform } from '@/types/campaigns'

export const PLATFORMS_KEY = ['platforms'] as const

export function usePlatforms() {
  return useQuery({
    queryKey: PLATFORMS_KEY,
    queryFn: listPlatforms,
    staleTime: Infinity,
  })
}

/**
 * The workspace's platforms, and the one place a sqid becomes a network.
 *
 * `lib/platformDictionary` is filed under `zernio_id`, because that is the only
 * identifier a build can be written against (CON-292). But most of the app holds
 * a *row* id instead — `post.platform_id`, a campaign's channel ids, an
 * analytics key — and a sqid is minted by the server, so nothing static can
 * translate one. The platform list can, and it is fetched once with an infinite
 * stale time, so this hook is the translation and every caller that starts from
 * a sqid goes through it.
 *
 * Deliberately a hook rather than a module-level index the query populates: the
 * rows are server state, and a mutable global fed by a fetch is the kind of
 * thing that answers differently in a test than in the app.
 */
export type PlatformCatalog = {
  /** Enabled rows, in the operator's order. Empty until the query resolves. */
  rows: Platform[]
  /** The subset this build can render, joined to its display metadata. */
  views: PlatformView[]
  /**
   * Display metadata for a platform named by either identifier it travels
   * under — our row sqid, or Zernio's wire slug. Analytics keys its figures by
   * slug while the editor holds sqids, and a screen that resolves only one ends
   * up drawing a logo for some platforms and a placeholder for the rest of the
   * same table.
   *
   * Undefined for a network this build does not support, and for any sqid while
   * the list is still loading.
   */
  resolve: (idOrSlug: string) => PlatformInfo | undefined
  /** The server's row for a sqid — constraints, publishers, cadence. */
  row: (id: string) => Platform | undefined
  /** The matching view, which is `row` plus what it can publish and render. */
  view: (id: string) => PlatformView | undefined
}

export function usePlatformCatalog(): PlatformCatalog {
  const { data } = usePlatforms()
  return useMemo(() => {
    const rows = data ?? []
    const views = buildPlatformViews(rows)
    const bySqid = new Map(rows.map((p) => [p.id, p]))
    const viewBySqid = new Map(views.map((v) => [v.platform.id, v]))
    return {
      rows,
      views,
      resolve: (idOrSlug) =>
        getPlatformByZernioId(idOrSlug) ??
        getPlatformByZernioId(bySqid.get(idOrSlug)?.zernio_id ?? ''),
      row: (id) => bySqid.get(id),
      view: (id) => viewBySqid.get(id),
    }
  }, [data])
}

export function usePlatformViews(): PlatformView[] {
  return usePlatformCatalog().views
}
