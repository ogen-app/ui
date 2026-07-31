import type { Campaign, UpdateCampaignPayload } from "@/types/campaigns";
import type { Asset, AssetStatus } from "@/types/content";

/**
 * Where a campaign's generated content is written from. Mirrors the Go server's
 * `UseAssets` / `AssetIDs` pair (CON-118, `content_plan/assets.go`), which
 * encodes three states in two fields:
 *
 * - `campaign` — `use_assets: false`. The campaign itself is the only source.
 * - `all`      — `use_assets: true`, `asset_ids: []`. **An empty list means
 *                every ready asset in the bank**, not "nothing selected".
 * - `selected` — `use_assets: true`, `asset_ids: [...]`. Exactly those.
 *
 * The empty-list-means-everything rule is the one that bites: read naively,
 * `all` looks like a half-configured `selected`.
 *
 * `campaign` is also what an untouched campaign is in, which is why it's the
 * page's default rather than a fourth "undecided" state. The server can't tell
 * the two apart, and doesn't need to: both mean the same thing to generation.
 */
export type SourceMode = "campaign" | "all" | "selected";

export function sourceModeOf(
  campaign: Pick<Campaign, "use_assets" | "asset_ids">,
): SourceMode {
  if (!campaign.use_assets) return "campaign";
  return campaign.asset_ids.length > 0 ? "selected" : "all";
}

/**
 * The pair of campaign fields a mode resolves to. Both are required here even
 * though `UpdateCampaignPayload` has them optional — a mode always says
 * something about both, and a partially-specified pair is a bug.
 */
export type SourceFields = Required<
  Pick<UpdateCampaignPayload, "use_assets" | "asset_ids">
>;

/**
 * The two campaign fields for a mode plus a working selection.
 *
 * `campaign` keeps the id list so switching the bank off and back on doesn't
 * throw the user's set away. `all` must clear it — a non-empty list is what
 * makes the server treat the pool as explicit.
 */
export function sourcesPayload(
  mode: SourceMode,
  assetIds: string[],
): SourceFields {
  switch (mode) {
    case "campaign":
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
 *               (CON-118 §10), so an assigned one is silently inert.
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

/** The stats for just the assigned subset, for the count under the tile. */
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
 * `selected` with nothing assigned is the only unsaveable state: the server
 * would read the empty list as "every ready asset" — the opposite of what an
 * empty set looks like it means. Holding the save back here is what lets us
 * skip a third backend field.
 */
export function sourcesError(
  mode: SourceMode,
  selectedIds: string[],
): string | null {
  if (mode === "selected" && selectedIds.length === 0) {
    return "Assign at least one asset, or switch to Campaign only.";
  }
  return null;
}
