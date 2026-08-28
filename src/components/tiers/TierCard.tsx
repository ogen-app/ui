import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { Chip } from '@/components/ui/chip'
import { formatNumber } from '@/lib/intl'
import { tierFeatures } from '@/lib/tierFeatures'
import { cn } from '@/lib'
import { TierFeatureList } from './TierFeatureList'
import type { Tier } from '@/types/tiers'

type Props = {
  tier: Tier
  /** Whether this is the tier the workspace holds right now. */
  current: boolean
  /** Whether this is the tier the workspace has already been moved onto. */
  scheduled: boolean
  onChoose: (tier: Tier) => void
  busy: boolean
}

/**
 * One plan, on a card that can be read on its own.
 *
 * The current tier keeps its button, disabled, rather than losing it. A card
 * with a hole where every other card has a control is read as broken before it
 * is read as "this one is yours".
 *
 * Calling off a scheduled change is *not* here. It belongs beside the sentence
 * that announced it, which is where somebody who wants to undo it is looking —
 * putting it on the card as well would give one action two controls that have
 * to agree.
 */
export function TierCard({ tier, current, scheduled, onChoose, busy }: Props) {
  const { t, i18n } = useTranslation()

  // Built here rather than in a helper taking `t`: the catalogue's key type is
  // what makes a missing translation a compile error, and passing `t` out
  // through a `(key: string) => string` parameter is exactly what throws that
  // away. Same reason the Zod schemas are `(t) => schema` factories.
  let price: string | null = null
  if (tier.price) {
    if (tier.price.amount === 0) {
      price = t('tiers.priceFree')
    } else {
      const written = formatNumber(
        tier.price.amount / 100,
        // The currency comes off the tier; the client never picks one. Whole
        // units only — a price list showing "49.00" reads like an invoice.
        { style: 'currency', currency: tier.price.currency, maximumFractionDigits: 0 },
        i18n.language,
      )
      price =
        tier.price.period === 'year'
          ? t('tiers.priceYear', { price: written })
          : t('tiers.price', { price: written })
    }
  }

  return (
    <section
      className={cn(
        'flex flex-col gap-5 rounded-lg border p-5 min-w-0',
        current ? 'border-primary-foreground' : 'border-senary-foreground',
      )}
    >
      <header className="flex flex-col gap-2 min-w-0">
        <div className="flex items-center justify-between gap-3 min-w-0">
          {/* Server copy, in whatever language the tier list was written in —
              see `services/api/tiers.ts`. */}
          <h3 className="text-lg font-display font-medium tracking-tight min-w-0 truncate">
            {tier.name}
          </h3>
          {current && <Chip variant="muted">{t('tiers.currentBadge')}</Chip>}
          {scheduled && <Chip variant="muted">{t('tiers.scheduledBadge')}</Chip>}
        </div>
        {/* Omitted rather than faked while pricing is undecided: a plan card
            that says nothing about money is honest, and one that says "$0" is
            not. */}
        {price && <p className="text-sm font-medium">{price}</p>}
        <p className="text-[13px] text-tertiary-foreground">{tier.tagline}</p>
      </header>

      <TierFeatureList features={tierFeatures(tier)} />

      <Button
        // Both non-actionable states take the quiet variant: a disabled
        // primary button still reads as the thing to press, and "Scheduled"
        // rendered that way looked like the call to action on the page.
        variant={current || scheduled ? 'defaultInverted' : 'default'}
        className="mt-auto w-full"
        disabled={busy || current || scheduled}
        onClick={() => onChoose(tier)}
        aria-label={t('tiers.chooseNamed', { name: tier.name })}
      >
        {current
          ? t('tiers.currentBadge')
          : scheduled
            ? t('tiers.scheduledBadge')
            : t('tiers.choose')}
      </Button>
    </section>
  )
}
