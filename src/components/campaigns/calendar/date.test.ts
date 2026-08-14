import { describe, expect, it } from 'vitest'
import {
  addMonths,
  formatAnchor,
  isSameMonth,
  monthColumnDays,
  monthWeeks,
} from './date'

describe('addMonths', () => {
  it('keeps the day of month where the target month is long enough', () => {
    expect(formatAnchor(addMonths(new Date(2026, 7, 12), 1))).toBe('2026-09-12')
    expect(formatAnchor(addMonths(new Date(2026, 7, 12), -1))).toBe('2026-07-12')
  })

  it('clamps to the last day when the target month is shorter', () => {
    // The bug this guards: without clamping, 31 Jan + 1 month rolls over into
    // 3 March and paging forward skips February entirely.
    expect(formatAnchor(addMonths(new Date(2026, 0, 31), 1))).toBe('2026-02-28')
    expect(formatAnchor(addMonths(new Date(2026, 4, 31), -1))).toBe('2026-04-30')
  })

  it('knows about leap years', () => {
    expect(formatAnchor(addMonths(new Date(2028, 0, 31), 1))).toBe('2028-02-29')
  })

  it('crosses the year boundary', () => {
    expect(formatAnchor(addMonths(new Date(2026, 11, 15), 1))).toBe('2027-01-15')
    expect(formatAnchor(addMonths(new Date(2026, 0, 15), -1))).toBe('2025-12-15')
  })
})

describe('monthWeeks', () => {
  it('covers the whole month in whole weeks', () => {
    // August 2026 starts on a Saturday and ends on a Monday.
    const weeks = monthWeeks(new Date(2026, 7, 12), 1)
    const flat = weeks.flat()
    expect(formatAnchor(flat[0])).toBe('2026-07-27') // Monday before the 1st
    expect(formatAnchor(flat[flat.length - 1])).toBe('2026-09-06') // Sunday after the 31st
    expect(weeks.every((w) => w.length === 7)).toBe(true)
  })

  it('spans six rows when the month needs them, four when it does not', () => {
    // August 2026: Sat 1st, 31 days — needs six rows starting on Monday.
    expect(monthWeeks(new Date(2026, 7, 1), 1)).toHaveLength(6)
    // February 2027: Mon 1st, 28 days — exactly four Monday-start weeks.
    expect(monthWeeks(new Date(2027, 1, 1), 1)).toHaveLength(4)
  })

  it('honours the first day of the week', () => {
    const monday = monthWeeks(new Date(2026, 7, 12), 1)
    const sunday = monthWeeks(new Date(2026, 7, 12), 0)
    expect(monday[0][0].getDay()).toBe(1)
    expect(sunday[0][0].getDay()).toBe(0)
  })

  it('drops hidden days from every row', () => {
    // Weekdays only.
    const weeks = monthWeeks(new Date(2026, 7, 12), 1, [0, 6])
    expect(weeks.every((w) => w.length === 5)).toBe(true)
    expect(weeks.flat().some((d) => d.getDay() === 0 || d.getDay() === 6)).toBe(false)
  })

  it('includes the spill days from the neighbouring months', () => {
    const anchor = new Date(2026, 7, 12)
    const flat = monthWeeks(anchor, 1).flat()
    expect(flat.some((d) => !isSameMonth(d, anchor))).toBe(true)
  })
})

describe('monthColumnDays', () => {
  it('returns the visible weekdays in the user’s order', () => {
    expect(monthColumnDays(1).map((d) => d.getDay())).toEqual([1, 2, 3, 4, 5, 6, 0])
    expect(monthColumnDays(0).map((d) => d.getDay())).toEqual([0, 1, 2, 3, 4, 5, 6])
  })

  it('matches what monthWeeks lays out, so headers line up with cells', () => {
    const hidden = [0, 6]
    const columns = monthColumnDays(1, hidden).map((d) => d.getDay())
    const firstRow = monthWeeks(new Date(2026, 7, 12), 1, hidden)[0].map((d) => d.getDay())
    expect(columns).toEqual(firstRow)
  })
})
