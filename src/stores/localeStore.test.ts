/**
 * @vitest-environment jsdom
 *
 * The only file in the suite that needs a DOM: `bootstrapLocale` reads
 * `window.location`, rewrites the address bar and writes `localStorage`, and
 * all three are the behaviour under test. Everything else stays on the default
 * node environment.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { bootstrapLocale, useLocaleStore } from './localeStore'
import { LOCALE_STORAGE_KEY } from './constants'
import { MIN_LOCALE_SWITCH_MS } from '@/i18n/config'
import { i18next } from '@/i18n'

function resetAll() {
  localStorage.clear()
  window.history.replaceState(null, '', '/campaigns')
  useLocaleStore.setState({ locale: 'en', switchingTo: null })
}

beforeEach(resetAll)

afterEach(async () => {
  vi.useRealTimers()
  await i18next.changeLanguage('en')
})

describe('bootstrapLocale', () => {
  it('leaves an ordinary English load alone — no fetch, no waiting screen', () => {
    bootstrapLocale()
    expect(useLocaleStore.getState().switchingTo).toBeNull()
    expect(useLocaleStore.getState().locale).toBe('en')
    // English is bundled, so nothing was chosen and nothing is remembered.
    expect(localStorage.getItem(LOCALE_STORAGE_KEY)).toBeNull()
  })

  it('honours a previous choice on the next visit', () => {
    localStorage.setItem(LOCALE_STORAGE_KEY, 'es')
    bootstrapLocale()
    // Synchronously up, so the first paint is the loader rather than a flash
    // of English.
    expect(useLocaleStore.getState().switchingTo).toBe('es')
  })

  it('takes ?lang= and persists it, so the link sticks', () => {
    window.history.replaceState(null, '', '/campaigns?lang=es')
    bootstrapLocale()
    expect(localStorage.getItem(LOCALE_STORAGE_KEY)).toBe('es')
    expect(useLocaleStore.getState().switchingTo).toBe('es')
  })

  it('strips ?lang= from the address bar without adding a history entry', () => {
    window.history.replaceState(null, '', '/campaigns?view=week&lang=es')
    const before = window.history.length
    bootstrapLocale()
    // The router round-trips search params; leaving ours there would make it
    // fight over a key no route declares.
    expect(window.location.search).toBe('?view=week')
    expect(window.history.length).toBe(before)
  })

  it('outranks a stored choice', () => {
    localStorage.setItem(LOCALE_STORAGE_KEY, 'en')
    window.history.replaceState(null, '', '/?lang=es')
    bootstrapLocale()
    expect(localStorage.getItem(LOCALE_STORAGE_KEY)).toBe('es')
  })

  it('ignores a bad code rather than erroring — a mangled link still opens', () => {
    localStorage.setItem(LOCALE_STORAGE_KEY, 'es')
    window.history.replaceState(null, '', '/?lang=klingon')
    bootstrapLocale()
    expect(window.location.search).toBe('')
    // Fell through to the stored preference.
    expect(localStorage.getItem(LOCALE_STORAGE_KEY)).toBe('es')
    expect(useLocaleStore.getState().switchingTo).toBe('es')
  })

  it('marks the document for screen readers and hyphenation', () => {
    localStorage.setItem(LOCALE_STORAGE_KEY, 'es')
    bootstrapLocale()
    expect(document.documentElement.lang).toBe('es')
  })
})

describe('setLocale', () => {
  it('holds the waiting screen for the full minimum even when the fetch is instant', async () => {
    vi.useFakeTimers()
    const done = vi.fn()
    const pending = useLocaleStore.getState().setLocale('es').then(done)

    // Let the import resolve, but not the floor.
    await vi.advanceTimersByTimeAsync(MIN_LOCALE_SWITCH_MS - 100)
    expect(done).not.toHaveBeenCalled()
    expect(useLocaleStore.getState().switchingTo).toBe('es')

    await vi.advanceTimersByTimeAsync(100)
    await pending
    expect(useLocaleStore.getState().switchingTo).toBeNull()
    expect(useLocaleStore.getState().locale).toBe('es')
    expect(i18next.language).toBe('es')
  })

  it('is a no-op for the language already on screen', async () => {
    await useLocaleStore.getState().setLocale('en')
    expect(useLocaleStore.getState().switchingTo).toBeNull()
  })

  it('remembers the choice before the fetch, not after', () => {
    void useLocaleStore.getState().setLocale('es').catch(() => {})
    // Written synchronously: the choice is the user's whether or not the
    // chunk arrives.
    expect(localStorage.getItem(LOCALE_STORAGE_KEY)).toBe('es')
  })
})
