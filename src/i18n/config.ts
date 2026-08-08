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
 *
 * `enabled` is the release gate, per language rather than one flag for the
 * feature: a locale can be finished, typed and tested long before its copy has
 * been reviewed, and each one is ready on its own schedule. A disabled locale
 * still compiles and still ships its chunk — it is simply not offered, not
 * accepted from `?lang=`, and not restored from a previous visit. Releasing it
 * is this one boolean.
 */
export const LOCALES = [
  { code: 'en', label: 'English', enabled: true },
  // Translated in full (CON-174) but not released: the copy has not been
  // reviewed by a Spanish speaker, and the app is only part-converted, so
  // choosing it today yields a half-Spanish UI.
  { code: 'es', label: 'Español', enabled: false },
] as const

export type Locale = (typeof LOCALES)[number]['code']

/** The subset offered in the picker — see `enabled` above. */
export const ENABLED_LOCALES = LOCALES.filter(({ enabled }) => enabled)

/**
 * Bundled, and the fallback for any key a translation has not filled in.
 *
 * Typed against the *enabled* codes rather than all of them: it is where every
 * gated locale falls back to, so disabling it would leave nothing to fall back
 * on. Doing so is a compile error here rather than an empty picker at runtime.
 */
export const DEFAULT_LOCALE = 'en' satisfies Extract<
  (typeof LOCALES)[number],
  { enabled: true }
>['code']

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

/** A code this app knows about, released or not. */
export function isLocale(value: unknown): value is Locale {
  return LOCALES.some(({ code }) => code === value)
}

/** A code a user is allowed to land on — the check every entry point makes. */
export function isEnabledLocale(value: unknown): value is Locale {
  return ENABLED_LOCALES.some(({ code }) => code === value)
}
