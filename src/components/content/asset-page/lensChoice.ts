import type { TFunction } from 'i18next'
import type { CardChoice } from '@/components/ui/card'
import { isLensWaiting, lensKey } from '@/lib/assetAnalysis'
import { formatNumber } from '@/lib/intl'
import type { AssetAnalysis } from '@/types/assetAnalysis'

/**
 * What the asset bar says about the reading on screen: the picker, the line
 * that stands in for it when only the workspace has read the asset, or
 * nothing while there is no reading yet.
 */
export type LensControl = CardChoice | string | null

/**
 * "For  Spring launch · 88% fit ⌄" — which reading of the asset the Summary
 * and Ideas cards show (CON-366), in the asset bar over them both. Shaped as a
 * card's `choice`, and drawn as one: the outline button with a chevron that
 * every card dropdown is.
 *
 * A dropdown rather than tabs: an asset can serve any number of campaigns,
 * and a row of segments stops fitting at the third. Every campaign's reading
 * says its fit, and one still being analysed says so, so choosing it and
 * getting a waiting card is not a surprise.
 */
export function lensChoice(
  lenses: AssetAnalysis[],
  current: AssetAnalysis,
  onChange: (key: string) => void,
  t: TFunction,
  language: string,
): CardChoice {
  return {
    label: t('assetInsights.lens.label'),
    lead: t('assetInsights.lens.for'),
    value: lensKey(current),
    onChange,
    options: lenses.map((lens) => ({
      id: lensKey(lens),
      displayValue: lensLabel(lens, t, language),
    })),
  }
}

function lensLabel(lens: AssetAnalysis, t: TFunction, language: string) {
  if (lens.campaign_id === null) return t('assetInsights.lens.workspace')
  const name = lens.campaign_name ?? t('assetInsights.lens.campaign')
  if (isLensWaiting(lens)) return t('assetInsights.lens.analysing', { name })
  if (!lens.relevance) return name
  return t('assetInsights.lens.withFit', {
    name,
    fit: formatNumber(
      lens.relevance.score / 100,
      { style: 'percent' },
      language,
    ),
  })
}
