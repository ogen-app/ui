import { useCallback, useState } from 'react'
import { createFileRoute, redirect } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { PostsEmptyState } from '@/components/campaigns/PostsEmptyState'
import { PostsListFrame } from '@/components/campaigns/postsList/PostsListFrame'
import { PostWarningsPanel } from '@/components/campaigns/postsList/PostWarningsPanel'
import { PostsTable } from '@/components/tables/postsTable'
import { campaignsQuery } from '@/hooks/useCampaigns'
import { useDeletePost, useWorkspacePosts } from '@/hooks/usePosts'
import { usePostWarnings } from '@/hooks/usePostWarnings'
import { usePostsTableSort } from '@/hooks/usePostsTableSort'
import { awaiting } from '@/lib/fetched'
import { queryClient } from '@/lib/queryClient'
import type { Post } from '@/types/posts'

/** Stable identity: the table's columns are memoized against its props. */
const NO_POSTS: Post[] = []

/**
 * Every campaign's posts in one table — the Posts row with no campaign chosen.
 *
 * The campaign's list with the filter taken off, as the workspace calendar is
 * the campaign's calendar: the same table and toolbar, given `null` for the
 * campaign. What that null changes is all there is to know about this page —
 * the table gains a Campaign column and each row answers to its own campaign,
 * ADD POST asks which campaign the new post is for, and there is no filter
 * sentence or selection bar, because both are a campaign's:
 * the sentence is that campaign's endpoint's query string, and `GET /api/posts`
 * takes no parameters at all (`docs/open-questions.md` P4).
 *
 * A workspace with exactly one campaign is sent to that campaign's list, which
 * shows the same rows and can add to them.
 */
export const Route = createFileRoute('/_authenticated/posts/')({
  beforeLoad: async () => {
    const campaigns = await queryClient
      .ensureQueryData(campaignsQuery)
      .catch(() => null)
    if (campaigns?.length !== 1) return
    throw redirect({
      to: '/campaigns/$campaignId/list',
      params: { campaignId: campaigns[0].id },
      replace: true,
    })
  },
  component: WorkspacePostsView,
})

function WorkspacePostsView() {
  const { t } = useTranslation()
  const postsQuery = useWorkspacePosts()
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
      {isError && posts === undefined ? (
        // A read that never answered is not an empty workspace.
        <p className="px-6 py-8 text-sm text-tertiary-foreground">
          {t('calendar.loadFailed')}
        </p>
      ) : !isLoading && rows.length === 0 ? (
        <PostsEmptyState variant="list" />
      ) : (
        <div className="min-h-0 flex-1 overflow-y-auto pt-4">
          <PostsTable
            posts={rows}
            campaignId={null}
            onDelete={handleDelete}
            onShowWarnings={showWarnings}
            warningsOpenFor={warningsFor}
            loading={isLoading || sortPending}
            sorting={sorting}
            onSortingChange={setSorting}
          />
        </div>
      )}
    </PostsListFrame>
  )
}
