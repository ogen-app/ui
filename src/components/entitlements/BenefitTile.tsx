import type { TFunction } from 'i18next'
import { useTranslation } from 'react-i18next'
import {
  ArticleIcon,
  BooksIcon,
  BuildingsIcon,
  CalendarCheckIcon,
  GlobeIcon,
  HardDrivesIcon,
  MegaphoneIcon,
  PlugsConnectedIcon,
  SealCheckIcon,
  SlidersHorizontalIcon,
  SquaresFourIcon,
  StackIcon,
  UsersThreeIcon,
  type Icon,
} from '@phosphor-icons/react'

import { formatNumber } from '@/lib/intl'
import {
  formatStorage,
  type TierFeature,
  type TierFeatureKey,
} from '@/lib/tierFeatures'
import { cn } from '@/lib'

/** A mark per feature, so a column of tiles can be scanned before it is read. */
const ICON: Record<TierFeatureKey, Icon> = {
  team_seats: UsersThreeIcon,
  workspaces: BuildingsIcon,
  connected_accounts: PlugsConnectedIcon,
  multiple_accounts_per_platform: StackIcon,
  active_campaigns: MegaphoneIcon,
  all_campaign_types: SquaresFourIcon,
  custom_campaign_types: SlidersHorizontalIcon,
  plan_runs_per_month: CalendarCheckIcon,
  quality_reviews_per_post: SealCheckIcon,
  posts_total: ArticleIcon,
  content_bank_assets: BooksIcon,
  web_page_imports: GlobeIcon,
  media_storage_bytes: HardDrivesIcon,
}

type Counted = Exclude<
  TierFeatureKey,
  | 'media_storage_bytes'
  | 'multiple_accounts_per_platform'
  | 'all_campaign_types'
  | 'custom_campaign_types'
>
type Capability =
  | 'multiple_accounts_per_platform'
  | 'all_campaign_types'
  | 'custom_campaign_types'

const CAPABILITIES: readonly TierFeatureKey[] = [
  'multiple_accounts_per_platform',
  'all_campaign_types',
  'custom_campaign_types',
]

/**
 * A benefit's title, with its figure written into the sentence rather than
 * set against the right edge: "5 active campaigns", "1 GB of media storage".
 *
 * A counted feature the tier does not meter reads as unlimited — that is what
 * an allowance nobody counts means. Only improvements reach a tile, so an
 * exclusion never does.
 */
function benefitTitle(
  t: TFunction,
  feature: TierFeature,
  language: string,
): string {
  const { key, value } = feature
  if (CAPABILITIES.includes(key)) {
    return t(`tiers.paywall.benefit.${key as Capability}.included`)
  }
  if (key === 'media_storage_bytes') {
    return value.kind === 'limit'
      ? t('tiers.paywall.benefit.media_storage_bytes.limit', {
          value: formatStorage(value.limit, (n) =>
            formatNumber(n, {}, language),
          ),
        })
      : t('tiers.paywall.benefit.media_storage_bytes.unlimited')
  }
  const counted = key as Counted
  return value.kind === 'limit'
    ? t(`tiers.paywall.benefit.${counted}.limit`, { count: value.limit })
    : t(`tiers.paywall.benefit.${counted}.unlimited`)
}

/**
 * One benefit of the offered plan: its mark, a title carrying the figure, and
 * one line on what it is for.
 *
 * The primary tile — the feature that was refused — differs by style alone:
 * an accent edge, a tint and a teal mark. Same object, same three parts, so the
 * column reads as one list with its most important row first rather than a
 * headline and some footnotes.
 */
export function BenefitTile({
  feature,
  primary = false,
}: {
  feature: TierFeature
  primary?: boolean
}) {
  const { t, i18n } = useTranslation()
  const Mark = ICON[feature.key]
  return (
    <li
      className={cn(
        'flex flex-1 items-center gap-3 rounded-lg border px-4 py-3',
        primary ? 'border-accent bg-accent/10' : 'border-border',
      )}
    >
      <span
        className={cn(
          'flex size-9 shrink-0 items-center justify-center rounded-md',
          primary
            ? 'bg-accent text-primary'
            : 'bg-secondary text-tertiary-foreground',
        )}
      >
        <Mark size={18} weight={primary ? 'fill' : 'regular'} aria-hidden />
      </span>
      <span className="flex min-w-0 flex-col">
        <span className="text-sm font-medium">
          {benefitTitle(t, feature, i18n.language)}
        </span>
        <span className="truncate text-[13px] text-tertiary-foreground">
          {t(`tiers.paywall.benefit.${feature.key}.description`)}
        </span>
      </span>
    </li>
  )
}
