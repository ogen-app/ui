import { useCallback, useMemo, useState } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { BulkActionsBar } from '@/components/campaigns/BulkActionsBar'
import { PostsEmptyState } from '@/components/campaigns/PostsEmptyState'
import { PostsTable } from '@/components/tables/postsTable'
import { PostsToolbar } from '@/components/campaigns/PostsToolbar'
import { useAddPost, useCampaignPosts } from '@/hooks/usePosts.ts'
import { useBulkPostActions } from '@/hooks/useBulkPostActions'
import { usePostsTableSort } from '@/hooks/usePostsTableSort'
import { useRememberPostsPlace } from '@/hooks/usePostsPlace'
import type { Post } from '@/types/posts'
import { awaiting } from '@/lib/fetched'
import {
  useAssistantRequest,
  useListAssistantPage,
} from '@/hooks/useAssistantContext'
import {
  PostsFilterBar,
  PostsNoMatches,
} from '@/components/campaigns/postsFilter/PostsFilterBar'
import { viewerTimeZone } from '@/lib/assetFilter'
import {
  isPostFilterActive,
  parsePostListSearch,
  postFilterFromSearch,
  postRequestParams,
  searchFromPostFilter,
  type PostFilter,
} from '@/lib/postFilter'

export const Route = createFileRoute(
  '/_authenticated/campaigns/$campaignId/list',
)({
  // The filter is the address, in the endpoint's own words (CON-472), so the
  // assistant's set_filter lands here as search params.
  validateSearch: parsePostListSearch,
  component: CampaignListView,
})

/** Stable identity: the table's columns are memoized against its props. */
const NO_POSTS: Post[] = []

function CampaignListView() {
  const { campaignId } = Route.useParams()
  // No anchor: the table has no date range of its own, so it keeps whichever
  // week the calendar last left — see `lib/postsPlace`.
  useRememberPostsPlace(campaignId, 'list')
  const { t } = useTranslation()
  const search = Route.useSearch()
  const navigate = useNavigate({ from: Route.fullPath })
  const filter = useMemo(() => postFilterFromSearch(search), [search])
  const filtered = isPostFilterActive(filter)
  const [timeZone] = useState(viewerTimeZone)
  const params = useMemo(
    () => postRequestParams(filter, timeZone),
    [filter, timeZone],
  )
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  // A new filter starts a new selection: ticks the filter hides would come
  // back unasked when it is relaxed.
  const onFilterChange = useCallback(
    (next: PostFilter) => {
      setSelectedIds(new Set())
      void navigate({ search: searchFromPostFilter(next), replace: true })
    },
    [navigate],
  )
  const postsQuery = useCampaignPosts(campaignId, params)
  // The sentence says how many there are in all; a filtered read is a second
  // query, and the unfiltered one is usually in the cache already.
  const allPosts = useCampaignPosts(campaignId)
  const posts = postsQuery.data
  // `awaiting`, not `isLoading` — see `lib/fetched`. Both readers below are
  // claims about how many posts there are, and a paused read is not an answer.
  const isLoading = awaiting(postsQuery)
  // `mutateAsync` is stable, so the columns aren't rebuilt on every render.
  const { applyPlan, deletePosts, busy, deletePost } = useBulkPostActions(
    campaignId,
    setSelectedIds,
  )
  // The single-row delete: fire-and-forget on purpose, and caught because the
  // mutation rethrows after its own error toast.
  const handleDelete = useCallback(
    (id: string) => void deletePost(id).catch(() => {}),
    [deletePost],
  )
  const addPost = useAddPost(campaignId)

  // The order is the user's, stored server-side and shared by every campaign's
  // list (CON-170). Until it arrives the table draws skeleton rows rather than
  // the default order, so it never sorts itself again under the reader.
  const { sorting, setSorting, isPending: sortPending } = usePostsTableSort()

  const rows = posts ?? NO_POSTS

  /**
   * The selection is held by id but every action needs the post itself, so it
   * is resolved against the current rows each render. That also drops ids
   * whose post has since gone — a stale id must not be counted as selected
   * or, worse, handed to a bulk action.
   */
  const selectedPosts = useMemo(
    () => rows.filter((p) => selectedIds.has(p.id)),
    [rows, selectedIds],
  )

  // The assistant can tick posts here.
  useAssistantRequest((action) => {
    if (action.type !== 'select' || action.selection?.kind !== 'post')
      return false
    setSelectedIds(new Set(action.selection.ids))
    return true
  })

  // The assistant sees the filter and the ticked posts (CON-451/472). Every
  // row ticked is the whole match, which goes as the filter rather than ids —
  // the endpoint answers unpaged, so the rows on screen are all of it.
  const ticked = useMemo(
    () => new Set(selectedPosts.map((p) => p.id)),
    [selectedPosts],
  )
  const rowIds = useMemo(() => rows.map((p) => p.id), [rows])
  useListAssistantPage({
    kind: 'post',
    params,
    ticked,
    allMatching: rows.length > 0 && ticked.size === rows.length,
    total: rows.length,
    rowIds,
  })

  const toggleRow = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (!next.delete(id)) next.add(id)
      return next
    })
  }, [])

  const toggleAll = useCallback(() => {
    setSelectedIds((prev) => {
      const allSelected = rows.length > 0 && rows.every((p) => prev.has(p.id))
      return allSelected ? new Set<string>() : new Set(rows.map((p) => p.id))
    })
  }, [rows])

  const clearSelection = useCallback(() => setSelectedIds(new Set()), [])

  return (
    <div className="flex flex-col h-full min-h-0 min-w-0">
      {selectedPosts.length > 0 ? (
        <BulkActionsBar
          posts={selectedPosts}
          onClear={clearSelection}
          onApply={applyPlan}
          onDelete={deletePosts}
          busy={busy}
        />
      ) : (
        <PostsToolbar
          campaignId={campaignId}
          view="list"
          // Held back while the query is in flight: "0 posts" is an answer,
          // and we don't have one yet.
          subheading={
            isLoading
              ? undefined
              : `${rows.length} ${rows.length === 1 ? 'post' : 'posts'}`
          }
        />
      )}
      {(filtered || (allPosts.data?.length ?? 0) > 0) && (
        <div className="px-6 pb-3">
          <PostsFilterBar
            campaignId={campaignId}
            filter={filter}
            onChange={onFilterChange}
            total={rows.length}
            totalUnfiltered={allPosts.data?.length ?? rows.length}
          />
        </div>
      )}
      {/* Gate on the query, not on `!posts`: the backend answers a campaign
          with no posts with null, so truthiness can't tell "none" from "not
          yet" — and the empty state's invitation to add the first post is a
          claim we don't get to make until we've asked. The table renders on
          one path either way; `loading` draws its own rows. A filter nothing
          matches is not an empty campaign. */}
      {postsQuery.isError && posts === undefined ? (
        // A read that never answered is not "nothing matches".
        <p className="px-6 py-8 text-sm text-tertiary-foreground">
          {t('calendar.loadFailedCampaign')}
        </p>
      ) : !isLoading && rows.length === 0 && filtered ? (
        <PostsNoMatches
          campaignId={campaignId}
          filter={filter}
          onChange={onFilterChange}
        />
      ) : !isLoading && rows.length === 0 ? (
        <PostsEmptyState variant="list" onAddPost={addPost} />
      ) : (
        <div className="flex-1 min-h-0 overflow-y-auto">
          <PostsTable
            posts={rows}
            campaignId={campaignId}
            onDelete={handleDelete}
            emptyStateMessage="No posts yet"
            emptyStateActionLabel="Add Post"
            onEmptyStateAction={addPost}
            loading={isLoading || sortPending}
            selectedIds={selectedIds}
            onToggleRow={toggleRow}
            onToggleAll={toggleAll}
            sorting={sorting}
            onSortingChange={setSorting}
          />
        </div>
      )}
    </div>
  )
}
