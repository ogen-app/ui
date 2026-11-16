import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { usePlatformCatalog } from '@/hooks/usePlatforms'
import { cn } from '@/lib'
import { contentSnapshot, SCHEDULED_STATUSES } from '@/lib/campaignReadiness.ts'
import {
  counted,
  formatDateRange,
  formatNumber,
  formatRelative,
} from '@/lib/intl'
import type { PlatformView } from '@/lib/platformDictionary'
import { normalizeGoalCadence, postGoalTotal } from '@/lib/postGoal'
import type { Campaign } from '@/types/campaigns'
import type { PostSummary } from '@/types/posts'
import { OverviewCard } from './OverviewCard.tsx'

const DAY_MS = 24 * 60 * 60 * 1000

/**
 * The campaign's own terms, as figures: when it runs and how far in it is,
 * how many posts it is aiming for and how many are out or on their way, and
 * the channels it publishes to with what each one carries.
 *
 * Only facts. A missing date or goal reads "Not set" and nothing more — what
 * to do about it is the to-do list's, in the other column.
 */
export function StrategyStats({
  campaign,
  posts,
  platformViews,
}: {
  campaign: Campaign
  /** Null until either the posts or the workspace summaries have answered. */
  posts: PostSummary[] | null
  platformViews: PlatformView[]
}) {
  const { t, i18n } = useTranslation()
  const { resolve } = usePlatformCatalog()

  return (
    <OverviewCard
      section="strategy"
      link={{ target: 'strategy', campaignId: campaign.id }}
    >
      <dl className="grid grid-cols-[6rem_minmax(0,1fr)] gap-x-4 gap-y-4 text-sm">
        <Fact term={t('campaignOverview.stats.window')}>
          <WindowFact campaign={campaign} locale={i18n.language} />
        </Fact>
        <Fact term={t('campaignOverview.stats.goal')}>
          <GoalFact campaign={campaign} posts={posts} />
        </Fact>
        <Fact term={t('campaignOverview.stats.channels')}>
          {campaign.target_platforms.length === 0 ? (
            <NotSet />
          ) : (
            <ul className="flex flex-col gap-1.5">
              {campaign.target_platforms.map((tp) => {
                const info = resolve(tp.id)
                const view = platformViews.find((v) => v.platform.id === tp.id)
                const connected = (view?.connectedPublishers.length ?? 0) > 0
                const count = posts?.filter(
                  (p) => p.platform_id === tp.id,
                ).length
                return (
                  <li key={tp.id} className="flex items-center gap-2 min-w-0">
                    {info && (
                      <info.icon
                        weight="fill"
                        className="size-4 shrink-0"
                        style={{ color: info.color }}
                        aria-hidden
                      />
                    )}
                    <span className="truncate">{info?.name ?? tp.id}</span>
                    {!connected && (
                      <span className="shrink-0 text-xs text-tertiary-foreground">
                        {t('campaignOverview.stats.notConnected')}
                      </span>
                    )}
                    {count !== undefined && (
                      <span className="ml-auto shrink-0 font-mono text-xs text-secondary-foreground">
                        {t(
                          'campaignOverview.stats.channelPosts',
                          counted(count),
                        )}
                      </span>
                    )}
                  </li>
                )
              })}
            </ul>
          )}
        </Fact>
      </dl>
    </OverviewCard>
  )
}

function Fact({ term, children }: { term: string; children: ReactNode }) {
  return (
    <>
      <dt className="text-tertiary-foreground leading-5">{term}</dt>
      <dd className="min-w-0 leading-5">{children}</dd>
    </>
  )
}

function NotSet() {
  const { t } = useTranslation()
  return (
    <span className="text-tertiary-foreground">
      {t('campaignOverview.stats.notSet')}
    </span>
  )
}

/** A date column's own day, as a count of days since the epoch — no zone. */
function dayIndex(value: string | null): number | null {
  const match = value ? /^(\d{4})-(\d{2})-(\d{2})/.exec(value) : null
  if (!match) return null
  return Date.UTC(+match[1], +match[2] - 1, +match[3]) / DAY_MS
}

function WindowFact({
  campaign,
  locale,
}: {
  campaign: Campaign
  locale: string
}) {
  const { t } = useTranslation()
  const start = dayIndex(campaign.start_date)
  const end = dayIndex(campaign.end_date)
  if (start == null || end == null || end < start) return <NotSet />

  const now = new Date()
  const today =
    Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) / DAY_MS
  const length = end - start + 1
  const day = today - start + 1
  // Drawn as local dates so the range names the days the columns hold.
  const asDate = (index: number) => {
    const d = new Date(index * DAY_MS)
    return new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())
  }

  const where =
    day < 1
      ? t('campaignOverview.stats.startsIn', {
          when: formatRelative(start - today, 'day', locale),
        })
      : day > length
        ? t('campaignOverview.stats.ended', {
            when: formatRelative(end - today, 'day', locale),
          })
        : t('campaignOverview.stats.dayOf', {
            day: formatNumber(day, {}, locale),
            total: formatNumber(length, {}, locale),
          })

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3">
        <span>
          {formatDateRange(
            asDate(start),
            asDate(end),
            { month: 'short', day: 'numeric', year: 'numeric' },
            locale,
          )}
        </span>
        <span className="text-xs text-secondary-foreground">{where}</span>
      </div>
      <Bar
        segments={[
          {
            share: Math.min(1, Math.max(0, day / length)),
            className: 'bg-secondary-foreground',
          },
        ]}
      />
    </div>
  )
}

function GoalFact({
  campaign,
  posts,
}: {
  campaign: Campaign
  posts: PostSummary[] | null
}) {
  const { t } = useTranslation()
  const cadence = normalizeGoalCadence(campaign.goal_cadence)
  const goal = postGoalTotal(
    campaign.estimated_post_count,
    cadence,
    campaign.start_date,
    campaign.end_date,
  )
  if (goal.kind === 'needs-count') return <NotSet />

  const rate = counted(campaign.estimated_post_count ?? 0)
  const snapshot = posts ? contentSnapshot(posts) : null
  const published = snapshot?.byStatus.published ?? 0
  const scheduled = posts
    ? posts.filter((p) => SCHEDULED_STATUSES.includes(p.status)).length
    : 0

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3">
        <span>
          {t('campaignOverview.stats.goalTotal', counted(goal.total))}
          <span className="text-tertiary-foreground">
            {' · '}
            {cadence === 'week'
              ? t('campaignOverview.stats.goalRateWeek', rate)
              : t('campaignOverview.stats.goalRateMonth', rate)}
          </span>
        </span>
        {snapshot && (
          <span className="text-xs text-secondary-foreground">
            {t('campaignOverview.stats.goalPublished', {
              published: formatNumber(published),
              scheduled: formatNumber(scheduled),
            })}
          </span>
        )}
      </div>
      <Bar
        segments={[
          { share: published / goal.total, className: 'bg-positive' },
          { share: scheduled / goal.total, className: 'bg-info' },
        ]}
      />
    </div>
  )
}

/** A thin track with its segments laid end to end, clipped at the full width. */
function Bar({
  segments,
}: {
  segments: { share: number; className: string }[]
}) {
  return (
    <div
      className="flex h-1.5 w-full overflow-hidden rounded-full bg-secondary"
      aria-hidden
    >
      {segments.map((s, i) => (
        <div
          key={i}
          className={cn('h-full shrink-0', s.className)}
          style={{ width: `${Math.min(1, Math.max(0, s.share)) * 100}%` }}
        />
      ))}
    </div>
  )
}
