/**
 * A campaign's slice of the workspace's analytics.
 *
 * `GET /api/analytics/posts` answers for the whole tenant — it filters by
 * platform and nothing else — so the campaign dimension is applied here, by
 * intersecting the measured posts with the ones this campaign owns. That is
 * the reason the analytics feature is still flagged: the totals the server
 * computes (`overview`) are workspace-wide and must not be shown on a campaign
 * screen, so everything below is summed from the returned rows instead.
 *
 * The consequence to keep in mind: these totals are only complete while the
 * fetched page covers every measured post of the campaign. `coverage` reports
 * that honestly rather than letting a partial sum pass for a total.
 *
 * The join is on `post_id`, and each measured row is paired back with the
 * campaign's own post. That pairing is what the screens read from — the
 * analytics row carries a *denormalised* title and platform, frozen at the
 * moment the sweep ran, so a post renamed since would show its old name.
 */

import type { AnalyticsMetrics, PostAnalyticsItem } from "@/types/analytics";
import type { PostSummary } from "@/types/posts";

/** The metric keys that sum. `engagement_rate` averages instead. */
const SUMMED = [
  "impressions",
  "reach",
  "likes",
  "comments",
  "shares",
  "saves",
  "clicks",
  "views",
] as const;

export type SummedMetric = (typeof SUMMED)[number];

/** One of the campaign's posts, with the numbers the platforms reported for it. */
export type MeasuredPost<T extends PostSummary> = {
  post: T;
  metrics: AnalyticsMetrics;
  /** When Ogen last fetched these numbers. */
  lastRefreshedAt: string;
};

export type CampaignAnalytics<T extends PostSummary> = {
  /** How many of the campaign's posts have at least one snapshot. */
  measured: number;
  totals: Record<SummedMetric, number>;
  /** Mean engagement rate over the measured posts, as a fraction (0.031 = 3.1%). */
  engagementRate: number;
  /** The most recent fetch across the measured posts — how fresh this is. */
  lastRefreshedAt: string | null;
  /** Measured posts, best engagement first. */
  ranked: MeasuredPost<T>[];
  coverage: AnalyticsCoverage;
};

/**
 * How much of what the campaign published has actually been measured.
 *
 * A published post only appears in analytics once the refresh sweep has
 * covered it, and a post published by hand outside Ogen never gets there at
 * all — so the totals routinely describe a subset. Screens say which subset
 * rather than presenting a partial total as the campaign's performance.
 */
export type AnalyticsCoverage = {
  measured: number;
  published: number;
  /** True when every published post has numbers — the totals are complete. */
  complete: boolean;
};

function emptyTotals(): Record<SummedMetric, number> {
  return {
    impressions: 0,
    reach: 0,
    likes: 0,
    comments: 0,
    shares: 0,
    saves: 0,
    clicks: 0,
    views: 0,
  };
}

/**
 * Narrows a workspace-wide analytics page to one campaign and totals it.
 *
 * `posts` is the campaign's own post list, already loaded by the page; a
 * measured row whose post isn't in it belongs to another campaign.
 */
export function campaignAnalytics<T extends PostSummary>(
  items: readonly PostAnalyticsItem[],
  posts: readonly T[],
): CampaignAnalytics<T> {
  const byId = new Map(posts.map((post) => [post.id, post]));

  const measured: MeasuredPost<T>[] = [];
  for (const item of items) {
    const post = byId.get(item.post_id);
    if (!post) continue;
    measured.push({
      post,
      metrics: item.analytics,
      lastRefreshedAt: item.last_refreshed_at,
    });
  }

  const totals = emptyTotals();
  let rateSum = 0;
  let lastRefreshedAt: string | null = null;

  for (const { metrics, lastRefreshedAt: at } of measured) {
    for (const key of SUMMED) totals[key] += metrics[key];
    rateSum += metrics.engagement_rate;
    // ISO-8601 in UTC compares correctly as a string, which is how every other
    // "latest" in this codebase is picked (see `contentSnapshot`).
    if (lastRefreshedAt === null || at > lastRefreshedAt) lastRefreshedAt = at;
  }

  const published = posts.filter((post) => post.status === "published").length;

  return {
    measured: measured.length,
    totals,
    engagementRate: measured.length === 0 ? 0 : rateSum / measured.length,
    lastRefreshedAt,
    ranked: [...measured].sort(
      (a, b) => b.metrics.engagement_rate - a.metrics.engagement_rate,
    ),
    coverage: {
      measured: measured.length,
      published,
      complete: measured.length >= published,
    },
  };
}

/** `0.0312` → `"3.1%"`. The server sends a fraction; every screen shows a percent. */
export function formatEngagementRate(rate: number): string {
  return `${(rate * 100).toFixed(1)}%`;
}

/** Thousands separators, and `12.3K` / `4.5M` once a raw count stops being readable. */
export function formatMetric(value: number): string {
  if (value < 10_000) return value.toLocaleString();
  if (value < 1_000_000) return `${(value / 1_000).toFixed(1)}K`;
  return `${(value / 1_000_000).toFixed(1)}M`;
}
