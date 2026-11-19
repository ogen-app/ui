import { useCallback } from 'react'
import { createFileRoute, redirect } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { PageContainer } from '@/components/page-primitives/PageContainer'
import { PageHeader } from '@/components/page-primitives/PageHeader'
import { PostsEmptyState } from '@/components/campaigns/PostsEmptyState'
import { PostsToolbar } from '@/components/campaigns/PostsToolbar'
import { PostsTable } from '@/components/tables/postsTable'
import { campaignsQuery } from '@/hooks/useCampaigns'
import { useDeletePost, useWorkspacePosts } from '@/hooks/usePosts'
import { usePostsTableSort } from '@/hooks/usePostsTableSort'
import { awaiting } from '@/lib/fetched'
import { counted } from '@/lib/intl'
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
 * nothing here creates a post (a new one needs a campaign to be made in), and
 * there is no filter sentence or selection bar, because both are a campaign's:
 * the sentence is that campaign's endpoint's query string, and `GET /api/posts`
 * takes no parameters at all (`docs/open-questions.md` P4).
 *
 * A workspace with exactly one campaign is sent to that campaign's list, which
 * shows the same rows and can add to them.
 */
export const Route = createFileRoute('/_authenticated/posts/')({
  staticData: { help: 'posts' },
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
  const { t, i18n } = useTranslation()
  const postsQuery = useWorkspacePosts()
  const { data: posts, isError } = postsQuery
  // `awaiting`, not `isLoading` — see `lib/fetched`. The count and the empty
  // state are both claims about how many posts there are.
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

  const countLine = isLoading
    ? undefined
    : t('postsTable.count', counted(rows.length, i18n.language))

  return (
    <PageContainer variant="fullFlex">
      <div className="flex-1 min-h-0 flex flex-col">
        <PageHeader title={t('nav.campaign.posts')} />
        <div className="page-content-motion grid overflow-hidden h-full px-3 lg:px-6">
          <div className="flex flex-col h-full min-h-0 min-w-0">
            <PostsToolbar campaignId={null} subheading={countLine} />
            {isError && posts === undefined ? (
              // A read that never answered is not an empty workspace.
              <p className="px-6 py-8 text-sm text-tertiary-foreground">
                {t('calendar.loadFailed')}
              </p>
            ) : !isLoading && rows.length === 0 ? (
              <PostsEmptyState variant="list" />
            ) : (
              <div className="flex-1 min-h-0 overflow-y-auto">
                <PostsTable
                  posts={rows}
                  campaignId={null}
                  onDelete={handleDelete}
                  loading={isLoading || sortPending}
                  sorting={sorting}
                  onSortingChange={setSorting}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </PageContainer>
  )
}
