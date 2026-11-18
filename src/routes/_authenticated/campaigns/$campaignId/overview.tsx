import { createFileRoute } from '@tanstack/react-router'
import { Skeleton } from '@/components/ui/skeleton.tsx'
import { GridCell, PageGrid } from '@/components/page-primitives/PageGrid'
import { AnalyticsModule } from '@/components/campaigns/overview/AnalyticsModule.tsx'
import { StrategyModule } from '@/components/campaigns/overview/StrategyModule.tsx'
import { DocumentsModule } from '@/components/campaigns/overview/DocumentsModule.tsx'
import { AttentionRail } from '@/components/campaigns/overview/AttentionRail.tsx'
import { ContentModule } from '@/components/campaigns/overview/ContentModule.tsx'
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
 * The campaign's control panel (CON-120): dashboard, control centre, and
 * to-do list in one screen. Each module derives its own posture from data, so
 * the same layout reads as guided setup on a fresh campaign and as a status
 * dashboard mid-campaign.
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

  // The backend sends `null` for a campaign with no posts (Go nil slice), so
  // gate on the query settling, not on the data being truthy.
  const posts = postsQuery.data ?? []

  // The layout already handles campaign load errors. It also no longer waits
  // on the campaign to arrive — `useCampaign` seeds itself from the list the
  // sidebar has already fetched — so this screen is normally reached with the
  // campaign in hand and only the posts outstanding.
  // `surface`, not the default, on every skeleton this screen draws: each one
  // stands for an `OverviewCard`, which is white. In grey they made the column
  // darken and then lighten again as the real cards landed.
  if (!campaign) {
    return (
      <div className="pb-10">
        <PageGrid>
          <GridCell span="wide">
            <Skeleton variant="surface" className="h-64" />
          </GridCell>
          <GridCell span="narrow">
            <Skeleton variant="surface" className="h-64" />
          </GridCell>
          <GridCell span="half">
            <Skeleton variant="surface" className="h-32" />
          </GridCell>
          <GridCell span="half">
            <Skeleton variant="surface" className="h-32" />
          </GridCell>
        </PageGrid>
      </div>
    )
  }

  // Only two modules are claims about the posts. The other four describe the
  // campaign, which is already here, so they render at once and hold their
  // place: the page arrives as a page with two gaps filling in, rather than as
  // a stack of blank cards that is then replaced wholesale.
  //
  // Neither of the two fades. A fade is for *arrival* — a screen appearing
  // where there was nothing — and the section shell already plays one, keyed by
  // section. Switching campaigns is an *update*: the Overview is on screen and
  // stays there, so the four campaign cards simply change. Fading these two
  // made the one card whose data was still in flight animate while everything
  // around it swapped instantly, which reads as a glitch rather than as
  // settling. What covers the swap instead is the placeholder above: a
  // `surface` skeleton is the card's own white, so the content appears inside a
  // box that was already there.
  const postsPending = postsQuery.isPending

  // A failed fetch is not an empty campaign: `data ?? []` after an error would
  // put "You're all set" and "No posts yet" on screen as if they were facts.
  // Cached data from an earlier success still counts — only the fetch that
  // never produced anything gets the error strip.
  const postsFailed = postsQuery.isError && postsQuery.data === undefined

  // The rail does not wait for this campaign's posts. Its rules are typed
  // against `PostSummary` precisely so they can be fed a projection (see
  // `types/posts`), and the workspace-wide summaries the Campaigns list fetches
  // are already cached before anyone clicks into a campaign — so switching
  // campaigns draws the rail immediately instead of a placeholder that resolves
  // a moment later. The real posts win as soon as they land; they are the rows
  // the projection was made from, so in practice nothing on screen changes.
  //
  // Absence is an answer here, not a gap: the server omits campaigns with no
  // posts, so once the summaries have settled, no entry means none. Only both
  // queries being unsettled leaves the rail with nothing to say.
  //
  // Presence of data, not `isSuccess`: a refetch that fails leaves the query
  // in error state while the earlier answer is still in hand, and that answer
  // is exactly what the rail should keep showing. On `isSuccess` this fell
  // through to the summaries — and when those were erring too, a rail that had
  // been rendering real items was replaced by a skeleton that never resolved.
  const railPosts: PostSummary[] | null =
    postsQuery.data !== undefined
      ? posts
      : summariesQuery.data !== undefined
        ? (summariesQuery.data[campaignId] ?? [])
        : null

  // Several attention rules are time-based (overdue slots, the next 24h, pace),
  // so they are recomputed on every render against the current clock rather
  // than memoized against a frozen `now`.
  // Once the server has said what is wrong with the calendar, its findings
  // stand for the rules that check the same thing here (CON-462/468).
  const items = railPosts
    ? withoutServerChecked(
        attentionItems(campaign, railPosts, platformViews, new Date()),
        problems != null,
      )
    : []

  // A dashboard (`PageGrid`), read in order of importance. First row: the
  // posts — what is going out — beside what needs attention before it can,
  // the two things this screen is opened for. Then what the posts earned,
  // across the page, then the brief and the assets, the two sections set up
  // once and revisited rarely. On a narrow page that order is the stack.
  return (
    <div className="pb-10">
      <PageGrid>
        <GridCell span="wide">
          {/* The failure strip stands in for Content, and for the rail too
              when the summaries can't cover it — so it names neither module.
              A posts fetch that failed while the summaries are in hand still
              leaves the rail standing beside it. */}
          {postsFailed ? (
            <p className="text-sm text-tertiary-foreground">
              Couldn’t load this campaign’s posts — they’ll appear here once
              they’re reachable again.
            </p>
          ) : postsPending ? (
            <Skeleton variant="surface" className="h-64" />
          ) : (
            <ContentModule campaign={campaign} posts={posts} />
          )}
        </GridCell>
        <GridCell span="narrow">
          {/* Never the all-clear before the posts have been counted — "You're
              all set" off an empty list is the one wrong thing this screen
              could say. `railPosts` is what enforces that: it is null until
              one of the two sources has actually answered, and an answered
              source that lists no posts is a count of zero, not an absence
              of one. */}
          {railPosts ? (
            <AttentionRail
              items={items}
              problems={problems ?? undefined}
              campaignId={campaignId}
            />
          ) : postsFailed ? null : (
            <Skeleton variant="surface" className="h-64" />
          )}
        </GridCell>
        {/* The same posts, seen by what they earned rather than by where they
            are in the pipeline. The card renders nothing for a workspace that
            measures nothing, which leaves no cell. */}
        <GridCell span="full">
          <AnalyticsModule campaignId={campaignId} />
        </GridCell>
        <GridCell span="half">
          <StrategyModule campaign={campaign} platformViews={platformViews} />
        </GridCell>
        <GridCell span="half">
          <DocumentsModule campaign={campaign} />
        </GridCell>
      </PageGrid>
    </div>
  )
}
