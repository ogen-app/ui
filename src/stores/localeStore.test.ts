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
import {
  ENABLED_LOCALES,
  isEnabledLocale,
  isLocale,
  MIN_LOCALE_SWITCH_MS,
} from '@/i18n/config'
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
    localStorage.setItem(LOCALE_STORAGE_KEY, 'en')
    bootstrapLocale()
    expect(useLocaleStore.getState().locale).toBe('en')
    expect(localStorage.getItem(LOCALE_STORAGE_KEY)).toBe('en')
  })

  it('takes ?lang= and persists it, so the link sticks', () => {
    window.history.replaceState(null, '', '/campaigns?lang=en')
    bootstrapLocale()
    expect(localStorage.getItem(LOCALE_STORAGE_KEY)).toBe('en')
  })

  it('strips ?lang= from the address bar without adding a history entry', () => {
    window.history.replaceState(null, '', '/campaigns?view=week&lang=en')
    const before = window.history.length
    bootstrapLocale()
    // The router round-trips search params; leaving ours there would make it
    // fight over a key no route declares.
    expect(window.location.search).toBe('?view=week')
    expect(window.history.length).toBe(before)
  })

  it('strips ?lang= even when the code is unusable — a mangled link still opens', () => {
    window.history.replaceState(null, '', '/?lang=klingon')
    bootstrapLocale()
    expect(window.location.search).toBe('')
    expect(useLocaleStore.getState().locale).toBe('en')
    expect(useLocaleStore.getState().switchingTo).toBeNull()
  })

  it('marks the document for screen readers and hyphenation', () => {
    bootstrapLocale()
    expect(document.documentElement.lang).toBe('en')
  })
})

/**
 * Spanish exists in full but is gated (`LOCALES.enabled`), so neither route
 * into it may open. These are the tests that come off the gate when a language
 * is released; until then they are what stops a half-released locale reaching
 * a user through a stale preference or a shared link.
 */
describe('a gated locale', () => {
  it('is not offered in the picker', () => {
    expect(ENABLED_LOCALES.map(({ code }) => code)).toEqual(['en'])
    // Still a known code, and still loadable — see the setLocale tests below.
    expect(isLocale('es')).toBe(true)
    expect(isEnabledLocale('es')).toBe(false)
  })

  it('is refused from ?lang=, which is otherwise a way around the picker', () => {
    window.history.replaceState(null, '', '/?lang=es')
    bootstrapLocale()
    expect(useLocaleStore.getState().switchingTo).toBeNull()
    expect(useLocaleStore.getState().locale).toBe('en')
    expect(document.documentElement.lang).toBe('en')
    expect(localStorage.getItem(LOCALE_STORAGE_KEY)).toBeNull()
  })

  it('is forgotten rather than left dormant when it was chosen before the gate', () => {
    // Anyone who picked Spanish while it was open — or on a preview build.
    localStorage.setItem(LOCALE_STORAGE_KEY, 'es')
    bootstrapLocale()
    expect(useLocaleStore.getState().locale).toBe('en')
    // Cleared, so releasing Spanish later does not silently switch them back
    // to a language they last chose months ago.
    expect(localStorage.getItem(LOCALE_STORAGE_KEY)).toBeNull()
  })
})

/**
 * `setLocale` is the mechanism, and is not gated — so these keep covering the
 * fetch, the floor and the handover to i18next with a real second locale while
 * only English is released. They are the reason the gate can be flipped with
 * some confidence rather than none.
 */
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
