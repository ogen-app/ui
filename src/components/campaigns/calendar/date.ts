import { formatDate } from '@/lib/intl'

// Date helpers for the campaign calendar.
//
// The calendar URL carries a single `anchor` date (YYYY-MM-DD). The visible
// range is *derived* from the anchor + the view granularity — e.g. the `week`
// view shows the Monday→Sunday week that contains the anchor. The anchor is a
// free day (it is NOT normalized to Monday), so switching granularity later
// only means swapping the slug while keeping the same anchor date.

// `firstDay` follows Date#getDay() numbering (0 = Sunday … 6 = Saturday).
export function startOfWeek(date: Date, firstDay = 1): Date {
  const d = new Date(date)
  const diff = (d.getDay() - firstDay + 7) % 7
  d.setDate(d.getDate() - diff)
  d.setHours(0, 0, 0, 0)
  return d
}

export function addDays(date: Date, days: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

// The days a week view shows: the seven days of the anchor's week, minus the
// ones this user hides. Shared by the calendar and its loading skeleton — the
// skeleton's whole job is to hold the shape the real week will take, which it
// can only do if the two derive that shape the same way.
export function visibleWeekDays(
  anchor: Date,
  firstDay: number,
  hiddenDays: number[] = [],
): Date[] {
  const weekStart = startOfWeek(anchor, firstDay)
  return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)).filter(
    (day) => !hiddenDays.includes(day.getDay()),
  )
}

/** Column header, line 1 — e.g. "Monday". */
export function weekdayLabel(day: Date, locale?: string): string {
  return formatDate(day, { weekday: 'long' }, locale)
}

/** Column header for the month grid, where there is no room for "Wednesday". */
export function weekdayShortLabel(day: Date, locale?: string): string {
  return formatDate(day, { weekday: 'short' }, locale)
}

/**
 * Move by whole months, clamping the day to the target month's length: one
 * month on from 31 January is 28 February, not 3 March. Without the clamp,
 * paging forward through a 31-day month skips the short one entirely.
 */
export function addMonths(date: Date, months: number): Date {
  const target = new Date(date.getFullYear(), date.getMonth() + months, 1)
  const lastDay = new Date(
    target.getFullYear(),
    target.getMonth() + 1,
    0,
  ).getDate()
  target.setDate(Math.min(date.getDate(), lastDay))
  target.setHours(0, 0, 0, 0)
  return target
}

export function isSameMonth(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth()
}

/**
 * The month grid: whole weeks, so the first and last rows spill into the
 * neighbouring months rather than starting the month mid-row with blanks.
 * Those spill days are real and get drawn faded — a post scheduled on the 1st
 * is still a post, and a week that stops halfway reads as missing data.
 *
 * Rows vary from 4 (a 28-day February starting on the week's first day) to 6,
 * which is why the grid sizes its rows from the row count rather than fixing
 * their height.
 */
export function monthWeeks(
  anchor: Date,
  firstDay: number,
  hiddenDays: number[] = [],
): Date[][] {
  const monthStart = new Date(anchor.getFullYear(), anchor.getMonth(), 1)
  const monthEnd = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0)
  const gridStart = startOfWeek(monthStart, firstDay)
  const lastRowStart = startOfWeek(monthEnd, firstDay)

  const weeks: Date[][] = []
  for (
    let rowStart = gridStart;
    rowStart.getTime() <= lastRowStart.getTime();
    rowStart = addDays(rowStart, 7)
  ) {
    weeks.push(
      Array.from({ length: 7 }, (_, i) => addDays(rowStart, i)).filter(
        (day) => !hiddenDays.includes(day.getDay()),
      ),
    )
  }
  return weeks
}

/**
 * The month grid's column days — one week's worth, in the user's order and
 * minus what they hide. Only the weekday matters; the dates are arbitrary.
 */
export function monthColumnDays(
  firstDay: number,
  hiddenDays: number[] = [],
): Date[] {
  // Any week will do as a source of seven weekdays in order; the epoch's
  // first full week is stable and needs no clock read.
  const base = startOfWeek(new Date(2024, 0, 3), firstDay)
  return Array.from({ length: 7 }, (_, i) => addDays(base, i)).filter(
    (day) => !hiddenDays.includes(day.getDay()),
  )
}

/** The toolbar's heading in month view — e.g. "August 2026". */
export function monthLabel(day: Date, locale?: string): string {
  return `${formatDate(day, { month: 'long' }, locale)} ${day.getFullYear()}`
}

/** Column header, line 2 — e.g. "20 July 2026". */
export function dayLabel(day: Date, locale?: string): string {
  return `${day.getDate()} ${formatDate(day, { month: 'long' }, locale)} ${day.getFullYear()}`
}

export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

// Parse a `YYYY-MM-DD` anchor into a *local* Date (midnight). Returns null for
// anything malformed or non-existent (e.g. 2026-02-31). We build the date from
// numeric parts rather than `new Date(string)` to avoid UTC-parsing day shifts.
export function parseAnchor(value: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!m) return null
  const year = Number(m[1])
  const month = Number(m[2])
  const day = Number(m[3])
  const d = new Date(year, month - 1, day)
  if (
    d.getFullYear() !== year ||
    d.getMonth() !== month - 1 ||
    d.getDate() !== day
  ) {
    return null
  }
  return d
}

export function formatAnchor(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}
