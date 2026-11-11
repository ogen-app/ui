import { useCallback, useMemo, useState } from 'react'
import {
  useAssistantPage,
  useAssistantRequest,
} from '@/hooks/useAssistantContext'

/** The Foundation libraries a selection can be made on (CON-472). */
export type LibraryKind = 'voice' | 'audience' | 'fact' | 'series'

/** What a library's entries need to draw their tick. */
export type LibrarySelection = {
  ticked: ReadonlySet<string>
  toggle: (id: string) => void
  clear: () => void
}

/**
 * The entries ticked in one Foundation library — voices, audiences, facts or
 * series (CON-472). By hand, or by the assistant's `select`; either way the
 * selection goes out with the next message, which is what it is for: these
 * libraries are short and have no bulk verbs, so a selection is something to
 * ask about ("do these two overlap?"), and the bar only clears it.
 *
 * Held against the entries on screen, so an id whose entry has gone is never
 * sent or counted.
 */
export function useLibrarySelection(
  kind: LibraryKind,
  ids: readonly string[],
): LibrarySelection {
  const [chosen, setChosen] = useState<ReadonlySet<string>>(new Set())
  const ticked = useMemo(
    () => new Set(ids.filter((id) => chosen.has(id))) as ReadonlySet<string>,
    [ids, chosen],
  )
  const toggle = useCallback(
    (id: string) =>
      setChosen((prev) => {
        const next = new Set(prev)
        if (!next.delete(id)) next.add(id)
        return next
      }),
    [],
  )
  const clear = useCallback(() => setChosen(new Set()), [])

  useAssistantRequest((action) => {
    if (action.type !== 'select' || action.selection?.kind !== kind)
      return false
    setChosen(new Set(action.selection.ids))
    return true
  })
  useAssistantPage(
    useMemo(
      () =>
        ticked.size > 0
          ? { selection: { kind, ids: [...ticked], count: ticked.size } }
          : null,
      [kind, ticked],
    ),
  )

  return useMemo(() => ({ ticked, toggle, clear }), [ticked, toggle, clear])
}
