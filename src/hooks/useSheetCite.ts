import { createContext, useContext } from 'react'

/**
 * Opens a spreadsheet's Source tab on the rows something cited (CON-366
 * §5.4) — the sheet counterpart of `useAudioSeek`. An idea's
 * `Pipeline · rows 10–24` chip calls it; the page switches tab, selects the
 * sheet and highlights the range.
 */
export type SheetCite = {
  /** `label` is the chunk label as cited; `by` names what cited it. */
  cite: (label: string, by: string) => void
}

export const SheetCiteContext = createContext<SheetCite | null>(null)

/** The page's sheet view, or null on a page that has none. */
export function useSheetCite(): SheetCite | null {
  return useContext(SheetCiteContext)
}
