import { memo, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from '@tanstack/react-router'
import { CheckIcon, CircleDashedIcon } from '@phosphor-icons/react'
import type { Post } from '@/types/posts'
import { usePlatformCatalog } from '@/hooks/usePlatforms'
import { formatDate } from '@/lib/intl'
import { formatAnchor } from './date'
import { useCalendarSelection } from './calendarSelection'
import { counted } from '@/lib/intl'
import { cn } from '@/lib'

type Props = {
  /** `null` on the workspace calendar — the week it opens is that grid's own. */
  campaignId: string | null
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
 *
 * It opens the week of whichever calendar it is in — the campaign's, or the
 * workspace's — because the density is a summary of what that grid is showing
 * and stepping out of it would answer a different question. Written as two
 * branches rather than one `to` built from a condition: a `<Link>` takes its
 * param types from a literal `to`, and a union spread in types as neither (the
 * same reason `BackToPosts` is written twice over).
 */
function MonthDensityComponent({ campaignId, day, posts }: Props) {
  const { t, i18n } = useTranslation()
  const { resolve } = usePlatformCatalog()
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
      .map(([id, count]) => ({ id, count, info: resolve(id) }))
      .sort(
        (a, b) =>
          b.count - a.count ||
          Number(!a.id) - Number(!b.id) ||
          a.id.localeCompare(b.id),
      )
  }, [posts, resolve])

  // Posts ticked in a day too busy to draw its cards (CON-486): the summary
  // says how many and is outlined as a ticked card is, so a selection — the
  // assistant's included — is never invisible. The ticks themselves are made
  // on the week, one click away.
  const selection = useCalendarSelection()
  const ticked = selection
    ? posts.filter((p) => selection.ticked.has(p.id)).length
    : 0

  const anchor = formatAnchor(day)
  const shared = {
    title: t('calendar.density', {
      count: posts.length,
      date: formatDate(day, { dateStyle: 'long' }, i18n.language),
    }),
    className: cn(
      'flex flex-wrap content-start items-center gap-x-2 gap-y-1 p-1',
      'cursor-pointer transition-colors hover:bg-quaternary',
      ticked > 0 && 'outline-2 -outline-offset-2 outline-foreground',
    ),
  }

  const marks = (
    <>
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
            <span className="sr-only">
              {info?.name ?? t('posts.noPlatform')}
            </span>
          </span>
        )
      })}
      {ticked > 0 && (
        <span className="flex shrink-0 items-center gap-0.5 text-[11px]/4 font-medium text-foreground">
          <CheckIcon weight="bold" className="size-3 shrink-0" aria-hidden />
          <span className="tabular-nums">
            {t('calendar.densityTicked', counted(ticked))}
          </span>
        </span>
      )}
    </>
  )

  return campaignId === null ? (
    <Link
      to="/calendar/$anchor/$view"
      params={{ anchor, view: 'week' }}
      {...shared}
    >
      {marks}
    </Link>
  ) : (
    <Link
      to="/campaigns/$campaignId/calendar/$anchor/$view"
      params={{ campaignId, anchor, view: 'week' }}
      {...shared}
    >
      {marks}
    </Link>
  )
}

export const MonthDensity = memo(MonthDensityComponent)
