import { useEffect, useMemo, useRef } from 'react'
import { useRouterState } from '@tanstack/react-router'
import {
  listFilter,
  locationFor,
  type ViewEntityKind,
  type ViewPage,
} from '@/lib/viewContext'
import { useViewContextStore } from '@/stores/viewContextStore'
import type { UIAction } from '@/lib/assistantUiActions'

/**
 * Keeps the view context's location in step with the router: the deepest
 * matched route names the screen, and a detail screen's param its focus.
 * Mounted once, in the authenticated layout.
 */
export function useViewLocation() {
  const match = useRouterState({
    select: (s) => {
      const last = s.matches[s.matches.length - 1]
      return last
        ? {
            fullPath: last.fullPath as string,
            params: last.params as Record<string, string>,
          }
        : null
    },
    structuralSharing: true,
  })
  const setLocation = useViewContextStore((s) => s.setLocation)
  const key = match ? `${match.fullPath}|${JSON.stringify(match.params)}` : ''

  useEffect(() => {
    setLocation(
      match ? locationFor(match.fullPath, match.params) : { screen: null },
    )
    // `key` stands for `match`, which is a new object on every router tick.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, setLocation])
}

/**
 * Registers what this screen adds to the next assistant turn — its selection,
 * filter, window. Pass `null` while there is nothing to say. The page is
 * withdrawn when the screen unmounts, and only by this screen: a successor that
 * registered first keeps its own.
 */
export function useAssistantPage(page: ViewPage | null) {
  const registerPage = useViewContextStore((s) => s.registerPage)
  const updatePage = useViewContextStore((s) => s.updatePage)
  const clearPage = useViewContextStore((s) => s.clearPage)
  const token = useRef<number | null>(null)
  const serialised = page ? JSON.stringify(page) : null

  useEffect(() => {
    if (serialised === null) {
      if (token.current !== null) clearPage(token.current)
      token.current = null
      return
    }
    const next = JSON.parse(serialised) as ViewPage
    if (token.current === null) token.current = registerPage(next)
    else updatePage(token.current, next)
  }, [serialised, registerPage, updatePage, clearPage])

  useEffect(
    () => () => {
      if (token.current !== null) clearPage(token.current)
      token.current = null
    },
    [clearPage],
  )
}

/**
 * A list's page: what is ticked, the filter it is under, the saved view it
 * came from, and the rows on screen. A whole match goes out as the filter, not
 * as ids — the server resolves it with the list endpoint's own parser.
 */
export function useListAssistantPage({
  kind,
  params,
  ticked,
  allMatching,
  total,
  rowIds,
  savedViewId,
}: {
  kind: ViewEntityKind
  /** The list endpoint's query, as the page sends it. */
  params: Record<string, string>
  ticked: ReadonlySet<string>
  allMatching: boolean
  total: number
  rowIds: string[]
  savedViewId?: string
}) {
  const page = useMemo<ViewPage>(() => {
    const out: ViewPage = { filter: listFilter(params) }
    if (params.sort) out.sort = params.sort
    if (savedViewId) out.savedViewId = savedViewId
    if (allMatching) {
      out.selection = { kind, allMatching: true, count: total }
    } else if (ticked.size > 0) {
      out.selection = { kind, ids: [...ticked], count: ticked.size }
    }
    if (rowIds.length > 0) out.visible = { kind, ids: rowIds }
    return out
  }, [kind, params, ticked, allMatching, total, rowIds, savedViewId])
  useAssistantPage(page)
}

/**
 * Picks up what the assistant asked this list to do — tick rows, open a smart
 * group (`viewContextStore.request`). `handle` returns whether it acted; a
 * request it can't act on yet (its smart groups still loading) waits, and is
 * tried again when `ready` changes.
 */
export function useAssistantRequest(
  handle: (action: UIAction) => boolean,
  ready?: unknown,
) {
  const request = useViewContextStore((s) => s.request)
  const consume = useViewContextStore((s) => s.consume)
  const latest = useRef(handle)
  useEffect(() => {
    latest.current = handle
  })
  useEffect(() => {
    if (request && latest.current(request.action)) consume(request.seq)
  }, [request, consume, ready])
}
