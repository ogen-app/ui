import { useCallback, useMemo, useState } from 'react'
import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { PostsEmptyState } from '@/components/campaigns/PostsEmptyState'
import {
  PostsFilterBar,
  PostsGroupMenu,
  PostsNoMatches,
} from '@/components/campaigns/postsFilter/PostsFilterBar'
import { PostsListFrame } from '@/components/campaigns/postsList/PostsListFrame'
import { PostWarningsPanel } from '@/components/campaigns/postsList/PostWarningsPanel'
import { PostsTable } from '@/components/tables/postsTable'
import { campaignsQuery } from '@/hooks/useCampaigns'
import { useDeletePost, useWorkspacePosts } from '@/hooks/usePosts'
import { usePostWarnings } from '@/hooks/usePostWarnings'
import { usePostsTableSort } from '@/hooks/usePostsTableSort'
import { viewerTimeZone } from '@/lib/assetFilter'
import { awaiting } from '@/lib/fetched'
import {
  isPostFilterActive,
  parseCampaignPostListSearch,
  parsePostListSearch,
  postFilterFromSearch,
  postGroupingFromSearch,
  postRequestParams,
  searchFromPostFilter,
  type PostFilter,
  type PostGrouping,
} from '@/lib/postFilter'
import { queryClient } from '@/lib/queryClient'
import type { Post } from '@/types/posts'

/** Stable identity: the table's columns are memoized against its props. */
const NO_POSTS: Post[] = []

/**
 * Every campaign's posts in one table — the Posts row with no campaign chosen.
 *
 * The campaign's list with the campaign taken off, as the workspace calendar
 * is the campaign's calendar: the same table, filter line and grouping, given
 * `null` for the campaign. What that null changes is all there is to know
 * about this page — the table gains a Campaign column and each row answers to
 * its own campaign, the filter gains a Campaign field and the grouping a
 * Campaign grouping (`GET /api/posts` takes the campaign endpoint's params,
 * `campaign_id` among them), ADD POST asks which campaign the new post is
 * for, and there is no selection bar, because its bulk actions are a
 * campaign's.
 *
 * A workspace with exactly one campaign is sent to that campaign's list, which
 * shows the same rows and can add to them.
 */
export const Route = createFileRoute('/_authenticated/posts/')({
  staticData: { help: 'posts' },
  // The filter is the address, in the endpoint's own words (CON-472).
  validateSearch: parsePostListSearch,
  beforeLoad: async ({ search }) => {
    const campaigns = await queryClient
      .ensureQueryData(campaignsQuery)
      .catch(() => null)
    if (campaigns?.length !== 1) return
    throw redirect({
      to: '/campaigns/$campaignId/list',
      params: { campaignId: campaigns[0].id },
      // The same filter, less the campaign the address now names.
      search: parseCampaignPostListSearch(search),
      replace: true,
    })
  },
  component: WorkspacePostsView,
})

function WorkspacePostsView() {
  const { t } = useTranslation()
  const search = Route.useSearch()
  const navigate = useNavigate({ from: Route.fullPath })
  const filter = useMemo(() => postFilterFromSearch(search), [search])
  const filtered = isPostFilterActive(filter)
  const grouping = postGroupingFromSearch(search)
  const [timeZone] = useState(viewerTimeZone)
  const params = useMemo(
    () => postRequestParams(filter, timeZone),
    [filter, timeZone],
  )
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
  const postsQuery = useWorkspacePosts(params)
  // Whether there are posts at all is the unfiltered read's to say, and it
  // is the "of 21" the pills end on.
  const allPosts = useWorkspacePosts()
  const { data: posts, isError } = postsQuery
  // `awaiting`, not `isLoading` — see `lib/fetched`. The empty state is a
  // claim about how many posts there are.
  const isLoading = awaiting(postsQuery)
  const rows = posts ?? NO_POSTS
  // The same stored order every campaign's list reads (CON-170).
  const { sorting, setSorting, isPending: sortPending } = usePostsTableSort()

  const { mutateAsync: deletePost } = useDeletePost(null)
  // Fire-and-forget, caught because the mutation rethrows after its toast.
  const handleDelete = useCallback(
    (id: string) => void deletePost(id).catch(() => {}),
    [deletePost],
  )

  // The post whose warnings the drawer lists; its mark toggles it.
  const [warningsFor, setWarningsFor] = useState<string | null>(null)
  const showWarnings = useCallback(
    (id: string) => setWarningsFor((open) => (open === id ? null : id)),
    [],
  )
  const warningsOf = usePostWarnings(null)
  const warningsPost = rows.find((p) => p.id === warningsFor)

  return (
    <PostsListFrame
      campaignId={null}
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
      {(filtered || (allPosts.data?.length ?? 0) > 0) && (
        <div className="shrink-0 pt-3 pb-2">
          <PostsFilterBar
            campaignId={null}
            filter={filter}
            onChange={onFilterChange}
            total={rows.length}
            totalUnfiltered={allPosts.data?.length ?? rows.length}
            showCount={filtered && !isLoading}
            end={
              <PostsGroupMenu
                grouping={grouping}
                onChange={onGroupingChange}
                scoped={false}
              />
            }
          />
        </div>
      )}
      {isError && posts === undefined ? (
        // A read that never answered is not an empty workspace.
        <p className="px-6 py-8 text-sm text-tertiary-foreground">
          {t('calendar.loadFailed')}
        </p>
      ) : !isLoading && rows.length === 0 && filtered ? (
        <PostsNoMatches
          campaignId={null}
          filter={filter}
          onChange={onFilterChange}
        />
      ) : !isLoading && rows.length === 0 ? (
        <PostsEmptyState variant="list" />
      ) : (
        <div className="min-h-0 flex-1 overflow-y-auto">
          <PostsTable
            posts={rows}
            campaignId={null}
            onDelete={handleDelete}
            onShowWarnings={showWarnings}
            warningsOpenFor={warningsFor}
            loading={isLoading || sortPending}
            sorting={sorting}
            onSortingChange={setSorting}
            grouping={grouping}
          />
        </div>
      )}
    </PostsListFrame>
  )
}
