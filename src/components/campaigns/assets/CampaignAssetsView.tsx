import { useMemo } from "react";
import { Link } from "@tanstack/react-router";
import { SettingsCard } from "@/components/settings/SettingsCard";
import {
  filterAssetPool,
  isFiltered,
  type AssetPoolFilters,
} from "@/lib/assetPool";
import {
  poolStats,
  selectionStats,
  type GroundingMode,
} from "@/lib/campaignGrounding";
import type { Asset, Tag } from "@/types/content";
import { AssetPoolTable } from "./AssetPoolTable";
import { AssetPoolToolbar } from "./AssetPoolToolbar";
import { GroundingCard } from "./GroundingCard";
import { SelectionBar } from "./SelectionBar";

type Props = {
  mode: GroundingMode;
  onModeChange: (mode: GroundingMode) => void;
  /** The whole Content Bank. */
  assets: Asset[];
  tags: Tag[];
  /** The working shortlist — unsaved until the page's Save. */
  selectedIds: string[];
  onSelectedIdsChange: (ids: string[]) => void;
  filters: AssetPoolFilters;
  onFiltersChange: (filters: AssetPoolFilters) => void;
};

/**
 * The campaign Assets page, presentational: what a campaign's content is built
 * from. Grounding mode on top, the bank below it.
 *
 * Expects a shell that does **not** scroll — the calendar/list branch of the
 * campaign layout, not the Brief/Settings one. The pool owns its own scrolling
 * because it is hundreds of rows deep; putting it inside a scrolling page would
 * mean two nested scrollbars racing each other for the same wheel gesture.
 *
 * All state is the caller's, so the route can own fetching and saving and the
 * design harness can pin any combination of mode, selection, and bank.
 */
export function CampaignAssetsView({
  mode,
  onModeChange,
  assets,
  tags,
  selectedIds,
  onSelectedIdsChange,
  filters,
  onFiltersChange,
}: Props) {
  const bank = useMemo(() => poolStats(assets), [assets]);
  const selection = useMemo(
    () => selectionStats(assets, selectedIds),
    [assets, selectedIds],
  );

  // In `all` mode the list is context, not a control: it answers "what does
  // *everything* mean" without pretending the rows are individually chosen.
  const selectable = mode === "selected";

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
    <div className="flex min-h-0 flex-1 flex-col gap-4 pb-4">
      <GroundingCard
        mode={mode}
        onModeChange={onModeChange}
        bank={bank}
        selection={selection}
      />

      {mode !== "off" &&
        (assets.length === 0 ? (
          <EmptyBank />
        ) : (
          <SettingsCard
            title={selectable ? "Attach assets" : "What's in play"}
            className="max-w-none min-h-0 flex-1"
          >
            <AssetPoolToolbar
              filters={filters}
              onChange={onFiltersChange}
              tags={tags}
              bankSize={assets.length}
              selectedCount={selectedIds.length}
              selectable={selectable}
            />

            <div className="flex min-h-0 flex-1 flex-col">
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
          </SettingsCard>
        ))}
    </div>
  );
}

/** Nothing to ground against yet — the only useful action is elsewhere. */
function EmptyBank() {
  return (
    <SettingsCard className="max-w-none">
      <div className="flex flex-col items-start gap-2 py-4">
        <p className="text-sm text-secondary-foreground">
          The Content Bank is empty. Add the articles, briefs, and PDFs this
          campaign should speak from, and they'll show up here.
        </p>
        <Link
          to="/content-bank"
          target="_blank"
          rel="noreferrer"
          className="text-xs text-tertiary-foreground hover:text-primary-foreground"
        >
          Open the Content Bank
        </Link>
      </div>
    </SettingsCard>
  );
}
