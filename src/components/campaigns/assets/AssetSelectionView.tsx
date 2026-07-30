import { useMemo } from "react";
import {
  filterAssetPool,
  isFiltered,
  type AssetPoolFilters,
} from "@/lib/assetPool";
import type { Asset, Tag } from "@/types/content";
import { AssetPoolTable } from "./AssetPoolTable";
import { AssetPoolToolbar } from "./AssetPoolToolbar";
import { SelectionBar } from "./SelectionBar";

type Props = {
  /** The whole Content Bank. */
  assets: Asset[];
  tags: Tag[];
  /** The working shortlist — unsaved until the header's Save. */
  selectedIds: string[];
  onSelectedIdsChange: (ids: string[]) => void;
  filters: AssetPoolFilters;
  onFiltersChange: (filters: AssetPoolFilters) => void;
  /**
   * False in whole-bank mode, where the screen answers "what does *everything*
   * mean" and the rows are not choices.
   */
  selectable?: boolean;
};

/**
 * Picking the campaign's shortlist out of the Content Bank — the screen behind
 * Configure.
 *
 * Expects a shell that does **not** scroll, the same one the Content Bank's own
 * list gets (`grid overflow-hidden h-full`). The table owns its scrolling
 * because it is hundreds of rows deep; inside a scrolling page it would be two
 * scrollbars racing for one wheel gesture.
 */
export function AssetSelectionView({
  assets,
  tags,
  selectedIds,
  onSelectedIdsChange,
  filters,
  onFiltersChange,
  selectable = true,
}: Props) {
  const visible = useMemo(
    () => filterAssetPool(assets, filters, selectedIds),
    [assets, filters, selectedIds],
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
    <div className="flex min-h-0 flex-col gap-3 pb-4">
      <AssetPoolToolbar
        filters={filters}
        onChange={onFiltersChange}
        tags={tags}
        bankSize={assets.length}
        selectedCount={selectedIds.length}
        selectable={selectable}
      />

      <div className="grid min-h-0 flex-1 overflow-hidden">
        <AssetPoolTable
          assets={visible}
          selectedIds={selectedIds}
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
