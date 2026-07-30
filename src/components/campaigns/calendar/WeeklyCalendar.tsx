import { memo, useCallback, useMemo, useState } from 'react'
import { PlusIcon } from '@phosphor-icons/react'
import type { Post } from '@/types/posts'
import { useAddPost, useUpdatePost } from '@/hooks/usePosts'
import { postToPayload } from '@/services/api/posts'
import { canEditScheduledAt } from '@/lib/postStatusMachine'
import { DEFAULT_HOUR } from '@/lib/postSchedule'
import { useCalendarSettings } from '@/hooks/useCalendarSettings'
import { PostCard } from './PostCard'
import { addDays, isSameDay, startOfWeek } from './date'
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
}

/** Whole days strictly before today — today itself still accepts posts. */
function isPastDay(day: Date): boolean {
  const startOfToday = new Date()
  startOfToday.setHours(0, 0, 0, 0)
  return day.getTime() < startOfToday.getTime()
}

function WeeklyCalendarComponent({ campaignId, posts, anchor }: WeeklyCalendarProps) {
  const [dragOverKey, setDragOverKey] = useState<string | null>(null)
  /** Column whose empty space the pointer is on — see the column's onMouseOver. */
  const [hoverKey, setHoverKey] = useState<string | null>(null)
  const today = useMemo(() => new Date(), [])
  const { mutate: updatePost } = useUpdatePost(campaignId)
  const addPost = useAddPost(campaignId)
  const { firstDayOfWeek, hiddenDays } = useCalendarSettings(campaignId)

  const weekStart = useMemo(
    () => startOfWeek(anchor, firstDayOfWeek),
    [anchor, firstDayOfWeek],
  )
  const days = useMemo(
    () =>
      Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)).filter(
        (day) => !hiddenDays.includes(day.getDay()),
      ),
    [weekStart, hiddenDays],
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
    return map
  }, [posts, days])

  const columns = useMemo<Column[]>(
    () =>
      days.map((day) => ({
        key: day.toDateString(),
        label: day.toLocaleDateString(undefined, { weekday: 'long' }),
        dateLabel: `${day.getDate()} ${day.toLocaleDateString(undefined, { month: 'long' })} ${day.getFullYear()}`,
        day,
        isToday: isSameDay(day, today),
        posts: postsByDay.get(day.toDateString()) ?? [],
      })),
    [days, today, postsByDay],
  )

  const applyDrop = useCallback(
    (post: Post, targetDay: Date) => {
      // PostCard already refuses to start these drags; this guards the
      // drop side against stale cards and native link drags.
      if (!canEditScheduledAt(post.status)) return
      const orig = post.scheduled_at ? new Date(post.scheduled_at) : null
      if (orig && isSameDay(orig, targetDay)) return
      const next = new Date(
        targetDay.getFullYear(),
        targetDay.getMonth(),
        targetDay.getDate(),
        orig ? orig.getHours() : DEFAULT_HOUR,
        orig ? orig.getMinutes() : 0,
        orig ? orig.getSeconds() : 0,
      )
      updatePost({
        id: post.id,
        payload: { ...postToPayload(post), scheduled_at: next.toISOString() },
      })
    },
    [updatePost],
  )

  const laneHandlers = useCallback(
    (key: string, targetDay: Date) => ({
      onDragOver: (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault()
        e.dataTransfer.dropEffect = 'move'
        if (dragOverKey !== key) setDragOverKey(key)
      },
      onDragLeave: () => {
        setDragOverKey((k) => (k === key ? null : k))
      },
      onDrop: (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault()
        const id = e.dataTransfer.getData('text/plain')
        setDragOverKey(null)
        if (!id) return
        const post = posts.find((p) => p.id === id)
        if (post) applyDrop(post, targetDay)
      },
    }),
    [dragOverKey, posts, applyDrop],
  )

  return (
    // min-w-0 lets the calendar shrink to its grid cell so the day columns
    // scroll inside the wrapper below instead of pushing the whole component
    // past the viewport edge.
    <div className="flex-1 flex flex-col min-h-0 min-w-0 overflow-x-auto">
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
              {...laneHandlers(col.key, col.day)}
              className={cn(
                'flex-1 min-h-0 overflow-y-auto bg-secondary p-1 flex flex-col gap-2 items-stretch transition-colors',
                dragOverKey === col.key && 'bg-quaternary',
              )}
            >
              {col.posts.map((post) => (
                <PostCard key={post.id} post={post} />
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
