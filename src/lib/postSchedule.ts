/**
 * Publish-date helpers shared by every surface that sets `scheduled_at`:
 * the settings form, the quick-settings bar and the calendar.
 *
 * `scheduled_at` is stored as an ISO instant but is always authored in the
 * user's local zone, so every conversion here goes through local getters —
 * never `toISOString().slice(0, 10)`, which would shift the day for anyone
 * east or west of UTC.
 */

/** Time of day given to a post whose date was picked without one. */
import { offsetLabel } from '@/lib/timeZones'

export const DEFAULT_HOUR = 9
export const DEFAULT_MINUTE = 0

/** Splits an ISO instant into the `<input type="date">` / `type="time"` pair. */
export function toLocalParts(iso: string | null): {
  dateStr: string
  timeStr: string
} {
  if (!iso) return { dateStr: '', timeStr: '' }
  const d = new Date(iso)
  if (isNaN(d.getTime())) return { dateStr: '', timeStr: '' }
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  return { dateStr: `${y}-${m}-${day}`, timeStr: `${hh}:${mm}` }
}

/** Recombines the pair into an ISO instant. No date means no schedule. */
export function fromLocalParts(
  dateStr: string,
  timeStr: string,
): string | null {
  if (!dateStr) return null
  const [y, m, d] = dateStr.split('-').map(Number)
  const [hh, mm] = timeStr
    ? timeStr.split(':').map(Number)
    : [DEFAULT_HOUR, DEFAULT_MINUTE]
  const local = new Date(y, m - 1, d, hh ?? 0, mm ?? 0, 0, 0)
  return isNaN(local.getTime()) ? null : local.toISOString()
}

/** A calendar day + the default time of day, as an ISO instant. */
export function atDefaultTime(day: Date): string {
  const local = new Date(
    day.getFullYear(),
    day.getMonth(),
    day.getDate(),
    DEFAULT_HOUR,
    DEFAULT_MINUTE,
    0,
    0,
  )
  return local.toISOString()
}

/**
 * Short name for this browser's own zone, e.g. "GMT+3".
 *
 * Deliberately the same `offsetLabel` the zone *picker* renders with, rather
 * than a second near-identical formatter: the two describe the same zone in
 * the same screen, and one of them reading "GMT+3" while the other read
 * "GMT+03:00" was a difference with no meaning behind it. That helper pins
 * `en-US` because the label it produces is parsed out of `formatToParts`.
 */
export function getLocalTimezoneLabel(): string {
  try {
    return (
      offsetLabel(Intl.DateTimeFormat().resolvedOptions().timeZone) ||
      'local time'
    )
  } catch {
    return 'local time'
  }
}
