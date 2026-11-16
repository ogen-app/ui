import type { ReactNode } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { Skeleton } from '@/components/ui/skeleton.tsx'
import { AnalyticsModule } from '@/components/campaigns/overview/AnalyticsModule.tsx'
import { AssetsStats } from '@/components/campaigns/overview/AssetsStats.tsx'
import { PostsStats } from '@/components/campaigns/overview/PostsStats.tsx'
import { StrategyStats } from '@/components/campaigns/overview/StrategyStats.tsx'
import { TodoCard } from '@/components/campaigns/overview/TodoCard.tsx'
import { WarningsCard } from '@/components/campaigns/overview/WarningsCard.tsx'
import { useCampaign, useCampaignSummaries } from '@/hooks/useCampaigns.ts'
import { useCampaignPosts } from '@/hooks/usePosts.ts'
import { useCampaignProblems } from '@/hooks/useCampaignProblems'
import { usePlatformViews } from '@/hooks/usePlatforms.ts'
import { attentionItems } from '@/lib/campaignReadiness.ts'
import { withoutServerChecked } from '@/lib/serverCheckedRules'
import type { PostSummary } from '@/types/posts'

export const Route = createFileRoute(
  '/_authenticated/campaigns/$campaignId/overview',
)({
  component: CampaignOverviewScreen,
})

/**
 * The campaign's front page, in two columns: on the left what the campaign
 * *is* — its terms, its posts, how they performed, what it writes from — as
 * figures; on the right what wants a person — warnings, then to-dos.
 *
 * The split is the rule for anything added here: a number or a fact goes
 * left, and only left; a thing to act on goes right, and only right. A stats
 * card never carries a call to action, and the to-do list never restates a
 * figure. Below the two-column width the right column comes first, because on
 * a narrow screen what needs doing is what someone opened this for.
 */
function CampaignOverviewScreen() {
  const { campaignId } = Route.useParams()
  const { data: campaign } = useCampaign(campaignId)
  const postsQuery = useCampaignPosts(campaignId)
  const summariesQuery = useCampaignSummaries()
  const platformViews = usePlatformViews()
  // A failed re-read keeps the last answer, which may predate a change made
  // since; the client's rules stand in until the server answers again.
  const problemsQuery = useCampaignProblems(campaignId)
  const problems = problemsQuery.isError ? undefined : problemsQuery.data

  // The layout normally hands this screen the campaign already (`useCampaign`
  // seeds itself from the sidebar's list), so this is rare.
  if (!campaign) {
    return (
      <Columns
        stats={
          <>
            <Skeleton variant="surface" className="h-48 w-full" />
            <Skeleton variant="surface" className="h-40 w-full" />
          </>
        }
        actions={<Skeleton variant="surface" className="h-40 w-full" />}
      />
    )
  }

  // The backend sends `null` for a campaign with no posts (Go nil slice), so
  // settled is `data !== undefined`, not truthy data.
  const posts =
    postsQuery.data !== undefined ? (postsQuery.data ?? []) : undefined
  // A failed fetch is not an empty campaign; cached data from an earlier
  // success still counts.
  const postsFailed = postsQuery.isError && postsQuery.data === undefined

  // The counts and the rules don't wait for this campaign's posts: they are
  // typed against `PostSummary`, and the workspace-wide summaries the
  // Campaigns list fetched are normally cached already. The real posts win
  // once they land. Absence from the summaries is an answer — the server
  // omits campaigns with no posts — so only both sources being unsettled
  // leaves nothing to count.
  const summaries: PostSummary[] | null =
    posts !== undefined
      ? posts
      : summariesQuery.data !== undefined
        ? (summariesQuery.data[campaignId] ?? [])
        : null

  // Recomputed every render against the current clock: several rules are
  // time-based. Once the server has said what is wrong with the calendar, its
  // findings stand for the rules that check the same thing here.
  const items = summaries
    ? withoutServerChecked(
        attentionItems(campaign, summaries, platformViews, new Date()),
        problems != null,
      )
    : []
  const warnings = items.filter(
    (item) => item.severity === 'alert' || item.severity === 'risk',
  )
  const todos = items.filter(
    (item) => item.severity === 'todo' || item.severity === 'info',
  )

  return (
    <Columns
      stats={
        <>
          <StrategyStats
            campaign={campaign}
            posts={summaries}
            platformViews={platformViews}
          />
          <PostsStats
            campaignId={campaignId}
            summaries={summaries}
            posts={posts}
            failed={postsFailed}
          />
          {/* Reads its own flag and renders nothing while it is off. */}
          <AnalyticsModule campaignId={campaignId} />
          <AssetsStats campaign={campaign} />
        </>
      }
      actions={
        // Never the all-clear before the posts have been counted: "Nothing is
        // failing" off a list nobody has read is the one wrong thing this
        // screen could say.
        summaries ? (
          <>
            <WarningsCard
              items={warnings}
              problems={problems ?? undefined}
              campaignId={campaignId}
            />
            <TodoCard items={todos} campaignId={campaignId} />
          </>
        ) : (
          <>
            <Skeleton variant="surface" className="h-28 w-full" />
            <Skeleton variant="surface" className="h-40 w-full" />
          </>
        )
      }
    />
  )
}

/**
 * The two columns. Measured against the space the page has rather than the
 * viewport — the right rail can take a third of the window — so they sit side
 * by side only where both fit, and stack (actions first) where they don't.
 */
function Columns({ stats, actions }: { stats: ReactNode; actions: ReactNode }) {
  return (
    <div className="@container w-full max-w-wide mx-auto pb-10">
      <div className="grid grid-cols-1 gap-3 @4xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] @4xl:items-start">
        <div className="@container flex min-w-0 flex-col gap-3">{stats}</div>
        <div className="@container order-first flex min-w-0 flex-col gap-3 @4xl:order-none">
          {actions}
        </div>
      </div>
    </div>
  )
}
