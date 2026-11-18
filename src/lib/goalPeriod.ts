import { formatDate, formatDateRange } from '@/lib/intl'
import type { GoalPeriod } from '@/types/assistant'

/**
 * A campaign's goal period by name, in the active language (CON-511): a month
 * as the month — "April", "abril" — and a week by its days, "Apr 13 – 19",
 * because "Week 3" means nothing without the campaign's start in mind and
 * reads as a second count beside "14 of 20". The server's English `label` is
 * the fallback for a period sent without its days.
 *
 * The days are calendar days, read in UTC so no zone moves them.
 */
export function periodName(period: GoalPeriod): string {
  const { cadence, start, end } = period
  if (cadence && start && end) {
    const from = new Date(`${start}T00:00:00Z`)
    const to = new Date(`${end}T00:00:00Z`)
    if (!Number.isNaN(from.getTime()) && !Number.isNaN(to.getTime()))
      return cadence === 'month'
        ? (formatDate(from, { month: 'long', timeZone: 'UTC' }) ?? period.label)
        : formatDateRange(from, to, {
            day: 'numeric',
            month: 'short',
            timeZone: 'UTC',
          })
  }
  return period.label
}
