import { createFileRoute } from "@tanstack/react-router";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { AnalyticsModule } from "@/components/campaigns/overview/AnalyticsModule.tsx";
import { DocumentsModule } from "@/components/campaigns/overview/DocumentsModule.tsx";
import { AttentionRail } from "@/components/campaigns/overview/AttentionRail.tsx";
import { BriefModule } from "@/components/campaigns/overview/BriefModule.tsx";
import { ContentModule } from "@/components/campaigns/overview/ContentModule.tsx";
import { SetupModule } from "@/components/campaigns/overview/SetupModule.tsx";
import { useCampaign } from "@/hooks/useCampaigns.ts";
import { useCampaignPosts } from "@/hooks/usePosts.ts";
import { usePlatformViews } from "@/hooks/usePlatforms.ts";
import { attentionItems, briefPosture } from "@/lib/campaignReadiness.ts";

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

  // The layout already handles campaign load errors; posts are the only other
  // gate — every module needs them to pick a posture.
  if (!campaign || postsQuery.isPending) {
    return (
      <div className="flex flex-col gap-3 pb-10">
        <Skeleton className="h-40 w-full max-w-content mx-auto" />
        <Skeleton className="h-64 w-full max-w-content mx-auto" />
        <Skeleton className="h-32 w-full max-w-content mx-auto" />
        <Skeleton className="h-14 w-full max-w-content mx-auto" />
      </div>
    );
  }

  // Several attention rules are time-based (overdue slots, the next 24h, pace),
  // so they are recomputed on every render against the current clock rather
  // than memoized against a frozen `now`.
  const items = attentionItems(campaign, posts, platformViews, new Date());

  // A brief that still needs writing is the first thing to do; a finished one
  // is reference material, so it drops below the content it produced.
  const brief = <BriefModule key="brief" campaign={campaign} />;
  const briefDone = briefPosture(campaign).state === "complete";

  return (
    <div className="flex flex-col gap-3 pb-10">
      <AttentionRail items={items} campaignId={campaignId} />
      {!briefDone && brief}
      <ContentModule campaign={campaign} posts={posts} />
      {/* Directly under Content: the same posts, seen by what they earned
          rather than by where they are in the pipeline. The card reads its own
          flag — while `campaign-analytics` is off it holds its place with a
          preview rather than disappearing. */}
      <AnalyticsModule campaignId={campaignId} />
      {briefDone && brief}
      <SetupModule campaign={campaign} platformViews={platformViews} />
      <DocumentsModule campaign={campaign} />
    </div>
  );
}
