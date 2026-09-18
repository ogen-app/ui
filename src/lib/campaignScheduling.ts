/**
 * A campaign's scheduling settings (CON-181), mirroring the Go `scheduling`
 * package the server validates and schedules against. Keep the two in sync.
 *
 * The one shape difference worth knowing: the server stores the days a campaign
 * **does** publish on, as lowercase tokens (`["mon","wed","fri"]`), while the
 * calendar and the day pickers work in JS `Date#getDay()` numbers. Convert at
 * the edges with `publishingDayNumbers` / `publishingDayTokens` rather than
 * indexing the tokens by hand — the token order is the week, Monday-first,
 * which is *not* the getDay() order.
 */

/** The canonical token set, in week order — Monday first, as the server has it. */
export const WEEKDAY_TOKENS = [
  'mon',
  'tue',
  'wed',
  'thu',
  'fri',
  'sat',
  'sun',
] as const

export type WeekdayToken = (typeof WEEKDAY_TOKENS)[number]

/** What the server applies to a campaign that leaves a field unset. */
export const DEFAULT_PUBLISHING_TIME = '09:00'
export const DEFAULT_SPREAD_MINUTES = 15
/** ±12h. The server rejects anything outside `[0, MAX_SPREAD_MINUTES]` with a 400. */
export const MAX_SPREAD_MINUTES = 720

const TOKEN_TO_DAY: Record<WeekdayToken, number> = {
  sun: 0,
  mon: 1,
  tue: 2,
  wed: 3,
  thu: 4,
  fri: 5,
  sat: 6,
}

/** Every day, as a fresh array — the server's default for a new campaign. */
export function defaultPublishingDays(): WeekdayToken[] {
  return [...WEEKDAY_TOKENS]
}

/**
 * The stored tokens as `getDay()` numbers.
 *
 * An empty or wholly unrecognised list reads as *every* day, which is what the
 * server does with it (`scheduling.EnabledWeekdays`): a campaign is never left
 * with nowhere to publish. Getting this wrong in the other direction would show
 * a campaign as publishing nowhere while the scheduler publishes it everywhere.
 */
export function publishingDayNumbers(
  days: readonly string[] | null | undefined,
): number[] {
  const out = new Set<number>()
  for (const day of days ?? []) {
    const token = day.trim().toLowerCase() as WeekdayToken
    if (token in TOKEN_TO_DAY) out.add(TOKEN_TO_DAY[token])
  }
  if (out.size === 0) return WEEKDAY_TOKENS.map((t) => TOKEN_TO_DAY[t])
  return [...out]
}

/** `getDay()` numbers back to tokens, in the server's week order. */
export function publishingDayTokens(
  dayNumbers: readonly number[],
): WeekdayToken[] {
  const wanted = new Set(dayNumbers)
  return WEEKDAY_TOKENS.filter((token) => wanted.has(TOKEN_TO_DAY[token]))
}

/** Whether the campaign publishes on a `getDay()` number. */
export function isPublishingDay(
  days: readonly string[] | null | undefined,
  dayNumber: number,
): boolean {
  return publishingDayNumbers(days).includes(dayNumber)
}

/** A zero-padded 24-hour "HH:MM", which is the only form the server accepts. */
export function isValidClock(value: string): boolean {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value.trim())
}

/**
 * The zone to show for a stored value. The server writes `""` for UTC — the Go
 * zero value — and a select with an empty option would read as "unset" rather
 * than as the zone the campaign actually schedules in.
 */
export function displayTimeZone(timezone: string | null | undefined): string {
  const trimmed = (timezone ?? '').trim()
  return trimmed === '' ? 'UTC' : trimmed
}
