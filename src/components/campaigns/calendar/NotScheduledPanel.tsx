import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useParams } from '@tanstack/react-router'
import { RailPanel } from '@/components/page-primitives/RailPanel'
import { Skeleton } from '@/components/ui/skeleton'
import {
  useAddPost,
  useCampaignPosts,
  useUpdatePost,
  useWorkspacePosts,
} from '@/hooks/usePosts'
import type { Post } from '@/types/posts'
import { useCalendarSettings } from '@/hooks/useCalendarSettings'
import { PostsEmptyState } from '@/components/campaigns/PostsEmptyState'
import { postToPayload } from '@/services/api/posts'
import { canEditScheduledAt } from '@/lib/postStatusMachine'
import { PostCard } from './PostCard'
import { withCampaignRow } from './cardFields'
import { cn } from '@/lib'

/** One campaign's strays, for the panel beside that campaign's calendar. */
export function NotScheduledPanel({
  campaignId,
  onClose,
}: {
  campaignId: string
  onClose?: () => void
}) {
  const { data: posts, isLoading } = useCampaignPosts(campaignId)
  const addPost = useAddPost(campaignId)
  return (
    <NotScheduled
      campaignId={campaignId}
      posts={posts}
      isLoading={isLoading}
      onAddPost={addPost}
      onClose={onClose}
    />
  )
}

/**
 * Every campaign's strays, for the panel beside the workspace calendar.
 *
 * Two entry points rather than one hook call with a fallback id, for the same
 * reason `CalendarHeaderActions` has two: the campaign panel must not fetch the
 * whole workspace's posts, and a hook cannot take a branch. It offers no ADD
 * POST — there is no campaign here for a new one to belong to — so the empty
 * state says where posts come from instead (`PostsEmptyState`).
 */
export function WorkspaceNotScheduledPanel({
  onClose,
}: {
  onClose?: () => void
}) {
  const { data: posts, isLoading } = useWorkspacePosts()
  return (
    <NotScheduled
      campaignId={null}
      posts={posts}
      isLoading={isLoading}
      onClose={onClose}
    />
  )
}

/**
 * "Not Scheduled Posts" content for the right sidebar. The sidebar is
 * non-blocking, so posts can be dragged out onto the calendar days; dropping
 * a scheduled post onto the panel body unschedules it.
 */
function NotScheduled({
  campaignId,
  posts,
  isLoading,
  onAddPost,
  onClose,
}: {
  campaignId: string | null
  posts: Post[] | undefined
  isLoading: boolean
  onAddPost?: () => void
  onClose?: () => void
}) {
  const { t } = useTranslation()
  const [dragOver, setDragOver] = useState(false)
  const { mutate: updatePost } = useUpdatePost(campaignId)

  // These cards are the ones the user drags onto the grid, so they are drawn
  // as that grid draws them: the panel is mounted by the right rail rather
  // than by the calendar route, so which view is open is read off the router
  // (`strict: false` — this component also renders on screens with no `view`
  // param at all, and week is the calendar's own default).
  const { view } = useParams({ strict: false })
  const { card } = useCalendarSettings()
  const viewFields = card[view === 'month' ? 'month' : 'week']
  // On the workspace panel the cards name their campaign, exactly as the grid
  // they are about to be dragged onto does — see `cardFields`. Memoized: the
  // object is a `memo` prop on every card below.
  const fields = useMemo(
    () => withCampaignRow(viewFields, campaignId === null),
    [viewFields, campaignId],
  )

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
      title={t('calendar.notScheduled')}
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
        {isLoading ? (
          // Two cards' worth of panel, so it doesn't announce "nothing
          // unscheduled" before it has looked.
          <div className="flex flex-col gap-3">
            <Skeleton className="h-20 w-full shrink-0" />
            <Skeleton className="h-20 w-full shrink-0" />
          </div>
        ) : unscheduled.length === 0 ? (
          <PostsEmptyState variant="panel" onAddPost={onAddPost} />
        ) : (
          unscheduled.map((post) => (
            <div key={post.id} className="border border-border shrink-0">
              {/* No rung: the panel is a column with room, so the card draws
                  itself at its roomiest. The rung is what a *cell* imposes,
                  and there is no cell here — what carries over from the view
                  is which rows the user allows, which is the part they set. */}
              <PostCard post={post} fields={fields} />
            </div>
          ))
        )}
      </div>
    </RailPanel>
  )
}
