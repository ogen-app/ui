/**
 * IANA time zones for the workspace preference (CON-94).
 *
 * The list comes from the browser (`Intl.supportedValuesOf`) rather than a
 * hardcoded table, so it stays current with the tzdb without us shipping one.
 * A short fallback covers the few runtimes that lack the API — enough to pick
 * something sane, not enough to pretend it's complete.
 *
 * The workspace zone is a *display and authoring* setting: instants are stored
 * in UTC on both sides, and this decides which wall-clock the calendar, the
 * scheduler and the assistant's "tomorrow at 9am" resolve against.
 */

const FALLBACK = [
  'UTC',
  'Europe/London',
  'Europe/Berlin',
  'Europe/Madrid',
  'Europe/Kyiv',
  'America/New_York',
  'America/Chicago',
  'America/Los_Angeles',
  'Asia/Dubai',
  'Asia/Singapore',
  'Asia/Tokyo',
  'Australia/Sydney',
]

type IntlWithZones = typeof Intl & {
  supportedValuesOf?: (key: 'timeZone') => string[]
}

let cached: string[] | null = null

export function timezoneList(): string[] {
  if (cached) return cached
  const supported = (Intl as IntlWithZones).supportedValuesOf?.('timeZone')
  cached = supported?.length ? ['UTC', ...supported.filter((z) => z !== 'UTC')] : FALLBACK
  return cached
}

/** The viewer's own zone — the sensible default when creating a workspace. */
export function browserTimezone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
}

/**
 * "Europe/Berlin (UTC+02:00)" — the offset is what people actually recognise,
 * and it disambiguates the zones whose city they don't.
 */
export function timezoneLabel(zone: string): string {
  const offset = utcOffset(zone)
  return offset ? `${zone.replace(/_/g, ' ')} (${offset})` : zone.replace(/_/g, ' ')
}

/** Current UTC offset of a zone as "UTC+02:00"; empty when the runtime rejects the zone. */
export function utcOffset(zone: string, at: Date = new Date()): string {
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: zone,
      timeZoneName: 'longOffset',
    }).formatToParts(at)
    const name = parts.find((p) => p.type === 'timeZoneName')?.value ?? ''
    // Chrome reports plain "GMT" at zero offset; spell it out for consistency.
    return name === 'GMT' ? 'UTC+00:00' : name.replace('GMT', 'UTC')
  } catch {
    return ''
  }
}

/** The wall-clock time in a zone right now, e.g. "14:07" — shown next to the picker so the choice is checkable. */
export function currentTimeIn(zone: string, at: Date = new Date()): string {
  try {
    return new Intl.DateTimeFormat(undefined, {
      timeZone: zone,
      hour: '2-digit',
      minute: '2-digit',
    }).format(at)
  } catch {
    return ''
  }
}
