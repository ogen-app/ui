import { describe, expect, it } from 'vitest'

import {
  defaultPublishingDays,
  displayTimeZone,
  isPublishingDay,
  isValidClock,
  publishingDayNumbers,
  publishingDayTokens,
} from './campaignScheduling'

describe('publishingDayNumbers', () => {
  it('maps the server tokens onto getDay() numbers', () => {
    // The tokens are Monday-first; getDay() is Sunday-first. Reading one as the
    // other would silently shift the whole week.
    expect(publishingDayNumbers(['mon', 'wed', 'fri']).sort()).toEqual([1, 3, 5])
    expect(publishingDayNumbers(['sun']).sort()).toEqual([0])
    expect(publishingDayNumbers(['sat']).sort()).toEqual([6])
  })

  it('tolerates the case and padding a hand-edited value might carry', () => {
    expect(publishingDayNumbers([' MON ', 'Tue']).sort()).toEqual([1, 2])
  })

  it('reads an empty or unrecognised set as every day, as the server does', () => {
    // scheduling.EnabledWeekdays falls back to all seven, so showing "publishes
    // nowhere" here would contradict a scheduler that publishes daily.
    expect(publishingDayNumbers([]).sort()).toEqual([0, 1, 2, 3, 4, 5, 6])
    expect(publishingDayNumbers(null).sort()).toEqual([0, 1, 2, 3, 4, 5, 6])
    expect(publishingDayNumbers(['monday', 'nope']).sort()).toEqual([0, 1, 2, 3, 4, 5, 6])
  })
})

describe('publishingDayTokens', () => {
  it('returns tokens in the week order the server stores them in', () => {
    expect(publishingDayTokens([5, 0, 1])).toEqual(['mon', 'fri', 'sun'])
  })

  it('round-trips a day set', () => {
    const days = defaultPublishingDays()
    expect(publishingDayTokens(publishingDayNumbers(days))).toEqual(days)
  })

  it('ignores numbers that are not a weekday', () => {
    expect(publishingDayTokens([7, -1])).toEqual([])
  })
})

describe('isPublishingDay', () => {
  it('answers for a getDay() number', () => {
    expect(isPublishingDay(['mon', 'tue'], 1)).toBe(true)
    expect(isPublishingDay(['mon', 'tue'], 0)).toBe(false)
  })
})

describe('isValidClock', () => {
  it('accepts only the zero-padded 24-hour form the server takes', () => {
    expect(isValidClock('00:00')).toBe(true)
    expect(isValidClock('23:59')).toBe(true)
    expect(isValidClock('9:00')).toBe(false)
    expect(isValidClock('24:00')).toBe(false)
    expect(isValidClock('09:60')).toBe(false)
    expect(isValidClock('9am')).toBe(false)
    expect(isValidClock('')).toBe(false)
  })
})

describe('displayTimeZone', () => {
  it('spells the server empty string as the zone it means', () => {
    expect(displayTimeZone('')).toBe('UTC')
    expect(displayTimeZone(null)).toBe('UTC')
    expect(displayTimeZone('  ')).toBe('UTC')
  })

  it('leaves a real zone alone', () => {
    expect(displayTimeZone('Europe/Kyiv')).toBe('Europe/Kyiv')
  })
})
