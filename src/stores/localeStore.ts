import { create } from 'zustand'
import { devtools } from 'zustand/middleware'

import {
  DEFAULT_LOCALE,
  isEnabledLocale,
  isLocale,
  LOCALE_QUERY_PARAM,
  MIN_LOCALE_SWITCH_MS,
  type Locale,
} from '@/i18n/config'
import { i18next, loadLocaleResources } from '@/i18n'
import { LOCALE_STORAGE_KEY } from '@/stores/constants'

type LocaleState = {
  /** The language currently rendered. i18next holds the same value; this is
   *  the copy React subscribes to. */
  locale: Locale
  /**
   * The language being fetched, or null when nothing is in flight.
   *
   * The *target* rather than a bare boolean, because the switching screen
   * writes itself in the language it is on its way to — see
   * `i18n/bootMessages.ts` for why that is the one screen that cannot read
   * from the catalogue.
   */
  switchingTo: Locale | null
  /**
   * Deliberately not gated on `enabled`. The release gate belongs on the two
   * ways a user reaches a locale — the picker and `bootstrapLocale` — and
   * leaving the mechanism itself open is what keeps the switch exercised
   * end to end while only English is released.
   */
  setLocale: (locale: Locale) => Promise<void>
}

/** localStorage throws in private-mode Safari and when storage is disabled. */
function readStoredLocale(): Locale | null {
  try {
    const stored = localStorage.getItem(LOCALE_STORAGE_KEY)
    return isLocale(stored) ? stored : null
  } catch {
    return null
  }
}

function writeStoredLocale(locale: Locale): void {
  try {
    localStorage.setItem(LOCALE_STORAGE_KEY, locale)
  } catch {
    // The choice still applies to this page load; it just won't outlive it.
  }
}

function clearStoredLocale(): void {
  try {
    localStorage.removeItem(LOCALE_STORAGE_KEY)
  } catch {
    // Nothing was readable to begin with.
  }
}

/**
 * Read `?lang=` and remove it from the address bar.
 *
 * The strip is a `replaceState`, not a navigation: it must not add a history
 * entry, or Back from the first in-app page would land on the same URL with
 * the parameter still on it.
 */
function takeForcedLocale(): Locale | null {
  const url = new URL(window.location.href)
  const requested = url.searchParams.get(LOCALE_QUERY_PARAM)
  if (requested === null) return null

  url.searchParams.delete(LOCALE_QUERY_PARAM)
  window.history.replaceState(window.history.state, '', url)

  // An unknown or misspelled code falls through to the stored preference
  // rather than erroring — a bad link should still open the app.
  return isLocale(requested) ? requested : null
}

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

export const useLocaleStore = create<LocaleState>()(
  devtools(
    (set, get) => ({
      locale: DEFAULT_LOCALE,
      switchingTo: null,

      setLocale: async (next) => {
        if (next === get().locale) return

        // Persisted before the fetch, not after: the choice is the user's
        // whether or not the chunk arrives, and a failed load below sends
        // them back to English for this session only.
        writeStoredLocale(next)
        set({ switchingTo: next }, false, 'locale/switching')

        try {
          // The floor and the fetch run together, so a slow connection costs
          // its own time rather than that time plus two seconds.
          await Promise.all([loadLocaleResources(next), delay(MIN_LOCALE_SWITCH_MS)])
          await i18next.changeLanguage(next)
          document.documentElement.lang = next
          set({ locale: next, switchingTo: null }, false, 'locale/set')
        } catch (err) {
          // The chunk didn't arrive. Stay on whatever is already rendered
          // rather than stranding the user behind the switching screen.
          console.error(`Could not load the ${next} translation`, err)
          set({ switchingTo: null }, false, 'locale/failed')
          throw err
        }
      },
    }),
    { name: 'locale-store' }
  )
)

/**
 * Resolve the locale for this page load and start fetching it.
 *
 * Call this **before the router is created**, from `main.tsx`: it rewrites the
 * address bar to drop `?lang=`, and the router reads `window.location` as it
 * boots. It is a plain function rather than an import side effect so tests can
 * drive it directly.
 *
 * Precedence is `?lang=` → stored choice → English. There is deliberately no
 * `navigator.language` step: the app is written in English, and inferring a
 * language nobody asked for would hide the fact that a translation exists at
 * all behind a switching screen on first load.
 */
export function bootstrapLocale(): void {
  const requested = takeForcedLocale() ?? readStoredLocale()
  const next = requested !== null && isEnabledLocale(requested) ? requested : DEFAULT_LOCALE

  document.documentElement.lang = next

  if (next === DEFAULT_LOCALE) {
    // Bundled — there is nothing to fetch, so no switching screen. Opening
    // the app in English, which is nearly every load, costs nothing.
    if (requested === null) return
    // A request for a locale that exists but is gated (see `LOCALES.enabled`):
    // forget it rather than leaving it dormant in storage, where it would
    // reactivate by itself on whichever deploy releases that language.
    if (isEnabledLocale(requested)) writeStoredLocale(requested)
    else clearStoredLocale()
    return
  }

  // Rejections are already logged and recovered from inside `setLocale`.
  void useLocaleStore.getState().setLocale(next).catch(() => {})
}
