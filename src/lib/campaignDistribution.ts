import type {
  CampaignOverview,
  CampaignOverviewBucket,
} from "@/types/campaigns";

/**
 * Shapes the server's campaign overview (CON-113) into rows the Content
 * module can render.
 *
 * The counting itself is the server's: it aggregates every post in the
 * campaign, so these numbers stay right on campaigns far larger than the
 * page's own `posts` array. Nothing here recounts anything — it orders,
 * labels, and drops what would render as an empty row.
 */

/**
 * Same shape as the server's buckets — a row is a bucket with its label and
 * key resolved for display. `key` doubles as the stable React key: a phase
 * id, a platform id, or `unassigned`.
 */
export type DistributionRow = CampaignOverviewBucket;

/** The row for posts the server couldn't place in any phase. */
export const UNASSIGNED_PHASE_KEY = "unassigned";

/**
 * One row per phase in plan order, with whatever sits outside the plan last.
 *
 * Empty when the campaign's type has no phases — there is no plan to show
 * progress against, and a lone "not assigned" row would be a distinction
 * without a difference.
 */
export function phaseRows(overview: CampaignOverview): DistributionRow[] {
  if (overview.phases.length === 0) return [];

  const rows = [...overview.phases]
    .sort((a, b) => a.sequence - b.sequence)
    .map((phase) => ({
      key: phase.id,
      label: phase.name,
      count: phase.postCount,
    }));

  const unassigned = overview.distribution.unassignedPhasePostCount;
  if (unassigned > 0) {
    rows.push({
      key: UNASSIGNED_PHASE_KEY,
      label: "Not assigned to a phase",
      count: unassigned,
    });
  }
  return rows;
}

/**
 * One row per channel the campaign has posts on, in the server's order.
 *
 * Buckets that count nothing are dropped: the module's tabs already say which
 * channels the campaign targets, so a row of zeroes here would repeat that
 * list without adding to it.
 *
 * Posts with no platform come back under an empty key labelled "None", which
 * reads as a channel of that name in a list of channels — they are relabelled
 * as what they are.
 */
export function channelRows(overview: CampaignOverview): DistributionRow[] {
  return overview.distribution.byPlatform
    .filter((bucket) => bucket.count > 0)
    .map((bucket) => ({
      key: bucket.key,
      label: bucket.key === "" ? "No channel yet" : bucket.label,
      count: bucket.count,
    }));
}
