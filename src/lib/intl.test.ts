import { describe, expect, it, afterEach } from 'vitest'

import { i18next } from '@/i18n'
import { DEFAULT_LOCALE } from '@/i18n/config'
import {
  activeLocale,
  formatDate,
  formatNumber,
  formatRelative,
} from '@/lib/intl'

/**
 * The point of this module is that the *app's* language wins over the
 * browser's, so most of what is worth asserting is "does changing the language
 * change the output". Spanish is the other language the app ships (gated, but
 * loaded and complete), so it is what the language-sensitivity cases switch to.
 */

afterEach(async () => {
  await i18next.changeLanguage(DEFAULT_LOCALE)
})

const JANUARY_FIFTH = '2026-01-05T14:30:00.000Z'

describe('activeLocale', () => {
  it('is whatever i18next is on, read at call time', async () => {
    expect(activeLocale()).toBe('en')
    await i18next.changeLanguage('es')
    expect(activeLocale()).toBe('es')
  })
})

describe('formatDate', () => {
  it('formats in the active language, not the browser one', async () => {
    const options: Intl.DateTimeFormatOptions = {
      month: 'long',
      timeZone: 'UTC',
    }
    expect(formatDate(JANUARY_FIFTH, options)).toBe('January')

    await i18next.changeLanguage('es')
    expect(formatDate(JANUARY_FIFTH, options)).toBe('enero')
  })

  it('takes an explicit locale over the active one', () => {
    expect(
      formatDate(JANUARY_FIFTH, { month: 'long', timeZone: 'UTC' }, 'es'),
    ).toBe('enero')
  })

  // The reason the formatter is built per call rather than hoisted: a module
  // that caches the *formatter* keeps working, one that caches the *language*
  // is frozen to whichever loaded first. This is the regression guard for it.
  it('does not freeze the language it first saw', async () => {
    const options: Intl.DateTimeFormatOptions = {
      month: 'long',
      timeZone: 'UTC',
    }
    expect(formatDate(JANUARY_FIFTH, options)).toBe('January')
    await i18next.changeLanguage('es')
    expect(formatDate(JANUARY_FIFTH, options)).toBe('enero')
    await i18next.changeLanguage('en')
    expect(formatDate(JANUARY_FIFTH, options)).toBe('January')
  })

  it('reads ISO strings, epoch numbers and Dates alike', () => {
    const options: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      timeZone: 'UTC',
    }
    const date = new Date(JANUARY_FIFTH)
    expect(formatDate(JANUARY_FIFTH, options)).toBe('2026')
    expect(formatDate(date.getTime(), options)).toBe('2026')
    expect(formatDate(date, options)).toBe('2026')
  })

  // A column that isn't set yet, and a timestamp the server sent malformed,
  // reach the same call sites. Both have to come back as an empty slot rather
  // than the literal string "Invalid Date".
  it('returns null for missing and unreadable values', () => {
    const options: Intl.DateTimeFormatOptions = { year: 'numeric' }
    expect(formatDate(null, options)).toBeNull()
    expect(formatDate(undefined, options)).toBeNull()
    expect(formatDate('', options)).toBeNull()
    expect(formatDate('not a date', options)).toBeNull()
  })
})

describe('formatNumber', () => {
  it('separates thousands the way the active language does', async () => {
    expect(formatNumber(1234567)).toBe('1,234,567')
    await i18next.changeLanguage('es')
    // Spanish groups with a dot at this magnitude.
    expect(formatNumber(1234567)).toBe('1.234.567')
  })

  it('carries options through — the compact countdown depends on it', () => {
    expect(
      formatNumber(
        3,
        { style: 'unit', unit: 'day', unitDisplay: 'short' },
        'en',
      ),
    ).toBe('3 days')
  })
})

describe('formatRelative', () => {
  it('speaks the active language in both directions', async () => {
    expect(formatRelative(5, 'day')).toBe('in 5 days')
    expect(formatRelative(-5, 'day')).toBe('5 days ago')

    await i18next.changeLanguage('es')
    expect(formatRelative(5, 'day')).toBe('dentro de 5 días')
  })

  /**
   * `numeric: 'auto'` is what buys the word instead of the count, and it is the
   * whole reason the catalogue carries no entry per unit: each language reaches
   * for its own idiom, at its own distance. English has a word for one day out
   * and Spanish has one for two, and neither is anything a table of suffixes
   * would have produced.
   */
  it("reaches for each language's own word before the number", async () => {
    expect(formatRelative(1, 'day', 'en')).toBe('tomorrow')
    expect(formatRelative(2, 'day', 'en')).toBe('in 2 days')
    expect(formatRelative(2, 'day', 'es')).toBe('pasado mañana')
  })
})
