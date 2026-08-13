import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { PlusIcon } from '@phosphor-icons/react'
import type { Post } from '@/types/posts'
import { useAddPost } from '@/hooks/usePosts'
import { useCalendarDrop } from '@/hooks/useCalendarDrop'
import { useCalendarSettings } from '@/hooks/useCalendarSettings'
import { MonthDensity } from './MonthDensity'
import { MonthPostCard } from './MonthPostCard'
import { pickMonthRung } from './cardRungs'
import {
  isSameDay,
  isSameMonth,
  monthColumnDays,
  monthWeeks,
  weekdayShortLabel,
} from './date'
import { cn } from '@/lib'

type MonthlyCalendarProps = {
  campaignId: string
  posts: Post[]
  /** The anchor day from the route; the visible month is derived from it. */
  anchor: Date
}

/**
 * The lane height assumed until one has been measured — what a six-row month
 * on a normal window really comes to. Only ever visible for the first paint,
 * and the lane clips, so a wrong guess costs nothing but the chance that a
 * busy day shows cards for one frame before becoming a density.
 */
const ASSUMED_LANE_HEIGHT = 104

/** Whole days strictly before today — today itself still accepts posts. */
function isPastDay(day: Date): boolean {
  const startOfToday = new Date()
  startOfToday.setHours(0, 0, 0, 0)
  return day.getTime() < startOfToday.getTime()
}

/**
 * The whole month on one screen: whole weeks down, the user's visible weekdays
 * across, and no scrolling anywhere in the grid.
 *
 * That last constraint is what shapes everything else. A month row on a normal
 * screen is around 110px, so a cell holds three or four of the 20px cards and
 * no more — and because the row count varies between four and six, how many it
 * holds is not a number this component can hard-code. It measures one lane and
 * derives the capacity, then each day either lists its posts or, if there are
 * more than fit, collapses into `MonthDensity`. Nothing is ever half-shown.
 */
function MonthlyCalendarComponent({ campaignId, posts, anchor }: MonthlyCalendarProps) {
  /** Cell whose empty space the pointer is on — see the cell's onMouseOver. */
  const [hoverKey, setHoverKey] = useState<string | null>(null)
  const [laneHeight, setLaneHeight] = useState(ASSUMED_LANE_HEIGHT)
  const today = useMemo(() => new Date(), [])
  const addPost = useAddPost(campaignId)
  const { firstDayOfWeek, hiddenDays } = useCalendarSettings(campaignId)
  const { dragOverKey, laneHandlers } = useCalendarDrop(campaignId, posts)

  const weeks = useMemo(
    () => monthWeeks(anchor, firstDayOfWeek, hiddenDays),
    [anchor, firstDayOfWeek, hiddenDays],
  )
  const columnDays = useMemo(
    () => monthColumnDays(firstDayOfWeek, hiddenDays),
    [firstDayOfWeek, hiddenDays],
  )

  // Keyed by `toDateString()`, which is unique per calendar day — the grid
  // spans three months at the edges, so the day number alone would collide.
  const postsByDay = useMemo(() => {
    const map = new Map<string, Post[]>()
    for (const post of posts) {
      if (!post.scheduled_at) continue
      const key = new Date(post.scheduled_at).toDateString()
      const bucket = map.get(key)
      if (bucket) bucket.push(post)
      else map.set(key, [post])
    }
    // Within a day, earliest first — the cards carry a time, so any other
    // order reads as a mistake.
    for (const bucket of map.values()) {
      bucket.sort(
        (a, b) =>
          new Date(a.scheduled_at!).getTime() - new Date(b.scheduled_at!).getTime(),
      )
    }
    return map
  }, [posts])

  /**
   * The height a cell gives its cards, measured rather than assumed: it
   * depends on the viewport and on whether this month spans four rows or six.
   * One lane is enough — every cell in the grid is the same height.
   */
  const laneRef = useRef<HTMLDivElement | null>(null)
  useEffect(() => {
    const lane = laneRef.current
    if (!lane) return
    const observer = new ResizeObserver(([entry]) => {
      setLaneHeight(entry.contentRect.height)
    })
    observer.observe(lane)
    return () => observer.disconnect()
  }, [weeks.length])

  const cellMouseOver = useCallback((key: string, e: React.MouseEvent) => {
    // Same rule as the week column: the add affordance is off while the
    // pointer is on a post, so it can't surface mid-drag or invite a click
    // meant for the card underneath.
    setHoverKey((e.target as HTMLElement).closest('a') ? null : key)
  }, [])

  return (
    <div className="flex-1 flex flex-col min-h-0 min-w-0 gap-0.5">
      {/* Column headers — one weekday name per visible day, for the whole
          grid rather than per row. */}
      <div className="flex shrink-0 gap-0.5">
        {columnDays.map((day) => (
          <div
            key={day.getDay()}
            className="flex-1 min-w-0 bg-secondary px-2 py-1.5 text-center text-xs font-medium leading-4"
          >
            {weekdayShortLabel(day)}
          </div>
        ))}
      </div>

      {/* The month. Rows share the height evenly, which is what keeps the
          whole thing on one screen whether the month spans four rows or six. */}
      <div className="flex flex-1 min-h-0 flex-col gap-0.5">
        {weeks.map((week, weekIndex) => (
          <div key={week[0].toDateString()} className="flex flex-1 min-h-0 gap-0.5">
            {week.map((day, dayIndex) => {
              const key = day.toDateString()
              const dayPosts = postsByDay.get(key) ?? []
              const outside = !isSameMonth(day, anchor)
              // `null` means no card size fits this many — draw the summary.
              const rung = pickMonthRung(dayPosts.length, laneHeight)
              return (
                <div
                  key={key}
                  {...laneHandlers(key, day)}
                  onMouseOver={(e) => cellMouseOver(key, e)}
                  onMouseLeave={() => setHoverKey((k) => (k === key ? null : k))}
                  className={cn(
                    // No padding — same reasoning as the week lane, and more
                    // acute here: in a cell this narrow the inset was a tenth
                    // of the title's width.
                    'flex flex-1 min-w-0 min-h-0 flex-col overflow-hidden bg-secondary transition-colors',
                    // Spill days are real days — droppable, clickable, just
                    // quieter, so the eye lands on the month being read.
                    outside && 'bg-secondary/50',
                    dragOverKey === key && 'bg-quaternary',
                  )}
                >
                  {/* Date row — number on the left, add on the right.
                      The cell has no padding of its own (a 132px column can't
                      spare any on the side the titles run along), so the 2px
                      of top and right inset is here: the date sat in the
                      corner of the fill with nothing between it and the cell
                      above, which read as the number belonging to the grid
                      rather than to this day. 22px rather than 20 so the inset
                      is taken off the cell and not off the lane below — the
                      lane's height is what decides which card the day gets. */}
                  <div className="flex h-[22px] shrink-0 items-center justify-between gap-1 pt-0.5 pr-0.5">
                    <span
                      className={cn(
                        'text-xs leading-4 tabular-nums',
                        outside ? 'text-quaternary-foreground' : 'text-tertiary-foreground',
                        isSameDay(day, today) &&
                          'font-medium text-secondary-foreground underline decoration-2 underline-offset-2',
                      )}
                    >
                      {day.getDate()}
                    </span>

                    {/* The only way to create a post on this day, and the
                        month's answer to the week's dashed ADD POST — there is
                        no room here for a button with a word in it, so it is
                        the same idea at icon size, appearing on hover and on
                        keyboard focus.

                        Past days don't render it: the click path goes through
                        the plain create endpoint, which — unlike `schedule` —
                        never validates the date, so this is the only thing
                        keeping a post from being born already in the past. */}
                    {!isPastDay(day) && (
                      <button
                        type="button"
                        onClick={() => addPost(day)}
                        title={`Add a post on ${day.toLocaleDateString()}`}
                        className={cn(
                          'flex size-5 shrink-0 items-center justify-center cursor-pointer',
                          'text-tertiary-foreground transition-[opacity,background-color,color]',
                          hoverKey === key ? 'opacity-100' : 'opacity-0',
                          'focus-visible:opacity-100',
                          'hover:bg-primary hover:text-secondary-foreground',
                        )}
                      >
                        <PlusIcon weight="bold" className="size-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Posts lane. Measured on the first cell of the first row —
                      every cell is the same height, so one is the whole grid. */}
                  <div
                    ref={weekIndex === 0 && dayIndex === 0 ? laneRef : undefined}
                    className="flex flex-1 min-h-0 flex-col gap-0.5 overflow-hidden"
                  >
                    {rung === null ? (
                      <MonthDensity campaignId={campaignId} day={day} posts={dayPosts} />
                    ) : (
                      dayPosts.map((post) => (
                        <MonthPostCard key={post.id} post={post} rung={rung} />
                      ))
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}

export const MonthlyCalendar = memo(MonthlyCalendarComponent)
