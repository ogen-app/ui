import { Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { SettingsCard } from '@/components/settings/SettingsCard'
import { Skeleton } from '@/components/ui/skeleton'
import { EMPTY_POST_BRAND, resolveVoice } from '@/components/brand/binding'
import type { BrandData } from '@/components/brand/types'
import { useBrand } from '@/hooks/useBrand'
import { useCampaigns } from '@/hooks/useCampaigns'
import { useLocale } from '@/hooks/useLocale'
import { usePlatformCatalog } from '@/hooks/usePlatforms'
import { cn } from '@/lib'
import { counted, formatDate, formatDateRange } from '@/lib/intl'
import type { Campaign } from '@/types/campaigns'

const DAY_MS = 24 * 60 * 60 * 1000

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

function todayUTC(): number {
  const now = new Date()
  return Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())
}

type Dated = { campaign: Campaign; start: number; end: number }

/** The span the axis covers: whole months, from the earliest start (or today) to the latest end. */
function axisOf(rows: Dated[], today: number): { from: number; to: number } {
  const first = Math.min(today, ...rows.map((r) => r.start))
  const last = Math.max(today, ...rows.map((r) => r.end))
  const a = new Date(first)
  const b = new Date(last)
  return {
    from: Date.UTC(a.getUTCFullYear(), a.getUTCMonth(), 1),
    // The first day of the month after the last one, so that month is whole.
    to: Date.UTC(b.getUTCFullYear(), b.getUTCMonth() + 1, 1),
  }
}

/** Each month's first day inside the axis. */
function monthsOf(axis: { from: number; to: number }): number[] {
  const out: number[] = []
  const d = new Date(axis.from)
  for (
    let t = axis.from;
    t < axis.to;
    d.setUTCMonth(d.getUTCMonth() + 1), t = d.getTime()
  ) {
    out.push(t)
  }
  return out
}

/**
 * Strategy for all campaigns, second half: every campaign on one time axis.
 *
 * **It is a plan, not a progress report.** The Overview's cards already say how
 * each campaign is doing — what needs attention, how far through its goal it
 * is — and a list of statuses here would be a second copy of them. What no
 * other screen shows is how the campaigns sit against each other: which ones
 * overlap, where the gaps are, what each commits to (its rate and channels),
 * and which voice it writes in — the one thing on this page that ties a
 * campaign back to the Foundation above it.
 *
 * Each row opens that campaign's Strategy, which is the same place narrowed.
 * A campaign with no dates is listed under the axis rather than left off it,
 * because a campaign nobody has scheduled is exactly the gap this view is for.
 */
export function CampaignTimeline() {
  const { t } = useTranslation()
  const locale = useLocale()
  const { data: campaigns, isPending } = useCampaigns()
  const { data: brand } = useBrand()

  if (isPending) {
    return (
      <SettingsCard title={t('campaigns.strategy.timeline.title')}>
        <div className="flex flex-col gap-3" aria-hidden>
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-4/5" />
        </div>
      </SettingsCard>
    )
  }

  const list = campaigns ?? []
  const dated: Dated[] = []
  const undated: Campaign[] = []
  for (const campaign of list) {
    const start = dayOf(campaign.start_date)
    const end = dayOf(campaign.end_date)
    if (start !== null && end !== null && end >= start)
      dated.push({ campaign, start, end })
    else undated.push(campaign)
  }
  dated.sort((a, b) => a.start - b.start || a.end - b.end)

  const today = todayUTC()
  const axis = axisOf(dated, today)
  const span = axis.to - axis.from
  const at = (t: number) => ((t - axis.from) / span) * 100
  const months = monthsOf(axis)
  // A label every month until they would crowd; then every second or third.
  const every = Math.max(1, Math.ceil(months.length / 8))

  return (
    <SettingsCard title={t('campaigns.strategy.timeline.title')}>
      {list.length === 0 ? (
        <p className="text-sm text-secondary-foreground">
          {t('campaigns.strategy.timeline.empty')}
        </p>
      ) : (
        <div className="flex flex-col">
          {dated.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-[minmax(0,15rem)_1fr] md:gap-x-6">
              <div className="hidden md:block" />
              <div className="relative h-6 text-xs text-tertiary-foreground">
                {months.map((month, i) =>
                  i % every === 0 ? (
                    <span
                      key={month}
                      className="absolute top-0 whitespace-nowrap"
                      style={{ left: `${at(month)}%` }}
                    >
                      {formatDate(
                        month,
                        {
                          month: 'short',
                          // The year where it turns, and on the first label.
                          ...(i === 0 || new Date(month).getUTCMonth() === 0
                            ? { year: 'numeric' }
                            : {}),
                          timeZone: 'UTC',
                        },
                        locale,
                      )}
                    </span>
                  ) : null,
                )}
              </div>
            </div>
          )}
          <ul className="flex flex-col">
            {dated.map((row) => (
              <TimelineRow
                key={row.campaign.id}
                row={row}
                brand={brand}
                today={today}
                left={at(row.start)}
                // The end day is inclusive, so the bar runs to its close.
                width={Math.max(at(row.end + DAY_MS) - at(row.start), 0.75)}
                todayAt={at(today)}
                months={months.map(at)}
                locale={locale}
              />
            ))}
            {undated.map((campaign) => (
              <li
                key={campaign.id}
                className="grid grid-cols-1 gap-y-1 border-t border-border py-3 md:grid-cols-[minmax(0,15rem)_1fr] md:gap-x-6"
              >
                <CampaignLabel campaign={campaign} brand={brand} />
                <p className="self-center text-sm text-tertiary-foreground">
                  {t('campaigns.strategy.timeline.undated')}
                </p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </SettingsCard>
  )
}

function TimelineRow({
  row,
  brand,
  today,
  left,
  width,
  todayAt,
  months,
  locale,
}: {
  row: Dated
  brand: BrandData | undefined
  today: number
  left: number
  width: number
  todayAt: number
  months: number[]
  locale: string
}) {
  const { t } = useTranslation()
  const ended = row.end < today
  const upcoming = row.start > today
  const when = formatDateRange(
    new Date(row.start),
    new Date(row.end),
    { day: 'numeric', month: 'short', timeZone: 'UTC' },
    locale,
  )

  return (
    <li className="grid grid-cols-1 gap-y-2 border-t border-border py-3 md:grid-cols-[minmax(0,15rem)_1fr] md:gap-x-6">
      <CampaignLabel campaign={row.campaign} brand={brand} when={when} />
      <div className="relative h-7 self-center">
        {/* Month rules, faint, so a bar can be read against the axis. */}
        {months.map((x) => (
          <span
            key={x}
            aria-hidden
            className="absolute inset-y-0 w-px bg-border"
            style={{ left: `${x}%` }}
          />
        ))}
        <Link
          to="/campaigns/$campaignId/strategy"
          params={{ campaignId: row.campaign.id }}
          aria-label={t('campaigns.strategy.timeline.barLabel', {
            name: row.campaign.name,
            window: when,
          })}
          className={cn(
            'absolute inset-y-1 transition-opacity hover:opacity-80',
            ended ? 'bg-quinary' : upcoming ? 'bg-accent/40' : 'bg-accent',
          )}
          style={{ left: `${left}%`, width: `${width}%` }}
        />
        <span
          aria-hidden
          className="absolute -inset-y-1 w-px bg-foreground"
          style={{ left: `${todayAt}%` }}
        />
      </div>
    </li>
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
            ? 'campaigns.strategy.timeline.perWeek'
            : 'campaigns.strategy.timeline.perMonth',
          counted(campaign.estimated_post_count),
        )
      : t('campaigns.strategy.timeline.noRate')
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
      ? t('campaigns.strategy.timeline.noVoice')
      : voice.source === 'library'
        ? t('campaigns.strategy.timeline.defaultVoice', {
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
          ? t('campaigns.strategy.timeline.windowAndRate', {
              window: when,
              rate,
            })
          : rate}
      </p>
      <p className="flex min-w-0 items-center gap-1.5 text-sm text-tertiary-foreground">
        {campaign.target_platforms.length === 0 ? (
          <span className="shrink-0 whitespace-nowrap">
            {t('campaigns.strategy.timeline.noPlatforms')}
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
