import { useTranslation } from 'react-i18next'
import { CheckIcon, MinusIcon } from '@phosphor-icons/react'

import { formatNumber } from '@/lib/intl'
import {
  TIER_FEATURE_ORDER,
  featureLabel,
  featureValue,
  formatStorage,
  isByteKey,
  type TierFeatureKey,
  type TierFeatureValue,
} from '@/lib/tierFeatures'
import type { UsageReset } from '@/types/entitlements'
import type { Tier } from '@/types/tiers'
import { TierPrice } from './TierPrice'

/**
 * Every feature against every plan — the figures the cards above leave out.
 *
 * Always open. The cards sell the step between plans and say nothing
 * countable, so this is the only place on the page a number is stated; folding
 * it away would make "how many campaigns?" a question the page answers only on
 * request. It scrolls sideways inside itself on a narrow screen rather than
 * reflowing, because a comparison is read across a row.
 */
export function TierComparison({ tiers }: { tiers: readonly Tier[] }) {
  const { t } = useTranslation()
  return (
    <section className="flex flex-col gap-6 min-w-0">
      <h2 className="font-display text-2xl font-medium tracking-tight">
        {t('tiers.compareTitle')}
      </h2>
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full min-w-[640px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-border">
              <th scope="col" className="w-1/3 p-4 text-left">
                <span className="sr-only">{t('tiers.compareFeature')}</span>
              </th>
              {tiers.map((tier) => (
                <th
                  key={tier.id}
                  scope="col"
                  className="p-4 text-center align-top font-normal"
                >
                  <div className="flex flex-col items-center gap-1">
                    <span className="font-display text-base font-medium">
                      {tier.name}
                    </span>
                    <span className="text-[13px] text-tertiary-foreground">
                      <TierPrice tier={tier} size="small" />
                    </span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {TIER_FEATURE_ORDER.map((key) => (
              <tr key={key} className="border-b border-border last:border-b-0">
                <th
                  scope="row"
                  className="p-4 text-left font-normal text-secondary-foreground"
                >
                  {featureLabel(t, key)}
                </th>
                {tiers.map((tier) => (
                  <td key={tier.id} className="p-4 text-center">
                    <FeatureCell
                      featureKey={key}
                      value={featureValue(tier.entitlements[key])}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

/**
 * A yes or a no is a mark, with its word kept for screen readers; anything
 * countable is written out. A column of "Included" reads as noise beside the
 * one cell that says something different.
 */
function FeatureCell({
  featureKey,
  value,
}: {
  featureKey: TierFeatureKey
  value: TierFeatureValue
}) {
  const { t } = useTranslation()
  if (value.kind === 'included') {
    return (
      <>
        <CheckIcon size={18} className="inline text-positive" aria-hidden />
        <span className="sr-only">{t('tiers.included')}</span>
      </>
    )
  }
  if (value.kind === 'excluded') {
    return (
      <>
        <MinusIcon
          size={18}
          className="inline text-senary-foreground"
          aria-hidden
        />
        <span className="sr-only">{t('tiers.excluded')}</span>
      </>
    )
  }
  return (
    <span className="font-medium">
      <FeatureValue featureKey={featureKey} value={value} />
    </span>
  )
}

/**
 * What one tier grants of one feature, in words — "25 per month", "Unlimited",
 * "Not included".
 */
function FeatureValue({
  featureKey,
  value,
}: {
  featureKey: TierFeatureKey
  value: TierFeatureValue
}) {
  const { t, i18n } = useTranslation()

  if (value.kind === 'included') return <>{t('tiers.included')}</>
  if (value.kind === 'excluded') return <>{t('tiers.excluded')}</>
  if (value.kind === 'unlimited') return <>{t('tiers.unlimited')}</>

  const write = (amount: number) => formatNumber(amount, {}, i18n.language)
  const written = isByteKey(featureKey)
    ? formatStorage(value.limit, write)
    : write(value.limit)
  return <>{t(limitKey(value.reset), { value: written })}</>
}

/**
 * How a tier *states* an allowance, which is not how a meter spends one: "10
 * per month" against "7 of 10 this month". Same reset words, different
 * sentences, and each one whole — where the period sits in the line is a
 * different answer in every language.
 */
function limitKey(reset: UsageReset | null) {
  switch (reset) {
    case 'monthly':
      return 'tiers.limitMonth' as const
    case 'total':
      return 'tiers.limitTotal' as const
    case 'per_post':
      return 'tiers.limitPost' as const
    // `standing` and an unrecognised word both land here: a ceiling that never
    // refills is stated as the bare number, which is what it is.
    default:
      return 'tiers.limitFlat' as const
  }
}
