import { useMemo } from "react";
import {
  filterAssetPool,
  isFiltered,
  type AssetPoolFilters,
} from "@/lib/assetPool";
import type { SourceMode } from "@/lib/campaignSources";
import type { Asset, Tag } from "@/types/content";
import { AssetPoolTable } from "./AssetPoolTable";
import { AssetPoolToolbar } from "./AssetPoolToolbar";
import { SelectionBar } from "./SelectionBar";

type Props = {
  /** The whole Content Bank. */
  assets: Asset[];
  tags: Tag[];
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

/**
 * The Content Bank list, under the mode tiles — the bottom half of the Assets
 * page and the only thing on it that scrolls.
 *
 * It expects a parent that has already given it a bounded height (`min-h-0` on
 * a flex column), because the table virtualises against its own box. Inside a
 * page that scrolls, this would be two scrollbars racing for one wheel gesture.
 */
export function AssetPoolSection({
  assets,
  tags,
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

  const matchingSelectedCount = useMemo(() => {
    const selected = new Set(selectedIds);
    return visible.reduce((n, a) => (selected.has(a.id) ? n + 1 : n), 0);
  }, [visible, selectedIds]);

  const toggle = (id: string) =>
    onSelectedIdsChange(
      selectedIds.includes(id)
        ? selectedIds.filter((x) => x !== id)
        : [...selectedIds, id],
    );

  const selectMatching = () => {
    const next = new Set(selectedIds);
    for (const asset of visible) next.add(asset.id);
    onSelectedIdsChange([...next]);
  };

  const deselectMatching = () => {
    const drop = new Set(visible.map((a) => a.id));
    onSelectedIdsChange(selectedIds.filter((id) => !drop.has(id)));
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <AssetPoolToolbar
        filters={filters}
        onChange={onFiltersChange}
        tags={tags}
        bankSize={assets.length}
        selectable={selectable}
      />

      <div className="grid min-h-0 flex-1 overflow-hidden">
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

      {selectable && (
        <SelectionBar
          selectedCount={selectedIds.length}
          matchingCount={visible.length}
          matchingSelectedCount={matchingSelectedCount}
          filtered={isFiltered(filters)}
          onSelectMatching={selectMatching}
          onDeselectMatching={deselectMatching}
          onClear={() => onSelectedIdsChange([])}
        />
      )}
    </div>
  );
}
