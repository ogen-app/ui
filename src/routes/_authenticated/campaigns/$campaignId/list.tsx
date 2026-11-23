import { useCallback, useMemo, useState } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { BulkActionsBar } from '@/components/campaigns/BulkActionsBar'
import { PostsEmptyState } from '@/components/campaigns/PostsEmptyState'
import { PostsTable } from '@/components/tables/postsTable'
import { PostsListFrame } from '@/components/campaigns/postsList/PostsListFrame'
import { PostWarningsPanel } from '@/components/campaigns/postsList/PostWarningsPanel'
import { useAddPost, useCampaignPosts } from '@/hooks/usePosts.ts'
import { usePostWarnings } from '@/hooks/usePostWarnings'
import { useBulkPostActions } from '@/hooks/useBulkPostActions'
import { usePostsTableSort } from '@/hooks/usePostsTableSort'
import { useRememberPostsPlace } from '@/hooks/usePostsPlace'
import type { Post } from '@/types/posts'
import { awaiting } from '@/lib/fetched'
import { counted } from '@/lib/intl'
import {
  useAssistantRequest,
  useListAssistantPage,
} from '@/hooks/useAssistantContext'
import {
  PostsFilterBar,
  PostsGroupMenu,
  PostsNoMatches,
} from '@/components/campaigns/postsFilter/PostsFilterBar'
import { viewerTimeZone } from '@/lib/assetFilter'
import { listFilter, sameFilter } from '@/lib/viewContext'
import { useViewContextStore } from '@/stores/viewContextStore'
import {
  isPostFilterActive,
  parseCampaignPostListSearch,
  postFilterFromSearch,
  postGroupingFromSearch,
  postRequestParams,
  searchFromPostFilter,
  type PostFilter,
  type PostGrouping,
} from '@/lib/postFilter'

export const Route = createFileRoute(
  '/_authenticated/campaigns/$campaignId/list',
)({
  staticData: { help: 'posts' },
  // The filter is the address, in the endpoint's own words (CON-472), so the
  // assistant's set_filter lands here as search params.
  validateSearch: parseCampaignPostListSearch,
  component: CampaignListView,
})

/** Stable identity: the table's columns are memoized against its props. */
const NO_POSTS: Post[] = []

function CampaignListView() {
  const { campaignId } = Route.useParams()
  // No anchor: the table has no date range of its own, so it keeps whichever
  // week the calendar last left — see `lib/postsPlace`.
  useRememberPostsPlace(campaignId, 'list')
  const { t, i18n } = useTranslation()
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
  // back unasked when it is relaxed. Read off the address, so the
  // assistant's set_filter and its UNDO clear them too (CON-482).
  const question = listFilter(params)
  const assistantFilter = useViewContextStore((st) => st.assistantFilter)
  const [selectionFor, setSelectionFor] = useState(question)
  if (selectionFor !== question) {
    setSelectionFor(question)
    setSelectedIds(new Set())
  }
  // The grouping rides beside the filter in the address, and survives it.
  const grouping = postGroupingFromSearch(search)
  const onFilterChange = useCallback(
    (next: PostFilter) =>
      void navigate({
        search: (prev) => ({
          ...searchFromPostFilter(next),
          group: prev.group,
        }),
        replace: true,
      }),
    [navigate],
  )
  const onGroupingChange = useCallback(
    (next: PostGrouping) =>
      void navigate({
        search: (prev) => ({
          ...prev,
          group: next === 'none' ? undefined : next,
        }),
        replace: true,
      }),
    [navigate],
  )
  const postsQuery = useCampaignPosts(campaignId, params)
  // The pills say how many there are in all; a filtered read is a second
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

  // The assistant can tick posts here — the ones the list holds, and says
  // how many that was (CON-482).
  useAssistantRequest((action) => {
    if (action.type !== 'select' || action.selection?.kind !== 'post')
      return false
    // Not before the posts have arrived: a cold open would tick nothing and
    // spend the request, so it waits for them (`ready`).
    if (!posts) return false
    const here = new Set(rows.map((p) => p.id))
    const ids = action.selection.ids.filter((id) => here.has(id))
    setSelectedIds(new Set(ids))
    return ids.length
  }, posts)

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

  const totalUnfiltered = allPosts.data?.length ?? rows.length
  // The header box names what it would tick: the whole match, not "all".
  const selectAllLabel = filtered
    ? t('postsTable.selectAllMatching', counted(rows.length, i18n.language))
    : t('postsTable.selectAllCount', counted(rows.length, i18n.language))

  // The post whose warnings the drawer lists; its mark toggles it.
  const [warningsFor, setWarningsFor] = useState<string | null>(null)
  const showWarnings = useCallback(
    (id: string) => setWarningsFor((open) => (open === id ? null : id)),
    [],
  )
  const warningsOf = usePostWarnings(campaignId)
  const warningsPost = rows.find((p) => p.id === warningsFor)

  return (
    <PostsListFrame
      campaignId={campaignId}
      drawer={
        warningsFor === null ? null : (
          <PostWarningsPanel
            post={warningsPost}
            warnings={warningsPost ? warningsOf(warningsPost) : []}
            onClose={() => setWarningsFor(null)}
          />
        )
      }
    >
      {/* The filter line, then the table, both on the table's left edge.
          There is no count line: an unfiltered list's length is not news, and
          a filtered one's is said once, at the pills' end ("3 of 21"). ADD
          POST is the header's. */}
      {(filtered || (allPosts.data?.length ?? 0) > 0) && (
        <div className="shrink-0 pt-3 pb-2">
          <PostsFilterBar
            campaignId={campaignId}
            filter={filter}
            onChange={onFilterChange}
            total={rows.length}
            totalUnfiltered={totalUnfiltered}
            showCount={filtered && !isLoading}
            end={
              <PostsGroupMenu
                grouping={grouping}
                onChange={onGroupingChange}
                scoped
              />
            }
            setByAssistant={
              !!assistantFilter &&
              assistantFilter.screen === 'campaign.list' &&
              sameFilter(assistantFilter.filter, question)
            }
          />
        </div>
      )}
      {/* Gate on the query, not on `!posts`: the backend answers a campaign
          with no posts with null, so truthiness can't tell "none" from "not
          yet" — and the empty state's invitation to add the first post is a
          claim we don't get to make until we've asked. The table renders on
          one path either way; `loading` draws its own rows. A filter nothing
          matches is not an empty campaign. */}
      <div className="relative flex min-h-0 flex-1 flex-col">
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
          <div className="flex min-h-0 flex-1 flex-col">
            {/* A flex column, not a scroller: the table scrolls in its own
                viewport, which its rows are virtualised against. A scroller
                here let the table grow to its full height, and the
                viewport's `overscroll-none` kept the wheel from reaching it. */}
            <PostsTable
              posts={rows}
              campaignId={campaignId}
              onDelete={handleDelete}
              onShowWarnings={showWarnings}
              warningsOpenFor={warningsFor}
              emptyStateMessage={t('postsTable.noPosts')}
              emptyStateActionLabel={t('calendar.addPost')}
              onEmptyStateAction={addPost}
              selectAllLabel={selectAllLabel}
              loading={isLoading || sortPending}
              selectedIds={selectedIds}
              onToggleRow={toggleRow}
              onToggleAll={toggleAll}
              sorting={sorting}
              onSortingChange={setSorting}
              grouping={grouping}
            />
          </div>
        )}
        {/* Over the list's foot, as the Ideas bar sits over its list, so
            ticking a row doesn't push the table down. */}
        {selectedPosts.length > 0 && (
          <BulkActionsBar
            floating
            posts={selectedPosts}
            allMatching={filtered && selectedPosts.length === rows.length}
            onClear={clearSelection}
            onApply={applyPlan}
            onDelete={deletePosts}
            busy={busy}
          />
        )}
      </div>
    </PostsListFrame>
  )
}
