import {
  CaretDownIcon,
  MagnifyingGlassIcon,
  XIcon,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { AssetPoolFilters } from "@/lib/assetPool";
import type { Tag } from "@/types/content";

type Props = {
  filters: AssetPoolFilters;
  onChange: (filters: AssetPoolFilters) => void;
  tags: Tag[];
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
 * Search and tag filters over the bank, plus the review toggle.
 *
 * Sorting isn't here: the table sorts its own columns, same as the Content
 * Bank's. Ranking the bank by relevance to the campaign brief is the thing
 * that would make hundreds of assets tractable, and it needs a backend that can
 * embed the brief — CON-151, rather than faked here.
 */
export function AssetPoolToolbar({
  filters,
  onChange,
  tags,
  bankSize,
  selectable = true,
  disabled = false,
}: Props) {
  const set = (patch: Partial<AssetPoolFilters>) =>
    onChange({ ...filters, ...patch });

  const toggleTag = (id: string) =>
    set({
      tagIds: filters.tagIds.includes(id)
        ? filters.tagIds.filter((t) => t !== id)
        : [...filters.tagIds, id],
    });

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex min-w-0 flex-1 items-center gap-2">
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

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" disabled={disabled || tags.length === 0}>
              <span>
                {filters.tagIds.length === 0
                  ? "TAGS"
                  : `TAGS · ${filters.tagIds.length}`}
              </span>
              <CaretDownIcon />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="start"
            className="max-h-80 overflow-y-auto"
          >
            {tags.map((tag) => (
              <DropdownMenuCheckboxItem
                key={tag.id}
                checked={filters.tagIds.includes(tag.id)}
                onCheckedChange={() => toggleTag(tag.id)}
                onSelect={(e) => e.preventDefault()}
              >
                {tag.name}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {selectable && (
        <Button
          variant="default"
          active={filters.selectedOnly}
          disabled={disabled}
          onClick={() => set({ selectedOnly: !filters.selectedOnly })}
        >
          ASSIGNED ONLY
        </Button>
      )}
    </div>
  );
}
