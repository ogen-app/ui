import { Link } from "@tanstack/react-router";
import { ChartLineUpIcon } from "@phosphor-icons/react";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { OverviewCard } from "@/components/campaigns/overview/OverviewCard.tsx";
import { LineItem } from "@/components/campaigns/overview/LineItem.tsx";
import { MetricTile } from "./MetricTile.tsx";
import {
  useCampaignAnalytics,
  type CampaignAnalyticsResult,
} from "@/hooks/useAnalytics.ts";
import {
  formatEngagementRate,
  formatMetric,
  type CampaignAnalytics,
  type MeasuredPost,
} from "@/lib/campaignAnalytics.ts";
import { formatTitle } from "@/lib";
import { getPlatformInfo } from "@/lib/platformDictionary.ts";
import { relativeTime } from "@/lib/relativeTime.ts";
import type { Post } from "@/types/posts";

/** How many measured posts the ranked list shows before it stops. */
const RANKED_SHOWN = 10;

/**
 * The campaign's Analytics section (CON-175) — a first cut.
 *
 * What is real here: the engagement of every post of this campaign that the
 * refresh sweep has measured, summed and ranked. What is not here yet: best
 * times to post, content decay, posting frequency and follower growth, which
 * the API already serves (`/api/analytics/{best-times,content-decay,
 * posting-frequency,followers}`) and this page will grow into.
 *
 * Every number on the page is assembled client-side from a workspace-wide
 * response — see `lib/campaignAnalytics` — so the page always says how much of
 * the campaign it is actually describing.
 */
export function CampaignAnalyticsPanel({ campaignId }: { campaignId: string }) {
  const result = useCampaignAnalytics(campaignId);
  return <CampaignAnalyticsView campaignId={campaignId} {...result} />;
}

/**
 * The section as pure rendering — every state it can be in is an argument.
 *
 * Split from the fetch above so the design harness can hold each state still
 * (`routes/design/campaign-analytics`); states that only occur against a
 * particular deployment — no analytics database, a half-swept campaign — are
 * otherwise not reachable to look at.
 */
export function CampaignAnalyticsView({
  campaignId,
  data,
  isPending,
  isError,
  isUnavailable,
}: CampaignAnalyticsResult & { campaignId: string }) {
  return (
    <div className="flex flex-col gap-3 pb-10">
      {isPending ? (
        <>
          <Skeleton className="h-40 w-full max-w-content mx-auto" />
          <Skeleton className="h-64 w-full max-w-content mx-auto" />
        </>
      ) : isUnavailable ? (
        <OverviewCard title="Engagement">
          <p className="text-sm text-secondary-foreground">
            Analytics isn't switched on for this workspace, so nothing is being
            measured yet. Everything else about the campaign works as usual.
          </p>
        </OverviewCard>
      ) : isError || !data ? (
        <OverviewCard title="Engagement">
          <p className="text-sm text-secondary-foreground">
            Couldn't load analytics. The campaign itself is unaffected — try
            again in a moment.
          </p>
        </OverviewCard>
      ) : (
        <>
          <Engagement data={data} />
          <RankedPosts
            campaignId={campaignId}
            posts={data.ranked.slice(0, RANKED_SHOWN)}
          />
          <StillToCome />
        </>
      )}
    </div>
  );
}

function Engagement({ data }: { data: CampaignAnalytics<Post> }) {
  if (data.measured === 0) {
    return (
      <OverviewCard title="Engagement">
        <p className="text-sm text-secondary-foreground">
          {data.coverage.published === 0
            ? "Nothing has been published yet, so there is nothing to measure."
            : "None of this campaign's published posts have been measured yet. Numbers usually appear within a few hours of publishing."}
        </p>
      </OverviewCard>
    );
  }

  const { totals } = data;

  return (
    <OverviewCard title="Engagement">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <MetricTile
          value={formatMetric(totals.impressions)}
          label="Impressions"
          hint="Times these posts were shown"
        />
        <MetricTile
          value={formatMetric(totals.reach)}
          label="Reach"
          hint="Distinct accounts reached"
        />
        <MetricTile
          value={formatMetric(totals.likes + totals.comments + totals.shares)}
          label="Interactions"
          hint="Likes, comments and shares together"
        />
        <MetricTile
          value={formatEngagementRate(data.engagementRate)}
          label="Engagement rate"
          hint="Averaged across the measured posts"
        />
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <MetricTile value={formatMetric(totals.likes)} label="Likes" />
        <MetricTile value={formatMetric(totals.comments)} label="Comments" />
        <MetricTile value={formatMetric(totals.shares)} label="Shares" />
        <MetricTile value={formatMetric(totals.clicks)} label="Clicks" />
      </div>

      {/* Part of the card, not an Explainer: this line says what the totals
          above do and don't cover, so it can't be something a reader is able
          to dismiss. */}
      <CoverageNote data={data} />
    </OverviewCard>
  );
}

export function CoverageNote({ data }: { data: CampaignAnalytics<Post> }) {
  const { measured, published, complete } = data.coverage;
  return (
    <p className="text-xs text-tertiary-foreground">
      {complete
        ? `Across all ${published} published ${published === 1 ? "post" : "posts"}`
        : `Across ${measured} of ${published} published posts — the rest haven't been measured yet`}
      {data.lastRefreshedAt && ` · updated ${relativeTime(data.lastRefreshedAt)}`}
    </p>
  );
}

function RankedPosts({
  campaignId,
  posts,
}: {
  campaignId: string;
  posts: MeasuredPost<Post>[];
}) {
  if (posts.length === 0) return null;

  return (
    <OverviewCard title="Best performing">
      <ul className="flex flex-col">
        {posts.map(({ post, metrics }) => {
          const info = getPlatformInfo(post.platform_id);
          return (
            <li key={post.id}>
              <LineItem
                asChild
                indicator={
                  info
                    ? {
                        kind: "custom",
                        node: (
                          <info.icon
                            className="size-4"
                            style={{ color: info.color }}
                          />
                        ),
                      }
                    : undefined
                }
                label={formatTitle(post.title, "Untitled post")}
                trailing={
                  <>
                    <span className="w-20 text-right">
                      {formatMetric(metrics.impressions)}
                    </span>
                    <span className="w-16 text-right">
                      {formatEngagementRate(metrics.engagement_rate)}
                    </span>
                  </>
                }
              >
                <Link
                  to="/campaigns/$campaignId/posts/$postId"
                  params={{ campaignId, postId: post.id }}
                />
              </LineItem>
            </li>
          );
        })}
      </ul>
      {/* Column headings would need a table; one line under a ten-row list
          says the same thing for a section this size. */}
      <p className="text-right text-xs text-tertiary-foreground">
        Impressions · engagement rate
      </p>
    </OverviewCard>
  );
}

/**
 * The rest of the section, named rather than hidden. Each row is an endpoint
 * that already answers — what's left is the screen, not the data.
 */
const TO_COME: [string, string][] = [
  ["Best times to post", "Which hours of the week actually land"],
  ["Content decay", "How long a post keeps earning engagement"],
  ["Posting frequency", "Whether posting more is helping or hurting"],
  ["Follower growth", "The audience behind the numbers above"],
];

function StillToCome() {
  return (
    <OverviewCard title="Still to come">
      <ul className="flex flex-col gap-2">
        {TO_COME.map(([title, detail]) => (
          <li key={title} className="flex items-start gap-3">
            <ChartLineUpIcon
              className="mt-0.5 size-4 shrink-0 text-quaternary-foreground"
              aria-hidden
            />
            <div className="flex min-w-0 flex-col">
              <span className="text-sm text-secondary-foreground">{title}</span>
              <span className="text-xs text-tertiary-foreground">{detail}</span>
            </div>
          </li>
        ))}
      </ul>
    </OverviewCard>
  );
}
