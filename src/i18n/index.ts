import i18next from 'i18next'
import { initReactI18next } from 'react-i18next'

import { DEFAULT_LOCALE, type Locale } from './config'
import { en, type Translation } from './resources/en'

/**
 * i18next, initialised with English only.
 *
 * English is a static import — it ships inside the main chunk, so the first
 * paint never waits on a network request and a missing key in any other
 * language falls back to real copy instead of a raw dotted path. Every other
 * locale arrives through `loadLocaleResources` below.
 *
 * There is exactly one namespace. Namespaces exist to split a large catalogue
 * into separately-loadable pieces; here the whole catalogue for a locale *is*
 * the unit we load, so a second namespace would only add ceremony to every
 * `t()` call.
 */
void i18next.use(initReactI18next).init({
  lng: DEFAULT_LOCALE,
  fallbackLng: DEFAULT_LOCALE,
  resources: { [DEFAULT_LOCALE]: { translation: en } },
  interpolation: {
    // React escapes anything it renders, so i18next escaping again would turn
    // an apostrophe in an interpolated workspace name into `&#39;`.
    escapeValue: false,
  },
})

/**
 * One dynamic `import()` per non-default locale.
 *
 * Written out rather than built from a template string: `import('./resources/'
 * + code)` would make Vite emit a chunk for *every* file in the directory,
 * English included, so the bundled copy would ship twice. The `Exclude` in the
 * key type is what enforces the contract in `config.ts` — add a locale to
 * `LOCALES` without adding a loader here and this object stops type-checking.
 */
const LAZY_RESOURCES: Record<
  Exclude<Locale, typeof DEFAULT_LOCALE>,
  () => Promise<Translation>
> = {
  es: () => import('./resources/es').then((m) => m.es),
}

/**
 * Fetch a locale's strings and hand them to i18next. Resolves immediately for
 * anything already loaded, and for English, which was never lazy.
 */
export async function loadLocaleResources(locale: Locale): Promise<void> {
  if (locale === DEFAULT_LOCALE) return
  if (i18next.hasResourceBundle(locale, 'translation')) return

  const resources = await LAZY_RESOURCES[locale]()
  i18next.addResourceBundle(locale, 'translation', resources)
}

export { i18next }

/**
 * Types every `t()` key against the English catalogue, so a typo or a key
 * removed from `en.ts` is a compile error rather than a string that silently
 * renders as itself.
 */
declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'translation'
    resources: { translation: Translation }
  }
}
