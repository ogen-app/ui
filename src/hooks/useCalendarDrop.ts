import { useCallback, useState } from 'react'
import type { Post } from '@/types/posts'
import { useUpdatePost } from '@/hooks/usePosts'
import { postToPayload } from '@/services/api/posts'
import { canEditScheduledAt } from '@/lib/postStatusMachine'
import { DEFAULT_HOUR } from '@/lib/postSchedule'
import { isSameDay } from '@/components/campaigns/calendar/date'

/**
 * Dragging a post onto a day, shared by the week columns and the month cells.
 *
 * The two views draw a day completely differently but mean exactly the same
 * thing by a drop — move this post to that date, keep its time — so the rule
 * lives once. In particular the time-preserving behaviour is load-bearing: a
 * post dragged across the month keeps the hour it was scheduled for, and only
 * a post that never had one gets `DEFAULT_HOUR`.
 */
export function useCalendarDrop(campaignId: string, posts: Post[]) {
  /** Key of the lane the pointer is currently over, for the drop highlight. */
  const [dragOverKey, setDragOverKey] = useState<string | null>(null)
  const { mutate: updatePost } = useUpdatePost(campaignId)

  const applyDrop = useCallback(
    (post: Post, targetDay: Date) => {
      // The cards already refuse to start these drags; this guards the drop
      // side against stale cards and native link drags.
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

  return { dragOverKey, laneHandlers }
}
