import { createFileRoute } from "@tanstack/react-router";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { AssetsModule } from "@/components/campaigns/overview/AssetsModule.tsx";
import { AttentionRail } from "@/components/campaigns/overview/AttentionRail.tsx";
import { BriefModule } from "@/components/campaigns/overview/BriefModule.tsx";
import { ContentModule } from "@/components/campaigns/overview/ContentModule.tsx";
import { SetupModule } from "@/components/campaigns/overview/SetupModule.tsx";
import { useCampaign, useCampaignOverview } from "@/hooks/useCampaigns.ts";
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
  const overviewQuery = useCampaignOverview(campaignId);
  const platformViews = usePlatformViews();

  // The backend sends `null` for a campaign with no posts (Go nil slice), so
  // gate on the query settling, not on the data being truthy.
  const posts = postsQuery.data ?? [];

  // The layout already handles campaign load errors; posts are the only other
  // gate — every module needs them to pick a posture.
  if (!campaign || postsQuery.isPending) {
    return (
      <div className="min-h-0 overflow-y-auto">
        <div className="flex flex-col gap-3 pb-10">
          <Skeleton className="h-40" />
          <Skeleton className="h-64" />
          <Skeleton className="h-32" />
          <Skeleton className="h-14" />
        </div>
      </div>
    );
  }

  const items = attentionItems(campaign, posts, platformViews);

  return (
    <div className="min-h-0 overflow-y-auto">
      <div className="flex flex-col gap-3 pb-10">
        <AttentionRail items={items} campaignId={campaignId} />
        <BriefModule campaign={campaign} />
        <ContentModule
          campaignId={campaignId}
          posts={posts}
          overview={overviewQuery.data}
          overviewError={overviewQuery.isError}
        />
        <SetupModule campaign={campaign} platformViews={platformViews} />
        <AssetsModule campaign={campaign} />
      </div>
    </div>
  );
}
