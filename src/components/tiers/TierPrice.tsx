import { Trans, useTranslation } from 'react-i18next'

import { formatNumber } from '@/lib/intl'
import { displayPrice, toMajorUnits } from '@/lib/tierPrice'
import { cn } from '@/lib'
import type { Tier } from '@/types/tiers'

/**
 * A plan's price as the page states it: the figure, then the period small.
 *
 * Which row is shown is `displayPrice`'s rule; this only words it. Nothing at
 * all for an unpriced plan — saying nothing about money is honest, and "$0" is
 * not. There is a real difference between a free tier, priced at zero, and an
 * unpriced one, and only the first gets a line.
 */
export function TierPrice({
  tier,
  size,
}: {
  tier: Tier
  size: 'large' | 'small'
}) {
  const { t, i18n } = useTranslation()
  const rate = displayPrice(tier.prices)
  if (!rate) return null

  const figure = cn(
    size === 'large' &&
      'font-display text-[44px] leading-none font-medium tracking-tight text-foreground',
  )
  if (rate.amount === 0) {
    return <span className={figure}>{t('tiers.priceFree')}</span>
  }

  const written = formatNumber(
    toMajorUnits(rate.amount, rate.currency, i18n.language),
    // The currency comes off the tier; the client never picks one. Whole
    // units only — a price list showing "49.00" reads like an invoice.
    { style: 'currency', currency: rate.currency, maximumFractionDigits: 0 },
    i18n.language,
  )
  return (
    <Trans
      i18nKey={rate.interval === 'year' ? 'tiers.priceYear' : 'tiers.price'}
      values={{ price: written }}
      components={{ price: <span className={figure} /> }}
    />
  )
}
