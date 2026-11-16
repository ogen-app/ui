import { Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { CircleDashedIcon } from '@phosphor-icons/react'
import { PostStatusBadge } from '@/components/posts/PostStatusBadge.tsx'
import { Skeleton } from '@/components/ui/skeleton.tsx'
import { LineItem, type LineItemIndicator } from '@/components/ui/line-item'
import { usePlatformCatalog } from '@/hooks/usePlatforms'
import { cn, formatTitle } from '@/lib'
import { contentSnapshot } from '@/lib/campaignReadiness.ts'
import { formatDate } from '@/lib/intl'
import type { PlatformInfo } from '@/lib/platformDictionary.ts'
import { relativeTime } from '@/lib/relativeTime.ts'
import type { Post, PostSummary } from '@/types/posts'
import { OverviewCard } from './OverviewCard.tsx'
import { StatTile } from './StatTile.tsx'

/** Rows under "Up next" — the card is a glance, the calendar is the list. */
const UP_NEXT = 3

/**
 * The posts as a pipeline: how many are being written, cleared to go, out,
 * and failed, then the next few to publish.
 *
 * The counts read the slim summaries the Campaigns list already fetched, so
 * they are on screen before this campaign's own posts arrive; "Up next" needs
 * the posts' titles and waits for them.
 */
export function PostsStats({
  campaignId,
  summaries,
  posts,
  failed,
}: {
  campaignId: string
  /** Null until either source has answered. */
  summaries: PostSummary[] | null
  /** The campaign's full posts, once they have arrived. */
  posts: Post[] | undefined
  /** The posts fetch failed and nothing was cached. */
  failed: boolean
}) {
  const { t } = useTranslation()
  const link = { target: 'calendar' as const, campaignId }

  if (!summaries) {
    return (
      <OverviewCard section="posts" link={link}>
        <Skeleton variant="surface" className="h-16 w-full" />
      </OverviewCard>
    )
  }

  const snapshot = contentSnapshot(summaries)
  const upNext = posts ? contentSnapshot(posts, UP_NEXT).upNext : null

  return (
    <OverviewCard
      section="posts"
      link={link}
      status={
        <span className="text-sm text-secondary-foreground">
          {snapshot.total}
        </span>
      }
    >
      <div className="grid grid-cols-2 gap-2 @md:grid-cols-4">
        <StatTile
          value={snapshot.notReady}
          label={t('campaignOverview.stats.inProgress')}
        />
        <StatTile
          value={snapshot.readyToGo}
          label={t('campaignOverview.stats.readyToGo')}
        />
        <StatTile
          value={snapshot.byStatus.published}
          label={t('campaignOverview.stats.published')}
        />
        <StatTile
          value={snapshot.byStatus.failed}
          label={t('campaignOverview.stats.failed')}
          tone={snapshot.byStatus.failed > 0 ? 'alert' : 'default'}
        />
      </div>

      {failed ? (
        <p className="text-sm text-tertiary-foreground">
          {t('campaignOverview.stats.postsFailed')}
        </p>
      ) : snapshot.total === 0 ? null : (
        <div className="flex flex-col gap-1">
          <h3 className="text-xs text-tertiary-foreground">
            {t('campaignOverview.stats.upNext')}
          </h3>
          {upNext === null ? (
            <Skeleton variant="surface" className="h-10 w-full" />
          ) : upNext.length === 0 ? (
            <p className="py-2 text-sm text-tertiary-foreground">
              {t('campaignOverview.stats.nothingScheduled')}
            </p>
          ) : (
            <ul className="flex flex-col">
              {upNext.map((post) => (
                <li key={post.id}>
                  <PostRow post={post} campaignId={campaignId} />
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </OverviewCard>
  )
}

/**
 * The platform's mark in a LineItem's 16px slot, drawn as the calendar draws
 * it: filled, in the platform's colour, a dashed circle where none is set.
 */
function platformIndicator(info: PlatformInfo | undefined): LineItemIndicator {
  const Mark = info?.icon ?? CircleDashedIcon
  return {
    kind: 'custom',
    node: (
      <Mark
        weight="fill"
        className={cn('size-4', !info && 'text-tertiary-foreground')}
        style={info ? { color: info.color } : undefined}
      />
    ),
  }
}

function PostRow({ post, campaignId }: { post: Post; campaignId: string }) {
  const { t, i18n } = useTranslation()
  const { resolve } = usePlatformCatalog()
  const time = post.scheduled_at
  return (
    <LineItem
      asChild
      indicator={platformIndicator(resolve(post.platform_id))}
      label={formatTitle(post.title, t('campaignOverview.stats.untitledPost'))}
      trailing={
        <>
          <PostStatusBadge status={post.status} />
          <span
            className="w-20 text-right"
            title={
              formatDate(
                time,
                { dateStyle: 'long', timeStyle: 'short' },
                i18n.language,
              ) ?? undefined
            }
          >
            {relativeTime(time) ?? t('campaignOverview.noDate')}
          </span>
        </>
      }
    >
      <Link
        to="/campaigns/$campaignId/posts/$postId"
        params={{ campaignId, postId: post.id }}
      />
    </LineItem>
  )
}
