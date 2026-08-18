import { createFileRoute } from "@tanstack/react-router";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { AnalyticsModule } from "@/components/campaigns/overview/AnalyticsModule.tsx";
import { AssetsModule } from "@/components/campaigns/overview/AssetsModule.tsx";
import { AttentionRail } from "@/components/campaigns/overview/AttentionRail.tsx";
import { BriefModule } from "@/components/campaigns/overview/BriefModule.tsx";
import { ContentModule } from "@/components/campaigns/overview/ContentModule.tsx";
import { SetupModule } from "@/components/campaigns/overview/SetupModule.tsx";
import { useCampaign } from "@/hooks/useCampaigns.ts";
import { useCampaignPosts } from "@/hooks/usePosts.ts";
import { usePlatformViews } from "@/hooks/usePlatforms.ts";
import { attentionItems } from "@/lib/campaignReadiness.ts";

export const Route = createFileRoute(
  "/_authenticated/campaigns/$campaignId/overview",
)({
  component: CampaignOverviewScreen,
});

/**
 * The campaign's control panel (CON-120): dashboard, control centre, and
 * to-do list in one screen. Each module derives its own posture from data, so
 * the same layout reads as guided setup on a fresh campaign and as a status
 * dashboard mid-campaign.
 */
function CampaignOverviewScreen() {
  const { campaignId } = Route.useParams();
  const { data: campaign } = useCampaign(campaignId);
  const postsQuery = useCampaignPosts(campaignId);
  const platformViews = usePlatformViews();

  // The backend sends `null` for a campaign with no posts (Go nil slice), so
  // gate on the query settling, not on the data being truthy.
  const posts = postsQuery.data ?? [];

  // The layout already handles campaign load errors. It also no longer waits
  // on the campaign to arrive — `useCampaign` seeds itself from the list the
  // sidebar has already fetched — so this screen is normally reached with the
  // campaign in hand and only the posts outstanding.
  if (!campaign) {
    return (
      <div className="flex flex-col gap-3 pb-10">
        <Skeleton className="h-40 w-full max-w-content mx-auto" />
        <Skeleton className="h-64 w-full max-w-content mx-auto" />
        <Skeleton className="h-32 w-full max-w-content mx-auto" />
        <Skeleton className="h-14 w-full max-w-content mx-auto" />
      </div>
    );
  }

  // Only two modules are claims about the posts. The other four describe the
  // campaign, which is already here, so they render at once and hold their
  // place: the page arrives as a page with two gaps filling in, rather than as
  // a stack of grey blocks that is then replaced wholesale.
  const postsPending = postsQuery.isPending;

  // A failed fetch is not an empty campaign: `data ?? []` after an error would
  // put "You're all set" and "No posts yet" on screen as if they were facts.
  // Cached data from an earlier success still counts — only the fetch that
  // never produced anything gets the error strip.
  const postsFailed = postsQuery.isError && postsQuery.data === undefined;

  // Several attention rules are time-based (overdue slots, the next 24h, pace),
  // so they are recomputed on every render against the current clock rather
  // than memoized against a frozen `now`.
  const items = attentionItems(campaign, posts, platformViews, new Date());

  // The cards run in the sidebar's order — posts, analytics, brief, assets,
  // settings — because they are the same six sections, and a screen that
  // ordered them by urgency taught a second sequence for the same list. The
  // brief used to float above Content while it was unfinished; what made that
  // safe to drop is the rail above, which is where "your brief is empty"
  // belongs anyway. Attention is the exception because it is not a section:
  // it is the summary of all of them, so it sits above the set.
  return (
    <div className="flex flex-col gap-3 pb-10">
      {/* Never the all-clear before the posts have been counted — "You're all
          set" off an empty list is the one wrong thing this screen could say. */}
      {postsFailed ? (
        <p className="w-full max-w-content mx-auto text-sm text-tertiary-foreground">
          Couldn’t load this campaign’s posts — the attention summary and
          content will appear once they’re reachable again.
        </p>
      ) : postsPending ? (
        <Skeleton className="h-40 w-full max-w-content mx-auto" />
      ) : (
        <AttentionRail items={items} campaignId={campaignId} />
      )}
      {postsFailed ? null : postsPending ? (
        <Skeleton className="h-64 w-full max-w-content mx-auto" />
      ) : (
        <ContentModule campaign={campaign} posts={posts} />
      )}
      {/* Directly under Content: the same posts, seen by what they earned
          rather than by where they are in the pipeline. The card reads its own
          flag and renders nothing while `campaign-analytics` is off. */}
      <AnalyticsModule campaignId={campaignId} />
      <BriefModule campaign={campaign} />
      <AssetsModule campaign={campaign} />
      <SetupModule campaign={campaign} platformViews={platformViews} />
    </div>
  );
}
