/**
 * The IANA time zones this browser knows, labelled with their current offset.
 *
 * `Intl.supportedValuesOf` is ES2022 while this project's `lib` is ES2020, so
 * it is reached through a narrow declaration rather than by widening the lib
 * for one call. Where the runtime doesn't have it, the list is just the
 * browser's own zone — enough for the control to show the truth, and the
 * stored value is never dropped for being absent from the list.
 */
type IntlWithSupportedValues = {
  supportedValuesOf?: (key: 'timeZone') => string[]
}

/** "GMT+3", or "" when the zone isn't one this runtime can format. */
function offsetLabel(timeZone: string): string {
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone,
      timeZoneName: 'short',
    }).formatToParts(new Date(0))
    return parts.find((p) => p.type === 'timeZoneName')?.value ?? ''
  } catch {
    return ''
  }
}

/** "Europe/Kyiv (GMT+3)" — the zone as a person picks it out of a list. */
export function describeTimeZone(timeZone: string): string {
  const offset = offsetLabel(timeZone)
  const name = timeZone.replace(/_/g, ' ')
  return offset ? `${name} (${offset})` : name
}

let cached: string[] | null = null

/**
 * Every selectable zone, sorted by name. Built once — formatting ~400 zones
 * for their offsets is cheap but not free, and the list never changes within
 * a session.
 */
export function timeZoneNames(): string[] {
  if (cached) return cached
  const supported = (Intl as IntlWithSupportedValues).supportedValuesOf
  const zones = supported ? supported('timeZone') : []
  cached = zones.length > 0 ? [...zones].sort() : [Intl.DateTimeFormat().resolvedOptions().timeZone]
  return cached
}
