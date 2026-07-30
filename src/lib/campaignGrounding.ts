import type { Campaign, UpdateCampaignPayload } from "@/types/campaigns";
import type { Asset, AssetStatus } from "@/types/content";

/**
 * How a campaign's generated content is grounded. Mirrors the Go server's
 * `UseAssets` / `AssetIDs` pair (CON-118, `content_plan/assets.go`), which
 * encodes three states in two fields:
 *
 * - `off`      — `use_assets: false`. The brief is the only source.
 * - `all`      — `use_assets: true`, `asset_ids: []`. **An empty list means
 *                every ready asset in the bank**, not "nothing selected".
 * - `selected` — `use_assets: true`, `asset_ids: [...]`. Exactly those.
 *
 * The empty-list-means-everything rule is the one that bites: read naively,
 * `all` looks like a half-configured `selected`.
 */
export type GroundingMode = "off" | "all" | "selected";

export function groundingModeOf(
  campaign: Pick<Campaign, "use_assets" | "asset_ids">,
): GroundingMode {
  if (!campaign.use_assets) return "off";
  return campaign.asset_ids.length > 0 ? "selected" : "all";
}

/**
 * The pair of campaign fields a mode resolves to. Both are required here even
 * though `UpdateCampaignPayload` has them optional — a mode always says
 * something about both, and a partially-specified grounding is a bug.
 */
export type GroundingFields = Required<
  Pick<UpdateCampaignPayload, "use_assets" | "asset_ids">
>;

/**
 * The two campaign fields for a mode plus a working selection.
 *
 * `off` keeps the id list so switching grounding off and back on doesn't throw
 * the user's shortlist away. `all` must clear it — a non-empty list is what
 * makes the server treat the pool as explicit.
 */
export function groundingPayload(
  mode: GroundingMode,
  assetIds: string[],
): GroundingFields {
  switch (mode) {
    case "off":
      return { use_assets: false, asset_ids: assetIds };
    case "all":
      return { use_assets: true, asset_ids: [] };
    case "selected":
      return { use_assets: true, asset_ids: assetIds };
  }
}

/**
 * Whether retrieval can actually reach an asset.
 *
 * - `ready`   — chunked and embedded; the retriever can pull passages from it.
 * - `waiting` — `pending`/`processing`; nothing to retrieve *yet*.
 * - `never`   — `failed`/`partial`; the server skips these outright
 *               (CON-118 §10), so an attached one is silently inert.
 */
export type Retrievability = "ready" | "waiting" | "never";

export function retrievability(status: AssetStatus): Retrievability {
  switch (status) {
    case "ready":
      return "ready";
    case "pending":
    case "processing":
      return "waiting";
    case "partial":
    case "failed":
      return "never";
  }
}

export type PoolStats = {
  total: number;
  /** Assets retrieval can use right now. */
  ready: number;
  /** Assets still processing — usable once they finish. */
  waiting: number;
  /** Assets retrieval will never use. */
  inert: number;
};

export function poolStats(assets: Pick<Asset, "status">[]): PoolStats {
  const stats: PoolStats = { total: 0, ready: 0, waiting: 0, inert: 0 };
  for (const asset of assets) {
    stats.total += 1;
    switch (retrievability(asset.status)) {
      case "ready":
        stats.ready += 1;
        break;
      case "waiting":
        stats.waiting += 1;
        break;
      case "never":
        stats.inert += 1;
        break;
    }
  }
  return stats;
}

/** The stats for just the attached subset, for the warnings on the mode card. */
export function selectionStats(
  assets: Pick<Asset, "id" | "status">[],
  selectedIds: string[],
): PoolStats {
  const selected = new Set(selectedIds);
  return poolStats(assets.filter((a) => selected.has(a.id)));
}

/**
 * Why this configuration can't be saved, in the interface's voice, or null.
 *
 * `selected` with nothing selected is the only unsaveable state: the server
 * would read the empty list as "every ready asset" — the opposite of what an
 * empty shortlist looks like it means. Blocking it here is what lets us skip a
 * fourth backend field.
 */
export function groundingError(
  mode: GroundingMode,
  selectedIds: string[],
): string | null {
  if (mode === "selected" && selectedIds.length === 0) {
    return "Pick at least one asset, or switch to Brief only.";
  }
  return null;
}
