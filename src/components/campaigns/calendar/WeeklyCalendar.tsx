import { memo, useCallback, useMemo, useRef, useState } from 'react'
import { PlusIcon } from '@phosphor-icons/react'
import type { Post } from '@/types/posts'
import { useAddPost } from '@/hooks/usePosts'
// The drop logic that used to sit inline here — `useUpdatePost`,
// `postToPayload`, `DEFAULT_HOUR` and the rest — now lives in this hook, which
// the month view shares. Only the ordering rule stayed behind, because it is
// about how a column reads rather than about dropping into one.
import { useCalendarDrop } from '@/hooks/useCalendarDrop'
import { comparePostOrder } from '@/lib/postOrder'
import { useCalendarSettings } from '@/hooks/useCalendarSettings'
import { usePlatformViews } from '@/hooks/usePlatforms'
import { resolveForPlatform } from '@/lib/publishingAccount'
import { hasVisibleProblem } from '@/lib/postValidation'
import { isDateLocked } from './LockMark'
import { PostCard } from './PostCard'
import { CARD_RUNGS, pickRung, stackHeight, type CardRung } from './cardRungs'
import { dayLabel, isSameDay, visibleWeekDays, weekdayLabel } from './date'
import { cn } from '@/lib'

type WeeklyCalendarProps = {
  campaignId: string
  posts: Post[]
  /** The anchor day from the route; the visible week is derived from it. */
  anchor: Date
}

type Column = {
  key: string
  /** Full weekday name, e.g. "Monday". */
  label: string
  /** Full date, e.g. "20 July 2026". */
  dateLabel: string
  day: Date
  isToday: boolean
  posts: Post[]
  /** How much of itself every card in this column shows — see `cardRungs`. */
  rung: CardRung
  /**
   * Whether the cards, at that rung, still add up to more than the lane holds.
   * Decides whether the lane scrolls — and scrolling is what clips a hovered
   * card's shadow, so a column that fits is left un-clipped.
   */
  overflows: boolean
}

/**
 * The ADD POST button holds its space even at `opacity-0`: `h-9` (36px) plus
 * the lane's `gap-0.5` (2px) above it. (Its `gap-2` is the horizontal gap
 * between icon and label — nothing vertical.)
 */
const ADD_BUTTON_SPACE = 38

/** Whole days strictly before today — today itself still accepts posts. */
function isPastDay(day: Date): boolean {
  const startOfToday = new Date()
  startOfToday.setHours(0, 0, 0, 0)
  return day.getTime() < startOfToday.getTime()
}

function WeeklyCalendarComponent({ campaignId, posts, anchor }: WeeklyCalendarProps) {
  /** Column whose empty space the pointer is on — see the column's onMouseOver. */
  const [hoverKey, setHoverKey] = useState<string | null>(null)
  const today = useMemo(() => new Date(), [])
  const addPost = useAddPost(campaignId)
  const { firstDayOfWeek, hiddenDays, card } = useCalendarSettings(campaignId)
  const fields = card.week
  const { dragOverKey, laneHandlers } = useCalendarDrop(campaignId, posts)
  // One read of the cached platform list for the whole grid; the cards call
  // the hook form for themselves and get the same answer.
  const platformViews = usePlatformViews()

  const days = useMemo(
    () => visibleWeekDays(anchor, firstDayOfWeek, hiddenDays),
    [anchor, firstDayOfWeek, hiddenDays],
  )

  const postsByDay = useMemo(() => {
    const map = new Map<string, Post[]>()
    for (const day of days) {
      map.set(day.toDateString(), [])
    }
    for (const post of posts) {
      if (!post.scheduled_at) continue
      const postDate = new Date(post.scheduled_at)
      for (const day of days) {
        if (isSameDay(postDate, day)) {
          map.get(day.toDateString())!.push(post)
          break
        }
      }
    }
    // Each column in the order the arrow keys walk (time, then id) — the
    // server's list order isn't time-sorted within a day, and a grid that
    // shows [11:00, 09:00] while ←/→ visit [09:00, 11:00] reads as broken.
    for (const column of map.values()) {
      column.sort(comparePostOrder)
    }
    return map
  }, [posts, days])

  /**
   * The lane's content height, which is all the ladder needs: every column is
   * `flex-1` off the same floor, so one lane describes them all. Height alone
   * since the picture moved to the card's background — nothing on the ladder
   * is measured in the card's width any more. `ResizeObserver` fires once on
   * `observe`, so this is also the first measurement; until it lands, cards
   * draw at the roomiest rung.
   */
  const [laneHeight, setLaneHeight] = useState<number | null>(null)
  const laneObserver = useRef<ResizeObserver | null>(null)
  // A callback ref, not an effect: the columns are keyed by day, so paging to
  // another week replaces the measured node — an observer bound once on mount
  // would keep watching the detached lane and the ladder would go blind to
  // every resize after the first navigation.
  const laneRef = useCallback((lane: HTMLDivElement | null) => {
    laneObserver.current?.disconnect()
    laneObserver.current = null
    if (!lane) return
    const observer = new ResizeObserver(([entry]) => {
      setLaneHeight(entry.contentRect.height)
    })
    observer.observe(lane)
    laneObserver.current = observer
  }, [])

  const columns = useMemo<Column[]>(
    () =>
      days.map((day) => {
        const dayPosts = postsByDay.get(day.toDateString()) ?? []
        // Past days draw no ADD POST button, so they have that much more room
        // for cards — the rung is per column, and so is what is in the column.
        const available =
          laneHeight === null ? 0 : laneHeight - (isPastDay(day) ? 0 : ADD_BUTTON_SPACE)
        const facts = dayPosts.map((post) => ({
          hasTime: Boolean(post.scheduled_at ?? post.published_at),
          // Resolved exactly as the card resolves it, from one platform-list
          // read rather than a hook per row — see `resolveForPlatform`. A card
          // keeping its indicator row is a card the ladder has to budget for.
          hasFlag:
            isDateLocked(post.status) ||
            hasVisibleProblem(
              post,
              resolveForPlatform(
                platformViews,
                post.platform_id,
                post.social_account_id,
                post.social_account,
              ),
            ),
          // Truthiness, exactly as the card decides whether to draw the band
          // (`media_urls[0]` there too) — `length > 0` would charge a 100px
          // band for a post whose first URL is the empty string.
          hasImage: Boolean(post.media_urls[0]),
        }))
        const rung =
          laneHeight === null ? CARD_RUNGS[0] : pickRung(facts, available, fields)
        return {
          key: day.toDateString(),
          label: weekdayLabel(day),
          dateLabel: dayLabel(day),
          day,
          isToday: isSameDay(day, today),
          posts: dayPosts,
          rung,
          // The same arithmetic the rung was picked with, asked one more
          // question. It errs high — `cardHeight` rounds a title line up —
          // so the answer is "scrolls" in the borderline case, which is the
          // safe direction: a clipped shadow beats a lane that can't reach its
          // last card.
          overflows: laneHeight !== null && stackHeight(rung, facts, fields) > available,
        }
      }),
    [days, today, postsByDay, laneHeight, platformViews, fields],
  )

  return (
    // min-w-0 lets the calendar shrink to its grid cell so the day columns
    // scroll inside the wrapper below instead of pushing the whole component
    // past the viewport edge.
    //
    // `-mx-1 px-1` is the scroller's own doing and cancels out: a scroll
    // container clips at its padding box, so without the 4px the first and last
    // columns would shear the side off a hovered card's shadow (`--shadow-md`
    // reaches 4px). The negative margin gives those 4px back to the layout, so
    // the grid still starts and ends exactly where the toolbar above it does.
    <div className="flex-1 flex flex-col min-h-0 min-w-0 overflow-x-auto -mx-1 px-1">
      {/* gap-0.5 = the 2px gutters between columns; the page background
          shows through as the divider. */}
      <div className="flex h-full gap-0.5">
        {columns.map((col) => (
          <div
            key={col.key}
            // Hover is tracked here rather than through `group-hover`, because
            // the affordance has to be off while the pointer is on a card —
            // and "hovered, but not over a card" is a condition CSS can only
            // express with `:has()`, which loses the cascade against the
            // resting `opacity-0`. `onMouseOver` bubbles from whatever is
            // under the pointer, so the card test is just its ancestry.
            onMouseOver={(e) =>
              setHoverKey(
                (e.target as HTMLElement).closest('a') ? null : col.key,
              )
            }
            onMouseLeave={() =>
              setHoverKey((k) => (k === col.key ? null : k))
            }
            className="flex flex-col min-w-[150px] flex-1 min-h-0 gap-0.5"
          >
            {/* Column header — weekday over the full date, centered. */}
            <div className="shrink-0 bg-secondary px-2 pt-2.5 pb-2 flex flex-col items-center gap-0.5">
              <span
                className={cn(
                  'text-base font-medium leading-6',
                  col.isToday && 'underline decoration-2 underline-offset-2',
                )}
              >
                {col.label}
              </span>
              <span className="text-xs leading-4 text-tertiary-foreground tabular-nums">
                {col.dateLabel}
              </span>
            </div>

            {/* Posts lane — a drop target, and nothing else clickable. It
                used to create a post wherever you clicked its empty space,
                which fired on every misjudged drag and every click meant for
                the whitespace beside a card. Creating is the button's job
                now; the lane just holds posts. */}
            <div
              ref={col.key === columns[0]?.key ? laneRef : undefined}
              {...laneHandlers(col.key, col.day)}
              className={cn(
                // No padding at all, with 2px between cards — the same as the
                // month's cells. The lane is a container, not a frame: every
                // pixel it keeps for itself is a pixel off the card, and at a
                // 150px column that is the difference between a title fitting
                // and clamping. What separates a card from the lane's fill is
                // the gap, not a frame.
                //
                // It used to hold 4px each side for the hovered card's shadow:
                // `--shadow-md` here is `0 5px 10px -1px`, so it reaches 4px
                // past the card sideways, and every box that clips this lane —
                // itself when it scrolls, the grid's `overflow-x-auto` at the
                // first and last column — clips at the padding box. That inset
                // is gone, so in those two cases the side of the shadow is
                // sheared off flush with the card. The cost is only visible
                // while hovering; the inset was visible always, on every card
                // and on the dashed ADD POST below them.
                'flex-1 min-h-0 bg-secondary flex flex-col gap-0.5 items-stretch transition-colors',
                // And the lane only scrolls when it has to, because a scroll
                // container clips on *both* axes however little scrolling it is
                // doing — so `overflow-y-auto` on a lane with room to spare was
                // cutting the shadow off downwards for nothing.
                col.overflows ? 'overflow-y-auto' : 'overflow-visible',
                dragOverKey === col.key && 'bg-quaternary',
              )}
            >
              {col.posts.map((post) => (
                <PostCard key={post.id} post={post} rung={col.rung} fields={fields} />
              ))}

              {/* The only way to create a post on this day. Kept at a whisper
                  — a day's content is its posts, and an empty day should read
                  as empty rather than as a row of buttons — so it fades in
                  while the pointer is on this column, or while it has keyboard
                  focus. A card under the cursor means the user is reading or
                  about to drag that post, not adding another, so it goes back
                  off; that also keeps it from surfacing mid-drag.

                  Past days don't render it: the click path goes through the
                  plain create endpoint, which — unlike `schedule` — never
                  validates the date, so this is the only thing keeping a post
                  from being born already in the past. */}
              {!isPastDay(col.day) && (
                <button
                  type="button"
                  onClick={() => addPost(col.day)}
                  title={`Add a post on ${col.dateLabel}`}
                  className={cn(
                    'shrink-0 flex h-9 items-center justify-center gap-2 cursor-pointer',
                    // Typography lifted from the toolbar's ADD POST (the
                    // `default` button variant): same 13px/16 medium, same
                    // 2-unit gap, same 16px bold icon. The two buttons do the
                    // same thing, so only their weight in the page should
                    // differ — this one says it in a dashed outline that
                    // isn't there until you look for it.
                    'border border-dashed border-border text-[13px]/4 font-medium text-tertiary-foreground',
                    'transition-[opacity,background-color,color]',
                    hoverKey === col.key ? 'opacity-100' : 'opacity-0',
                    'focus-visible:opacity-100',
                    'hover:bg-primary hover:text-secondary-foreground',
                  )}
                >
                  <PlusIcon weight="bold" className="size-4 shrink-0" />
                  <span>ADD POST</span>
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export const WeeklyCalendar = memo(WeeklyCalendarComponent)
