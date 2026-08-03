import { useMemo } from "react";
import {
  filterAssetPool,
  isFiltered,
  type AssetPoolFilters,
} from "@/lib/assetPool";
import type { SourceMode } from "@/lib/campaignSources";
import { cn } from "@/lib";
import type { Asset } from "@/types/content";
import { AssetPoolTable } from "./AssetPoolTable";
import { AssetPoolToolbar } from "./AssetPoolToolbar";

type Props = {
  /** The whole Content Bank. */
  assets: Asset[];
  /**
   * Which of `all` / `selected` the campaign is in. In `all` every row is
   * checked and frozen: the list is answering "what does *everything* mean"
   * rather than asking anything.
   */
  mode: Exclude<SourceMode, "campaign">;
  selectedIds: string[];
  onSelectedIdsChange: (ids: string[]) => void;
  filters: AssetPoolFilters;
  onFiltersChange: (filters: AssetPoolFilters) => void;
};

/** The heading over the list: how many assets this campaign can actually draw on. */
function inUseLabel(count: number): string {
  if (count === 0) return "No assets in use";
  if (count === 1) return "1 asset in use";
  return `${count} assets in use`;
}

/**
 * The Content Bank list, under the mode tiles: the bottom half of the Assets
 * page and the only thing on it that scrolls.
 *
 * Sits on the page background rather than in a card. The tiles are a control
 * that needed a surface to sit on; a table is not, and boxing it would only
 * add an edge between the rows and the page.
 *
 * It expects a parent that has already given it a bounded height (`min-h-0` on
 * a flex column), because the table virtualises against its own box. Inside a
 * page that scrolls, this would be two scrollbars racing for one wheel gesture.
 */
export function AssetPoolSection({
  assets,
  mode,
  selectedIds,
  onSelectedIdsChange,
  filters,
  onFiltersChange,
}: Props) {
  const selectable = mode === "selected";

  const visible = useMemo(
    () => filterAssetPool(assets, filters, selectedIds),
    [assets, filters, selectedIds],
  );

  // Whole-bank mode checks every row rather than showing an empty column that
  // contradicts the tile above it.
  const checkedIds = useMemo(
    () => (selectable ? selectedIds : assets.map((a) => a.id)),
    [selectable, selectedIds, assets],
  );

  // What this campaign will actually draw on, which is the whole bank unless
  // the user is picking.
  const inUse = selectable ? selectedIds.length : assets.length;

  const toggle = (id: string) =>
    onSelectedIdsChange(
      selectedIds.includes(id)
        ? selectedIds.filter((x) => x !== id)
        : [...selectedIds, id],
    );

  return (
    // Full width: the table is the page's own content, not something inset
    // inside it. pt-4 puts air between the tiles and this heading, on top of
    // the gap the page already leaves.
    <div className="flex min-h-0 flex-1 flex-col gap-4 pt-4">
      <h2 className="font-display text-xl font-medium tracking-tight">
        {inUseLabel(inUse)}
      </h2>

      <AssetPoolToolbar
        filters={filters}
        onChange={onFiltersChange}
        bankSize={assets.length}
        selectable={selectable}
      />

      {/* The table normally takes whatever height is left, which on a short
          screen is almost none — fine for rows, since they scroll, but it
          flattens the empty state into a sliver. Floor it when there is
          nothing to scroll. */}
      <div
        className={cn(
          "grid min-h-0 flex-1 overflow-hidden",
          visible.length === 0 && "min-h-50",
        )}
      >
        <AssetPoolTable
          assets={visible}
          selectedIds={checkedIds}
          onToggle={toggle}
          selectable={selectable}
          emptyStateMessage={
            isFiltered(filters)
              ? "No assets match these filters"
              : "No assets in the Content Bank"
          }
        />
      </div>
    </div>
  );
}
