import { useMemo, useState } from "react";
import { EMPTY_FILTERS, type AssetPoolFilters } from "@/lib/assetPool";
import {
  poolStats,
  selectionStats,
  type SourceMode,
} from "@/lib/campaignSources";
import type { Asset } from "@/types/content";
import { AssetPoolSection } from "./AssetPoolSection";
import { ContentSourcesCard } from "./ContentSourcesCard";

type Props = {
  mode: SourceMode;
  onModeChange: (mode: SourceMode) => void;
  /** The whole Content Bank. */
  assets: Asset[];
  /** The campaign's assigned set. */
  selectedIds: string[];
  onSelectedIdsChange: (ids: string[]) => void;
};

/**
 * The campaign Assets page: the mode tiles, and the Content Bank list
 * underneath them unless the campaign is on its own.
 *
 * Campaign only has no list because there is nothing to show: no asset can
 * reach a post, so a table of them would be decoration. The other two modes
 * both show it, which is what makes them comparable. One comes frozen with
 * everything ticked, one you tick yourself.
 *
 * Expects the campaign layout's non-scrolling shell (`grid overflow-hidden
 * h-full`): the table scrolls, the page doesn't.
 */
export function CampaignAssetsView({
  mode,
  onModeChange,
  assets,
  selectedIds,
  onSelectedIdsChange,
}: Props) {
  const [filters, setFilters] = useState<AssetPoolFilters>(EMPTY_FILTERS);

  const bank = useMemo(() => poolStats(assets), [assets]);
  const selection = useMemo(
    () => selectionStats(assets, selectedIds),
    [assets, selectedIds],
  );

  return (
    // The fade is this view's own arrival, not the section's: the assets are a
    // real fetch, so the panel above it shows a loader first and the section's
    // fade is long finished by the time the table lands.
    //
    // `overflow-y-auto` only ever fires when the list is empty and its floor
    // out-grows a short window. With rows the table shrinks to fit and
    // scrolls itself, so the page scrollbar never appears and the two never
    // compete for a wheel gesture.
    <div className="page-content-motion flex min-h-0 flex-col gap-4 overflow-y-auto py-4">
      <div className="shrink-0">
        <ContentSourcesCard
          mode={mode}
          onModeChange={onModeChange}
          bank={bank}
          selection={selection}
        />
      </div>

      {mode !== "campaign" && (
        <AssetPoolSection
          assets={assets}
          mode={mode}
          selectedIds={selectedIds}
          onSelectedIdsChange={onSelectedIdsChange}
          filters={filters}
          onFiltersChange={setFilters}
        />
      )}
    </div>
  );
}
