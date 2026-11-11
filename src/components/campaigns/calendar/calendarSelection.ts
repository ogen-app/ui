import { createContext, useContext } from 'react'

/**
 * The posts ticked on a campaign's calendar (CON-472) — by hand, with a
 * card's corner box, or by the assistant's `select`. Held by the calendar
 * route and read by each `PostCard` through context, so the grids in between
 * pass nothing along. Absent outside a calendar that offers ticking (the Not
 * scheduled panel, the workspace calendar), where a card is only a link.
 */
export type CalendarSelection = {
  ticked: ReadonlySet<string>
  toggle: (postId: string) => void
}

export const CalendarSelectionContext = createContext<CalendarSelection | null>(
  null,
)

export function useCalendarSelection(): CalendarSelection | null {
  return useContext(CalendarSelectionContext)
}
