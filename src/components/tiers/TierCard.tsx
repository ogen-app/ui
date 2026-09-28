import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { Chip } from '@/components/ui/chip'
import { formatNumber } from '@/lib/intl'
import { displayPrice, toMajorUnits } from '@/lib/tierPrice'
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
  /**
   * Whether this reader may choose at all (CON-232).
   *
   * False takes the button off **every** card, which is why it is safe: the
   * screen then reads as the comparison it also is, and the one sentence under
   * the heading says whose decision it is. A card with a hole where its
   * neighbours have a control is read as broken; a page of cards with no
   * controls is read as a price list.
   */
  mayChoose: boolean
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
export function TierCard({
  tier,
  current,
  scheduled,
  mayChoose,
  onChoose,
  busy,
}: Props) {
  const { t, i18n } = useTranslation()

  // Which row to show is `displayPrice`'s rule; wording it is this component's,
  // and the wording is built here rather than in a helper taking `t`: the
  // catalogue's key type is what makes a missing translation a compile error,
  // and passing `t` out through a `(key: string) => string` parameter is exactly
  // what throws that away. Same reason the Zod schemas are `(t) => schema`
  // factories.
  const rate = displayPrice(tier.prices)
  let price: string | null = null
  if (rate) {
    if (rate.amount === 0) {
      price = t('tiers.priceFree')
    } else {
      const written = formatNumber(
        toMajorUnits(rate.amount, rate.currency, i18n.language),
        // The currency comes off the tier; the client never picks one. Whole
        // units only — a price list showing "49.00" reads like an invoice.
        {
          style: 'currency',
          currency: rate.currency,
          maximumFractionDigits: 0,
        },
        i18n.language,
      )
      price =
        rate.interval === 'year'
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
          {/* Not a catalogue key and not translated: a tier's name is data, and
              today it is a title-cased slug because the payload carries no name
              at all — see `nameFromSlug` in `services/api/entitlements.ts`. */}
          <h3 className="text-lg font-display font-medium tracking-tight min-w-0 truncate">
            {tier.name}
          </h3>
          {current && <Chip variant="muted">{t('tiers.currentBadge')}</Chip>}
          {scheduled && (
            <Chip variant="muted">{t('tiers.scheduledBadge')}</Chip>
          )}
        </div>
        {/* Omitted rather than faked while pricing is undecided: a plan card
            that says nothing about money is honest, and one that says "$0" is
            not. There is a real difference between a free tier — priced, at
            zero — and an unpriced one, and only the first gets a line. */}
        {price && <p className="text-sm font-medium">{price}</p>}
        {/* No tagline: the catalog has no per-tier line of copy, and the line
            that used to sit here came off an endpoint that never existed. See
            `types/tiers.ts`. */}
      </header>

      <TierFeatureList features={tierFeatures(tier)} />

      {mayChoose && (
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
      )}
    </section>
  )
}
