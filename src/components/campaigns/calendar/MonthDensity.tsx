import { memo, useMemo } from 'react'
import { Link } from '@tanstack/react-router'
import { CircleDashedIcon } from '@phosphor-icons/react'
import type { Post } from '@/types/posts'
import { getPlatformInfo } from '@/lib/platformDictionary'
import { formatAnchor } from './date'
import { cn } from '@/lib'

type Props = {
  campaignId: string
  day: Date
  posts: Post[]
}

/**
 * What a day looks like once its posts outnumber the rows the cell can hold:
 * the channel mix and how much of each, instead of three titles and a lie
 * about the rest.
 *
 * Grouped by platform rather than by post type or status because that is the
 * one thing a glyph can say without words — a cell is ~120px wide, and
 * "Instagram Reel ×3" does not fit where a logo and a number do. The titles
 * are not lost, they move one click away: the whole block opens the week that
 * contains this day, where the full cards live and drag works as it does now.
 */
function MonthDensityComponent({ campaignId, day, posts }: Props) {
  const groups = useMemo(() => {
    const counts = new Map<string, number>()
    for (const post of posts) {
      const key = post.platform_id || ''
      counts.set(key, (counts.get(key) ?? 0) + 1)
    }
    // Biggest first; then posts with no platform yet behind the ones that have
    // one, whatever their ids sort like — an unassigned group is the least
    // informative thing in the cell, and `''.localeCompare(...)` would put it
    // at the front. Ids break what's left, so equal counts don't reshuffle
    // between renders.
    return [...counts.entries()]
      .map(([id, count]) => ({ id, count, info: getPlatformInfo(id) }))
      .sort(
        (a, b) =>
          b.count - a.count ||
          Number(!a.id) - Number(!b.id) ||
          a.id.localeCompare(b.id),
      )
  }, [posts])

  return (
    <Link
      to="/campaigns/$campaignId/calendar/$anchor/$view"
      params={{ campaignId, anchor: formatAnchor(day), view: 'week' }}
      title={`${posts.length} posts on ${day.toLocaleDateString()} — open this week`}
      className={cn(
        'flex flex-wrap content-start items-center gap-x-2 gap-y-1 p-1',
        'cursor-pointer transition-colors hover:bg-quaternary',
      )}
    >
      {groups.map(({ id, count, info }) => {
        // Same neutral dashed circle the week card falls back to when a post
        // has no platform yet — an absence, not a warning.
        const Icon = info?.icon ?? CircleDashedIcon
        return (
          <span
            key={id || 'unassigned'}
            className="flex shrink-0 items-center gap-1 text-[11px]/4 text-secondary-foreground"
          >
            <Icon
              weight="fill"
              color={info?.color}
              className="size-3.5 shrink-0"
              aria-hidden
            />
            <span className="tabular-nums">{count}</span>
            <span className="sr-only">{info?.name ?? 'no platform'}</span>
          </span>
        )
      })}
    </Link>
  )
}

export const MonthDensity = memo(MonthDensityComponent)
