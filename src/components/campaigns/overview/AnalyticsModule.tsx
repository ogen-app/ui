import { StatusBadge } from "@/components/ui/status-badge.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { MetricTile } from "@/components/campaigns/analytics/MetricTile.tsx";
import {
  useCampaignAnalytics,
  type CampaignAnalyticsResult,
} from "@/hooks/useAnalytics.ts";
import {
  formatEngagementRate,
  formatMetric,
} from "@/lib/campaignAnalytics.ts";
import { useFeatureFlag } from "@/config/featureFlags.ts";
import { OverviewCard } from "./OverviewCard.tsx";

/**
 * How the campaign is performing, on the Overview (CON-175).
 *
 * The counterpart to the Content module above it: Content is about posts as
 * work — what is drafted, scheduled, published — and this is about what those
 * posts did once they were out. That split is why the Overview's post
 * distribution moved off the Content card; totals belong on this side of the
 * line, and the Analytics page is where they lead.
 *
 * Four numbers and a link, deliberately: the card exists to say whether it is
 * worth opening the section, not to be the section.
 *
 * While `campaign-analytics` is off the card still stands where it will stand,
 * saying what it will hold and pointing at the section — the two components
 * keep the fetch unmounted until there is something to fetch for.
 */
export function AnalyticsModule({ campaignId }: { campaignId: string }) {
  const enabled = useFeatureFlag("campaign-analytics");
  if (!enabled) return <ComingSoon campaignId={campaignId} />;
  return <AnalyticsModuleLive campaignId={campaignId} />;
}

function AnalyticsModuleLive({ campaignId }: { campaignId: string }) {
  const result = useCampaignAnalytics(campaignId);
  return <AnalyticsModuleView campaignId={campaignId} {...result} />;
}

/** The card's place held, with no numbers in it — real or invented. */
function ComingSoon({ campaignId }: { campaignId: string }) {
  return (
    <OverviewCard
      title="Analytics"
      status={<StatusBadge tone="neutral" label="Coming soon" />}
      link={{ target: "analytics", campaignId, label: "See what's coming" }}
    >
      <p className="text-sm text-secondary-foreground">
        Once this campaign's posts start being measured, what they earned shows
        up here.
      </p>
    </OverviewCard>
  );
}

/** The card as pure rendering — see `CampaignAnalyticsView` for why. */
export function AnalyticsModuleView({
  campaignId,
  data,
  isPending,
  isError,
  isUnavailable,
}: CampaignAnalyticsResult & { campaignId: string }) {
  // A workspace with no analytics database has no Analytics section to preview
  // — the card would be a permanent apology on a screen about this campaign.
  if (isUnavailable) return null;

  if (isPending) {
    return (
      <OverviewCard title="Analytics">
        <Skeleton className="h-20 w-full" />
      </OverviewCard>
    );
  }

  if (isError || !data) {
    return (
      <OverviewCard title="Analytics">
        <p className="text-sm text-tertiary-foreground">
          Couldn't load analytics.
        </p>
      </OverviewCard>
    );
  }

  const link = {
    target: "analytics" as const,
    campaignId,
    label: "Open analytics",
  };

  if (data.measured === 0) {
    return (
      <OverviewCard
        title="Analytics"
        status={<StatusBadge tone="neutral" label="Nothing measured yet" />}
        link={link}
      >
        <p className="text-sm text-secondary-foreground">
          {data.coverage.published === 0
            ? "Once this campaign starts publishing, what each post earns shows up here."
            : "The platforms haven't reported on this campaign's posts yet — numbers show up here once they do."}
        </p>
      </OverviewCard>
    );
  }

  const { totals } = data;

  return (
    <OverviewCard title="Analytics" link={link}>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <MetricTile
          value={formatMetric(totals.impressions)}
          label="Impressions"
        />
        <MetricTile value={formatMetric(totals.reach)} label="Reach" />
        <MetricTile
          value={formatMetric(totals.likes + totals.comments + totals.shares)}
          label="Interactions"
        />
        <MetricTile
          value={formatEngagementRate(data.engagementRate)}
          label="Engagement rate"
        />
      </div>
      <p className="text-xs text-tertiary-foreground">
        {data.coverage.complete
          ? `Across all ${data.coverage.published} published ${data.coverage.published === 1 ? "post" : "posts"}`
          : `Across ${data.coverage.measured} of ${data.coverage.published} published posts`}
      </p>
    </OverviewCard>
  );
}
