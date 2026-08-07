/**
 * The languages the app ships.
 *
 * `en` is not merely the first row: it is bundled into the main chunk (see
 * `resources/en.ts`) and is the fallback for every key, so the app can paint
 * before any locale request resolves and can never show a raw key. Every other
 * row is an `import()` — one chunk per locale, fetched the first time that
 * locale is chosen, and cached by the browser afterwards.
 *
 * Adding a language means adding a row here, a file in `resources/`, and a
 * loader in `LAZY_RESOURCES` (`i18n/index.ts`). That last map is typed against
 * this list, so forgetting it is a compile error rather than a runtime one.
 *
 * Labels are written in the language they name: someone hunting for their own
 * language scans for "Español", not for "Spanish".
 */
export const LOCALES = [
  { code: 'en', label: 'English' },
  { code: 'es', label: 'Español' },
] as const

export type Locale = (typeof LOCALES)[number]['code']

/** Bundled, and the fallback for any key a translation has not filled in. */
export const DEFAULT_LOCALE = 'en' satisfies Locale

/**
 * `?lang=es` forces a locale for this page load and is then persisted like any
 * other choice, so a shared link sets the recipient's language until they
 * change it.
 *
 * It is read and stripped from the address bar *before* the router boots
 * (`bootstrapLocale`), for two reasons. Routes here declare strict
 * `validateSearch` schemas that would drop an unknown key on the next
 * navigation anyway, and once persisted the parameter has no further job — it
 * is an instruction, not state worth keeping in the URL.
 */
export const LOCALE_QUERY_PARAM = 'lang'

/**
 * How long the switching screen stays up, at minimum.
 *
 * A locale chunk is small enough to arrive in well under a frame on a warm
 * connection, and a UI that swaps language between two paints reads as a
 * glitch. Holding the screen makes the change deliberate — and gives a cold
 * connection room to finish without the loader flickering in and out.
 */
export const MIN_LOCALE_SWITCH_MS = 2000

export function isLocale(value: unknown): value is Locale {
  return LOCALES.some(({ code }) => code === value)
}
