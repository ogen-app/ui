import { useTranslation } from 'react-i18next'

import { formatNumber } from '@/lib/intl'
import {
  featureLabel,
  formatStorage,
  isByteKey,
  type TierFeature,
  type TierFeatureKey,
  type TierFeatureValue,
} from '@/lib/tierFeatures'
import { cn } from '@/lib'
import type { UsageReset } from '@/types/entitlements'

/**
 * What a tier allows, feature by feature — the body of a plan card.
 *
 * A list rather than a column of a table, because the cards stack on a narrow
 * screen and a table that reflows into three copies of its own header is worse
 * at the only job it had. Each row names its own feature, so a card read on its
 * own still says what it is offering.
 */
export function TierFeatureList({ features }: { features: TierFeature[] }) {
  const { t } = useTranslation()
  return (
    <ul className="flex flex-col gap-2 min-w-0">
      {features.map((feature) => (
        <li
          key={feature.key}
          className="flex items-baseline justify-between gap-4 text-[13px] min-w-0"
        >
          <span className="text-tertiary-foreground min-w-0">
            {featureLabel(t, feature.key)}
          </span>
          <span
            className={cn(
              'shrink-0 text-right',
              // An exclusion stays legible but stops competing for attention:
              // the reason to read a plan card is what it *does* include.
              feature.value.kind === 'excluded'
                ? 'text-senary-foreground'
                : 'font-medium',
            )}
          >
            <FeatureValue featureKey={feature.key} value={feature.value} />
          </span>
        </li>
      ))}
    </ul>
  )
}

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
