import { MagnifyingGlassIcon, XIcon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import type { AssetPoolFilters } from "@/lib/assetPool";

type Props = {
  filters: AssetPoolFilters;
  onChange: (filters: AssetPoolFilters) => void;
  /** Total assets in the bank — the search field says what it searches. */
  bankSize: number;
  /**
   * False in whole-bank mode, where every asset is assigned and there is
   * nothing for the review toggle to narrow to.
   */
  selectable?: boolean;
  disabled?: boolean;
};

/**
 * Title search over the bank, plus the "assigned only" toggle.
 *
 * Nothing else: no tag filter, no category filter, no sort. The table sorts
 * its own columns, same as the Content Bank's. Ranking the bank by relevance
 * to the campaign brief is the thing that would make hundreds of assets
 * tractable, and it needs a backend that can embed the brief (CON-151), rather
 * than being faked here.
 */
export function AssetPoolToolbar({
  filters,
  onChange,
  bankSize,
  selectable = true,
  disabled = false,
}: Props) {
  const set = (patch: Partial<AssetPoolFilters>) =>
    onChange({ ...filters, ...patch });

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex h-10 min-w-0 flex-1 items-center gap-2 border-b-2 border-quaternary bg-input-secondary px-3 sm:max-w-80">
        <MagnifyingGlassIcon className="size-4 shrink-0 text-secondary-foreground" />
        <Input
          variant="search"
          inputSize="default"
          value={filters.query}
          disabled={disabled}
          onChange={(e) => set({ query: e.target.value })}
          placeholder={`Search ${bankSize} assets`}
          aria-label="Search assets"
          className="px-0"
        />
        {filters.query !== "" && (
          <Button
            variant="ghost"
            size="xsIcon"
            aria-label="Clear search"
            onClick={() => set({ query: "" })}
          >
            <XIcon />
          </Button>
        )}
      </div>

      {selectable && (
        <div className="flex items-center gap-2">
          <Switch
            checked={filters.selectedOnly}
            onCheckedChange={(checked) => set({ selectedOnly: checked })}
            disabled={disabled}
            aria-label="Show assigned assets only"
          />
          <span className="text-sm text-primary-foreground">Assigned only</span>
        </div>
      )}
    </div>
  );
}
