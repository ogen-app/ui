import { Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { EMPTY_POST_BRAND, resolveVoice } from '@/components/brand/binding'
import type { BrandData } from '@/components/brand/types'
import { useBrand } from '@/hooks/useBrand'
import { useCampaigns } from '@/hooks/useCampaigns'
import { useLocale } from '@/hooks/useLocale'
import { usePlatformCatalog } from '@/hooks/usePlatforms'
import { counted, formatDateRange } from '@/lib/intl'
import type { Campaign } from '@/types/campaigns'

/**
 * A stored date's own day, as UTC midnight. The digits are read rather than
 * the instant, for `lib/postGoal`'s reason: `end_date` is the day at
 * `T00:00:00`, and parsing it in the browser's zone lands it on the day before
 * anywhere west of UTC.
 */
function dayOf(value: string | null): number | null {
  const match = value ? /^(\d{4})-(\d{2})-(\d{2})/.exec(value) : null
  if (!match) return null
  return Date.UTC(+match[1], +match[2] - 1, +match[3])
}

type Row = { campaign: Campaign; window: [number, number] | null }

/**
 * Strategy for all campaigns, beside the hub: every campaign, with what it
 * commits to (its dates, rate and channels) and which voice it writes in —
 * the one thing on this page that ties a campaign back to the Foundation
 * above it. A plan, not a progress report: how each one is doing is its
 * Overview's.
 *
 * In the order they start, and a campaign with no dates last rather than
 * left off. Each row opens that campaign's Strategy, which is the same place
 * narrowed.
 */
export function StrategyCampaigns() {
  const { t } = useTranslation()
  const locale = useLocale()
  const { data: campaigns, isPending } = useCampaigns()
  const { data: brand } = useBrand()

  const rows: Row[] = (campaigns ?? []).map((campaign) => {
    const start = dayOf(campaign.start_date)
    const end = dayOf(campaign.end_date)
    return {
      campaign,
      window:
        start !== null && end !== null && end >= start ? [start, end] : null,
    }
  })
  rows.sort(
    (a, b) =>
      (a.window?.[0] ?? Infinity) - (b.window?.[0] ?? Infinity) ||
      (a.window?.[1] ?? 0) - (b.window?.[1] ?? 0),
  )

  return (
    <Card title={t('campaigns.strategy.campaigns.title')}>
      {isPending ? (
        <div className="flex flex-col gap-3" aria-hidden>
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-4/5" />
        </div>
      ) : rows.length === 0 ? (
        <p className="text-sm text-secondary-foreground">
          {t('campaigns.strategy.campaigns.empty')}
        </p>
      ) : (
        <ul className="flex flex-col">
          {rows.map(({ campaign, window }) => (
            <li
              key={campaign.id}
              className="border-t border-border py-3 first:border-t-0 first:pt-0 last:pb-0"
            >
              <CampaignLabel
                campaign={campaign}
                brand={brand}
                when={
                  window
                    ? formatDateRange(
                        new Date(window[0]),
                        new Date(window[1]),
                        { day: 'numeric', month: 'short', timeZone: 'UTC' },
                        locale,
                      )
                    : undefined
                }
              />
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}

/**
 * The row's left column: the campaign's name, which opens its Strategy, and
 * what it commits to — dates and rate, then its channels and its voice.
 */
function CampaignLabel({
  campaign,
  brand,
  when,
}: {
  campaign: Campaign
  brand: BrandData | undefined
  when?: string
}) {
  const { t } = useTranslation()
  const catalog = usePlatformCatalog()
  const rate =
    campaign.estimated_post_count && campaign.estimated_post_count > 0
      ? t(
          campaign.goal_cadence === 'week'
            ? 'campaigns.strategy.campaigns.perWeek'
            : 'campaigns.strategy.campaigns.perMonth',
          counted(campaign.estimated_post_count),
        )
      : t('campaigns.strategy.campaigns.noRate')
  const voice = brand
    ? resolveVoice(
        brand,
        {
          voiceId: campaign.brand_voice_id,
          audienceId: campaign.brand_audience_id,
        },
        EMPTY_POST_BRAND,
      )
    : null
  const voiceLine =
    !voice || !voice.voice
      ? t('campaigns.strategy.campaigns.noVoice')
      : voice.source === 'library'
        ? t('campaigns.strategy.campaigns.defaultVoice', {
            voice: voice.voice.name,
          })
        : voice.voice.name

  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <Link
        to="/campaigns/$campaignId/strategy"
        params={{ campaignId: campaign.id }}
        className="truncate font-medium text-foreground hover:underline"
      >
        {campaign.name}
      </Link>
      <p className="truncate text-sm text-secondary-foreground">
        {when
          ? t('campaigns.strategy.campaigns.windowAndRate', {
              window: when,
              rate,
            })
          : rate}
      </p>
      <p className="flex min-w-0 items-center gap-1.5 text-sm text-tertiary-foreground">
        {campaign.target_platforms.length === 0 ? (
          <span className="shrink-0 whitespace-nowrap">
            {t('campaigns.strategy.campaigns.noPlatforms')}
          </span>
        ) : (
          campaign.target_platforms.map((p) => {
            const info = catalog.resolve(p.id)
            const Icon = info?.icon
            return Icon ? (
              <Icon
                key={p.id}
                className="size-4 shrink-0"
                weight="fill"
                aria-label={info.name}
              />
            ) : null
          })
        )}
        <span aria-hidden className="shrink-0">
          ·
        </span>
        <span className="truncate">{voiceLine}</span>
      </p>
    </div>
  )
}
