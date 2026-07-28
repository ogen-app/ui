import { memo, useCallback, useMemo, useState } from 'react'
import type { Post } from '@/types/posts'
import { useAddPost, useUpdatePost } from '@/hooks/usePosts'
import { postToPayload } from '@/services/api/posts'
import { canEditScheduledAt } from '@/lib/postStatusMachine'
import { DEFAULT_HOUR } from '@/lib/postSchedule'
import { useCalendarSettingsStore } from '@/stores/calendarSettingsStore'
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
  const today = useMemo(() => new Date(), [])
  const { mutate: updatePost } = useUpdatePost(campaignId)
  const addPost = useAddPost(campaignId)
  const firstDayOfWeek = useCalendarSettingsStore((s) => s.firstDayOfWeek)
  const hiddenDays = useCalendarSettingsStore((s) => s.hiddenDays)

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

            {/* Posts lane — drop target, and a click target that starts a new
                post on this day. The click only counts on the lane's own empty
                space (target === currentTarget), so clicking a card still opens
                that card rather than creating a second post. Past lanes don't
                create: the click path goes through the plain create endpoint,
                which — unlike `schedule` — never validates the date, so a
                guard here is the only thing keeping a post from being born
                already in the past. */}
            <div
              {...laneHandlers(col.key, col.day)}
              onClick={(e) => {
                if (e.target !== e.currentTarget) return
                if (isPastDay(col.day)) return
                addPost(col.day)
              }}
              title={isPastDay(col.day) ? undefined : `Add a post on ${col.dateLabel}`}
              className={cn(
                'flex-1 min-h-0 overflow-y-auto bg-secondary px-2 py-2 flex flex-col gap-2 items-stretch transition-colors',
                !isPastDay(col.day) && 'cursor-pointer',
                dragOverKey === col.key && 'bg-quaternary',
              )}
            >
              {/* The lane itself is mouse-only (it can't be a button without
                  swallowing the cards inside it), so keyboard users get their
                  own control: invisible until focused via Tab. */}
              {!isPastDay(col.day) && (
                <button
                  type="button"
                  onClick={() => addPost(col.day)}
                  className="sr-only focus-visible:not-sr-only focus-visible:rounded-md focus-visible:border focus-visible:border-dashed focus-visible:border-quaternary focus-visible:px-2 focus-visible:py-1.5 focus-visible:text-xs focus-visible:text-secondary-foreground"
                >
                  Add a post on {col.dateLabel}
                </button>
              )}
              {col.posts.map((post) => (
                <PostCard key={post.id} post={post} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export const WeeklyCalendar = memo(WeeklyCalendarComponent)
