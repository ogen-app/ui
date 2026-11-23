import { createContext, useContext } from 'react'

/**
 * Opens a spreadsheet's Source card on the rows something cited (CON-366
 * §5.4) — the sheet counterpart of `useAudioSeek`. An idea's
 * `Pipeline · rows 10–24` chip calls it; the page selects the sheet, scrolls
 * to the range and highlights it.
 */
export type SheetCite = {
  /**
   * `label` is the chunk label as cited; `by` names what cited it, and
   * `from` is the control pressed, for the way back to it.
   */
  cite: (label: string, by: string, from?: HTMLElement) => void
}

export const SheetCiteContext = createContext<SheetCite | null>(null)

/** The page's sheet view, or null on a page that has none. */
export function useSheetCite(): SheetCite | null {
  return useContext(SheetCiteContext)
}
