import { memo, useCallback, useMemo, useState } from 'react'
import type { Post } from '@/types/posts'
import { useUpdatePost } from '@/hooks/usePosts'
import { postToPayload } from '@/services/api/posts'
import { canEditScheduledAt } from '@/lib/postStatusMachine'
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

const DEFAULT_HOUR = 9

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

function WeeklyCalendarComponent({ campaignId, posts, anchor }: WeeklyCalendarProps) {
  const [dragOverKey, setDragOverKey] = useState<string | null>(null)
  const today = useMemo(() => new Date(), [])
  const { mutate: updatePost } = useUpdatePost(campaignId)
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
                  'text-base font-display font-semibold leading-6',
                  col.isToday && 'text-positive',
                )}
              >
                {col.label}
              </span>
              <span
                className={cn(
                  'text-xs leading-4 text-tertiary-foreground tabular-nums',
                  col.isToday && 'text-positive',
                )}
              >
                {col.dateLabel}
              </span>
            </div>

            {/* Posts lane — drop target */}
            <div
              {...laneHandlers(col.key, col.day)}
              className={cn(
                'flex-1 min-h-0 overflow-y-auto bg-secondary px-2 py-2 flex flex-col gap-2 items-stretch transition-colors',
                dragOverKey === col.key && 'bg-quaternary',
              )}
            >
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
