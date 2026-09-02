import type { Locale } from './config'

/**
 * The switching screen's own copy, for every language, in the main chunk.
 *
 * This is the one screen whose text cannot come from `resources/` like
 * everything else, because it is what covers the gap *while those resources
 * are being fetched*. Reading it through `t` looks fine on a mid-session
 * switch — the old language is loaded — but it is wrong in the commoner case:
 * someone whose language is Spanish reloads the app, the Spanish bundle is not
 * there yet, and the fallback greets them in English on every single page
 * load.
 *
 * Two short lines per language, always in the main bundle, is a small price
 * for never showing the most frequently-seen screen in a language the reader
 * may not have. Keep it to exactly these two lines; everything else belongs in
 * `resources/`, where it is lazy and where translators expect to find it.
 */
export const BOOT_MESSAGES: Record<Locale, { title: string; message: string }> =
  {
    en: {
      title: 'Switching language',
      message: 'Fetching the translation. This happens once per language.',
    },
    es: {
      title: 'Cambiando de idioma',
      message: 'Descargando la traducción. Solo ocurre una vez por idioma.',
    },
  }
