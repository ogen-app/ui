import { useEffect, useMemo, useState } from 'react'
import { useMutationState } from '@tanstack/react-query'
import { useCampaign } from '@/hooks/useCampaigns'
import { useTranslation } from 'react-i18next'
import { useSearch } from '@tanstack/react-router'
import { RailPanel } from '@/components/page-primitives/RailPanel'
import { Skeleton } from '@/components/ui/skeleton'
import {
  UPDATE_POST_KEY,
  useAddPost,
  useCampaignPosts,
  useUpdatePost,
  useWorkspacePosts,
} from '@/hooks/usePosts'
import type { Post } from '@/types/posts'
import { PostsEmptyState } from '@/components/campaigns/PostsEmptyState'
import { postToPayload } from '@/services/api/posts'
import { canEditScheduledAt } from '@/lib/postStatusMachine'
import { UnscheduledRow } from './UnscheduledRow'
import { formatNumber } from '@/lib/intl'
import { cn } from '@/lib'
import { awaiting } from '@/lib/fetched'
import { useJustWrittenStore } from '@/stores/justWrittenStore'
import { viewerTimeZone } from '@/lib/assetFilter'
import {
  isPostFilterActive,
  parsePostListSearch,
  postFilterFromSearch,
  postRequestParams,
} from '@/lib/postFilter'

/** One campaign's strays, for the panel beside that campaign's calendar. */
export function NotScheduledPanel({
  campaignId,
  onClose,
}: {
  campaignId: string
  onClose?: () => void
}) {
  // The filter of the posts screen beside it (CON-486), read off the address
  // both screens keep it in: a post the grid hides for not matching is not
  // offered here to be dragged onto it either. `strict: false` — the rail
  // mounts this panel, not the route.
  const search = useSearch({ strict: false })
  const filter = useMemo(
    () => postFilterFromSearch(parsePostListSearch(search)),
    [search],
  )
  const [timeZone] = useState(viewerTimeZone)
  const params = useMemo(
    () => postRequestParams(filter, timeZone),
    [filter, timeZone],
  )
  const postsQuery = useCampaignPosts(campaignId, params)
  const addPost = useAddPost(campaignId)
  return (
    <NotScheduled
      campaignId={campaignId}
      posts={postsQuery.data}
      waiting={awaiting(postsQuery)}
      filtered={isPostFilterActive(filter)}
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
  const postsQuery = useWorkspacePosts()
  return (
    <NotScheduled
      campaignId={null}
      posts={postsQuery.data}
      waiting={awaiting(postsQuery)}
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
  waiting,
  filtered = false,
  onAddPost,
  onClose,
}: {
  campaignId: string | null
  posts: Post[] | undefined
  waiting: boolean
  /** A filter narrowed `posts`, so none left is no match, not none at all. */
  filtered?: boolean
  onAddPost?: () => void
  onClose?: () => void
}) {
  const { t } = useTranslation()
  const [dragOver, setDragOver] = useState(false)
  // What the campaign targets, so a post left outside it is marked
  // (CON-483); none on the workspace grid.
  const targets = useCampaign(campaignId ?? '').data?.target_platforms
  const { mutate: updatePost } = useUpdatePost(campaignId)

  // The drafts just written from ideas lead, marked (CON-470): the toast
  // that sent the user here is gone, and nothing else says which are new.
  const justWritten = useJustWrittenStore((s) => s.ids)
  // A draft put on a day is no longer just written (CON-485): unscheduled
  // again later, it is a stray like any other. Not while its update is in
  // flight — that day is the list's optimistic copy, and a refused move
  // puts the draft back undated, mark and all.
  const forget = useJustWrittenStore((s) => s.forget)
  const updating = useMutationState({
    filters: { mutationKey: UPDATE_POST_KEY, status: 'pending' },
    select: (m) => (m.state.variables as { id: string } | undefined)?.id,
  })
  useEffect(() => {
    const pending = new Set(updating)
    const dated = (posts ?? [])
      .filter(
        (p) => p.scheduled_at && justWritten.has(p.id) && !pending.has(p.id),
      )
      .map((p) => p.id)
    if (dated.length > 0) forget(dated)
  }, [posts, justWritten, forget, updating])
  const unscheduled = useMemo(() => {
    const strays = (posts ?? []).filter((p) => !p.scheduled_at)
    return [
      ...strays.filter((p) => justWritten.has(p.id)),
      ...strays.filter((p) => !justWritten.has(p.id)),
    ]
  }, [posts, justWritten])

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
      // How many wait, muted beside the title, and what to do with them.
      titleAdornment={
        !waiting && unscheduled.length > 0 ? (
          <span className="text-base font-normal text-tertiary-foreground">
            {formatNumber(unscheduled.length)}
          </span>
        ) : undefined
      }
      subheader={
        <p className="text-[12.5px] text-tertiary-foreground">
          {t('calendar.notScheduledHint')}
        </p>
      }
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
        {/* `awaiting`, not `isLoading` — see `lib/fetched`: the state below
            is exactly the announcement this guard exists to hold back. */}
        {waiting ? (
          // Two cards' worth of panel, so it doesn't announce "nothing
          // unscheduled" before it has looked.
          <div className="flex flex-col gap-3">
            <Skeleton className="h-20 w-full shrink-0" />
            <Skeleton className="h-20 w-full shrink-0" />
          </div>
        ) : unscheduled.length === 0 && filtered ? (
          <p className="text-sm leading-5 text-tertiary-foreground">
            {t('calendar.notScheduledNoMatch')}
          </p>
        ) : unscheduled.length === 0 ? (
          <PostsEmptyState variant="panel" onAddPost={onAddPost} />
        ) : (
          // Compact rows rather than calendar cards (CON-485): a list to drag
          // from, the just written on top and tinted.
          <div className="flex flex-col border-t border-border">
            {unscheduled.map((post) => (
              <UnscheduledRow
                key={post.id}
                post={post}
                justWritten={justWritten.has(post.id)}
                showCampaign={campaignId === null}
                targets={targets}
              />
            ))}
          </div>
        )}
      </div>
    </RailPanel>
  )
}
