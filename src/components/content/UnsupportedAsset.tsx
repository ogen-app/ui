import { useTranslation } from 'react-i18next'
import { FileDashedIcon } from '@phosphor-icons/react'
import { AssetStateFrame } from '@/components/content/AssetStateFrame'

/**
 * What an asset shows when this build has no way to open it (CON-16 R32).
 *
 * The screen used to fall through to the editor here, which is the one thing it
 * must not do: BlockNote seeded from a field that isn't a document renders the
 * raw value as a paragraph and autosaves the first keystroke over the asset. A
 * state that says so and offers nothing is strictly better than an editor that
 * quietly rewrites what it was pointed at.
 *
 * Reachable only when the server sends a `type` the client was compiled
 * before — `IMG` next, once CON-105 lands. That makes this a floor rather than
 * a screen: the kinds worth showing properly get their own view and stop
 * arriving here. Which is also why it holds no action. The chrome around it
 * already offers the two that always make sense, going back and deleting, and
 * inventing a third for a thing we can't identify would be guessing.
 */
export function UnsupportedAsset() {
  const { t } = useTranslation()

  return (
    <AssetStateFrame>
      <FileDashedIcon className="size-8 text-tertiary-foreground" />
      <h2 className="font-display text-2xl/8 font-medium text-foreground">
        {t('content.unsupported.title')}
      </h2>
      <p className="text-sm text-tertiary-foreground">
        {t('content.unsupported.body')}
      </p>
    </AssetStateFrame>
  )
}
