import { useMemo, useState } from 'react'
import { RailPanel } from '@/components/page-primitives/RailPanel'
import { useCampaignPosts, useUpdatePost } from '@/hooks/usePosts'
import { postToPayload } from '@/services/api/posts'
import { canEditScheduledAt } from '@/lib/postStatusMachine'
import { PostCard } from './PostCard'
import { cn } from '@/lib'

type NotScheduledPanelProps = {
  campaignId: string
  onClose?: () => void
}

/**
 * "Not Scheduled Posts" content for the right sidebar. The sidebar is
 * non-blocking, so posts can be dragged out onto the calendar days; dropping
 * a scheduled post onto the panel body unschedules it.
 */
export function NotScheduledPanel({ campaignId, onClose }: NotScheduledPanelProps) {
  const [dragOver, setDragOver] = useState(false)
  const { data: posts } = useCampaignPosts(campaignId)
  const { mutate: updatePost } = useUpdatePost(campaignId)

  const unscheduled = useMemo(
    () => (posts ?? []).filter((p) => !p.scheduled_at),
    [posts],
  )

  const dropHandlers = {
    onDragOver: (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault()
      e.dataTransfer.dropEffect = 'move'
      if (!dragOver) setDragOver(true)
    },
    onDragLeave: () => setDragOver(false),
    onDrop: (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault()
      setDragOver(false)
      const id = e.dataTransfer.getData('text/plain')
      if (!id) return
      const post = (posts ?? []).find((p) => p.id === id)
      // PostCard already refuses to start locked drags; this guards against
      // stale cards and native link drags.
      if (!post || !canEditScheduledAt(post.status)) return
      if (post.scheduled_at === null) return
      updatePost({
        id: post.id,
        payload: { ...postToPayload(post), scheduled_at: null },
      })
    },
  }

  return (
    <RailPanel
      title="Not Scheduled Posts"
      onClose={onClose}
      className="h-full"
      bodyClassName="flex-1"
    >
      <div
        {...dropHandlers}
        className={cn(
          'flex-1 flex flex-col gap-3 transition-colors',
          dragOver && 'bg-secondary',
        )}
      >
        {unscheduled.length === 0 ? (
          <span className="text-sm text-tertiary-foreground">
            No unscheduled posts
          </span>
        ) : (
          unscheduled.map((post) => (
            <div key={post.id} className="border border-border shrink-0">
              <PostCard post={post} />
            </div>
          ))
        )}
      </div>
    </RailPanel>
  )
}
