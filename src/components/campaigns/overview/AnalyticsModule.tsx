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
 * With `campaign-analytics` off there is no card at all. It used to hold its
 * place with a "coming soon" preview, which put a permanent apology in the
 * middle of a screen the user opens to find out what to do next — and the
 * flag's whole promise is that the app behaves exactly as it did before the
 * feature existed. Returning early also keeps the fetch unmounted, so nothing
 * is requested for a section that isn't there.
 */
export function AnalyticsModule({ campaignId }: { campaignId: string }) {
  const enabled = useFeatureFlag("campaign-analytics");
  if (!enabled) return null;
  return <AnalyticsModuleLive campaignId={campaignId} />;
}

function AnalyticsModuleLive({ campaignId }: { campaignId: string }) {
  const result = useCampaignAnalytics(campaignId);
  return <AnalyticsModuleView campaignId={campaignId} {...result} />;
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
      <OverviewCard section="analytics">
        <Skeleton className="h-20 w-full" />
      </OverviewCard>
    );
  }

  if (isError || !data) {
    return (
      <OverviewCard section="analytics">
        <p className="text-sm text-tertiary-foreground">
          Couldn't load analytics.
        </p>
      </OverviewCard>
    );
  }

  const link = { target: "analytics" as const, campaignId };

  if (data.measured === 0) {
    return (
      <OverviewCard
        section="analytics"
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
    <OverviewCard section="analytics" link={link}>
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
