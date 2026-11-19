/**
 * The calendar's drawer: its settings and its unscheduled posts, one at a
 * time, beside the grid and under the bar over the page.
 *
 * They used to be panels of the right rail, where opening one put the
 * assistant away. They are about the grid in front of you and the assistant is
 * about the work, so they sit apart and either can be open with the other.
 */
export type CalendarDrawer = 'calendarSettings' | 'notScheduled'

const DRAWERS: readonly CalendarDrawer[] = ['calendarSettings', 'notScheduled']

/** Rehydration's check: a stored value this build no longer has opens nothing. */
export function isCalendarDrawer(value: unknown): value is CalendarDrawer {
  return DRAWERS.includes(value as CalendarDrawer)
}
