import { useTranslation } from 'react-i18next'

import { formatNumber } from '@/lib/intl'
import {
  formatStorage,
  isByteKey,
  type TierFeature,
  type TierFeatureValue,
} from '@/lib/tierFeatures'
import { cn } from '@/lib'
import type { EntitlementKey, UsagePeriod } from '@/types/entitlements'

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
            {t(`tiers.features.${feature.key}` as const)}
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
  featureKey: EntitlementKey
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
  return <>{t(limitKey(value.period), { value: written })}</>
}

/**
 * How a tier *states* an allowance, which is not how a meter spends one: "10
 * per month" against "7 of 10 this month". Same periods, different sentences,
 * and each one whole — where the period sits in the line is a different answer
 * in every language.
 */
function limitKey(period: UsagePeriod | null) {
  switch (period) {
    case 'day':
      return 'tiers.limitDay' as const
    case 'month':
      return 'tiers.limitMonth' as const
    case 'post':
      return 'tiers.limitPost' as const
    case 'publish':
      return 'tiers.limitPublish' as const
    default:
      return 'tiers.limitFlat' as const
  }
}
