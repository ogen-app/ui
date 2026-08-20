import { memo, useCallback, useMemo, useRef, useState } from 'react'
import { PlusIcon } from '@phosphor-icons/react'
import type { Post } from '@/types/posts'
import { useAddPost } from '@/hooks/usePosts'
import { useCalendarDrop } from '@/hooks/useCalendarDrop'
import { useCalendarSettings } from '@/hooks/useCalendarSettings'
import { usePlatformViews } from '@/hooks/usePlatforms'
import { resolveForPlatform } from '@/lib/publishingAccount'
import { hasVisibleProblem } from '@/lib/postValidation'
import { MonthDensity } from './MonthDensity'
import { PostCard } from './PostCard'
import { isDateLocked } from './LockMark'
import { fitMonthCell } from './cardRungs'
import { comparePostOrder } from '@/lib/postOrder'
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
 * screen is around 110px, and because the row count varies between four and
 * six, how much a cell holds is not a number this component can hard-code. It
 * measures one lane and asks `fitRung` what fits, then each day either lists
 * its posts or, if no rung holds them all, collapses into `MonthDensity`.
 * Nothing is ever half-shown.
 *
 * The cards are the week's cards — the same component, the same ladder, the
 * user's month settings. There is no separate month card any more: two
 * components drawing the same object drifted, and the thing that actually
 * differs between the views is the room and the preferences, both of which are
 * arguments rather than a second implementation. A month cell holds fewer
 * posts than it did as a result, which is what `DEFAULT_MONTH_FIELDS` starting
 * with the platform switched off is there to pay for.
 */
function MonthlyCalendarComponent({ campaignId, posts, anchor }: MonthlyCalendarProps) {
  /** Cell whose empty space the pointer is on — see the cell's onMouseOver. */
  const [hoverKey, setHoverKey] = useState<string | null>(null)
  const [laneHeight, setLaneHeight] = useState(ASSUMED_LANE_HEIGHT)
  const today = useMemo(() => new Date(), [])
  const addPost = useAddPost(campaignId)
  const { firstDayOfWeek, hiddenDays, card } = useCalendarSettings(campaignId)
  const fields = card.month
  // The same fields with the pictures off, for the days that can't afford
  // them (see `fitMonthCell`). Built once rather than per cell: the object's
  // identity is a `memo` prop on every card, so a fresh one each render would
  // re-render the whole grid on every pointer move.
  const fieldsUnbacked = useMemo(() => ({ ...fields, image: false }), [fields])
  const { dragOverKey, laneHandlers } = useCalendarDrop(campaignId, posts)
  // One read of the cached platform list for the whole grid, as in the week —
  // the cards call the hook form for themselves and get the same answer.
  const platformViews = usePlatformViews()

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
    // Within a day, the order the arrow keys walk (time, then id) — the same
    // rule as the week column, so the two views and ←/→ never disagree, and
    // an unparseable date can't NaN its way to the front.
    for (const bucket of map.values()) {
      bucket.sort(comparePostOrder)
    }
    return map
  }, [posts])

  /**
   * The height a cell gives its cards, measured rather than assumed: it
   * depends on the viewport and on whether this month spans four rows or six.
   * One lane is enough — every cell in the grid is the same height.
   */
  const laneObserver = useRef<ResizeObserver | null>(null)
  // A callback ref, not an effect: cells are keyed by day, so paging to
  // another month replaces the measured node — and adjacent months usually
  // share a row count, so an effect keyed on `weeks.length` kept watching the
  // detached lane and the ladder went blind to every later resize.
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
              // The same facts the week column feeds the ladder — a card's
              // height depends on what the post has, not only on how many of
              // them there are. Resolved from one platform-list read rather
              // than a hook per row.
              const facts = dayPosts.map((post) => ({
                hasTime: Boolean(post.scheduled_at ?? post.published_at),
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
                hasImage: Boolean(post.media_urls[0]),
              }))
              // `null` means the day fits at no rung, with or without its
              // pictures — draw the summary. A cell cannot scroll the way a
              // week column can, so this is where the two views' answers to a
              // full lane part company.
              const fit = fitMonthCell(facts, laneHeight, fields)
              // A day that had to give up its pictures draws the same cards
              // with the field off, so nothing below has to know why.
              const cellFields = fit?.image === false ? fieldsUnbacked : fields
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
                    //
                    // And nothing clips: a hovered card's shadow reaches a few
                    // pixels past it on every side, and a cell that clipped
                    // sheared it off flush with the card's own edge — which
                    // reads as a rendering fault rather than as elevation. The
                    // ladder is what keeps that safe: a cell only ever draws a
                    // stack it has measured as fitting, or a density instead,
                    // so there is nothing here that needed clipping to be
                    // contained.
                    'flex flex-1 min-w-0 min-h-0 flex-col bg-secondary transition-colors',
                    // Spill days are real days — droppable, clickable, just
                    // quieter, so the eye lands on the month being read.
                    outside && 'bg-secondary/50',
                    dragOverKey === key && 'bg-quaternary',
                  )}
                >
                  {/* Date row — number on the left, add on the right.
                      The cell has no padding of its own (a 132px column can't
                      spare any on the side the titles run along), so the inset
                      is here: the date sat in the corner of the fill with
                      nothing between it and the cell above, which read as the
                      number belonging to the grid rather than to this day. 4px
                      on the left, where it is the number against the cell's
                      edge and a hairline is not enough; 2px top and right,
                      which is all a corner needs. 22px rather than 20 so the
                      inset is taken off the cell and not off the lane below —
                      the lane's height is what decides which card the day
                      gets. */}
                  <div className="flex h-[22px] shrink-0 items-center justify-between gap-1 pt-0.5 pr-0.5 pl-1">
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
                    className="flex flex-1 min-h-0 flex-col gap-0.5"
                  >
                    {fit === null ? (
                      <MonthDensity campaignId={campaignId} day={day} posts={dayPosts} />
                    ) : (
                      dayPosts.map((post) => (
                        <PostCard
                          key={post.id}
                          post={post}
                          rung={fit.rung}
                          fields={cellFields}
                          band="compact"
                        />
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
