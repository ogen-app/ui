import { AppLoader } from '@/components/layout/AppLoader'
import { BOOT_MESSAGES } from '@/i18n/bootMessages'
import { useLocaleStore } from '@/stores/localeStore'

/**
 * The waiting screen shown while a translation is fetched — both on a
 * mid-session switch and on a page load that resolved to a non-default
 * language (`?lang=`, or a previous choice).
 *
 * Its copy is written in the language being loaded, and comes from
 * `BOOT_MESSAGES` rather than from `t`. That is not an inconsistency: this is
 * the screen that covers the fetch, so the catalogue it would read from is
 * precisely the thing that has not arrived. See `i18n/bootMessages.ts`.
 */
export function LocaleSwitchOverlay() {
  const switchingTo = useLocaleStore((s) => s.switchingTo)
  const locale = useLocaleStore((s) => s.locale)

  // Falls back to the rendered language on the way out, so the panel keeps its
  // text through the fade rather than blanking as `switchingTo` clears.
  const copy = BOOT_MESSAGES[switchingTo ?? locale]

  return (
    <AppLoader
      isLoading={switchingTo !== null}
      title={copy.title}
      message={copy.message}
    />
  )
}
