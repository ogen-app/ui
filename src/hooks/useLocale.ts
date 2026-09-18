import { useLocaleStore } from '@/stores/localeStore'
import type { Locale } from '@/i18n/config'

/**
 * The active language, as a subscription.
 *
 * `lib/intl.ts` reads the language at call time, which makes a formatted date
 * correct whenever it is *computed* — but a component only computes on render,
 * and switching language does not remount the tree. `LocaleSwitchOverlay` is
 * an overlay: it covers the app for two seconds and then uncovers whatever was
 * underneath, still rendered in the old language.
 *
 * Anything reading `t()` already re-renders, because `useTranslation`
 * subscribes for it. This is for the components that format a date or a number
 * without otherwise touching the catalogue, and there is nothing else to
 * subscribe them.
 *
 * The returned value is worth passing on to the formatter rather than
 * discarding — not for correctness (the default reads the same thing) but
 * because it makes the dependency legible: a locale read with its result
 * thrown away looks like a line worth deleting.
 */
export function useLocale(): Locale {
  return useLocaleStore((s) => s.locale)
}
