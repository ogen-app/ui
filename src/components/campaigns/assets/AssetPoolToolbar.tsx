import { CaretDownIcon, MagnifyingGlassIcon, XIcon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type {
  AssetPoolCategory,
  AssetPoolFilters,
  AssetPoolSort,
} from "@/lib/assetPool";
import type { Tag } from "@/types/content";

const CATEGORIES: { id: AssetPoolCategory; label: string }[] = [
  { id: "all", label: "ALL" },
  { id: "text", label: "TEXT" },
  { id: "files", label: "FILES" },
];

const SORTS: { id: AssetPoolSort; label: string }[] = [
  { id: "recent", label: "Recently updated" },
  { id: "title", label: "Title" },
];

type Props = {
  filters: AssetPoolFilters;
  onChange: (filters: AssetPoolFilters) => void;
  tags: Tag[];
  /** Total assets in the bank — the search field says what it searches. */
  bankSize: number;
  /** Attached count, for the review toggle. */
  selectedCount: number;
  /** False when the pool is read-only context — no shortlist to review. */
  selectable?: boolean;
  disabled?: boolean;
};

/**
 * Search, tag, and type filters over the bank, plus the review toggle.
 *
 * Sorting is deliberately thin — recency and title only. Ranking the bank by
 * relevance to the campaign brief is the thing that would make hundreds of
 * assets tractable, and it needs a backend that can embed the brief; it's
 * tracked separately rather than faked here.
 */
export function AssetPoolToolbar({
  filters,
  onChange,
  tags,
  bankSize,
  selectedCount,
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

  const activeSort = SORTS.find((s) => s.id === filters.sort) ?? SORTS[0];

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <div className="flex h-10 min-w-0 flex-1 items-center gap-2 border-b-2 border-quaternary bg-input-secondary px-3 sm:max-w-80">
          <MagnifyingGlassIcon className="size-4 shrink-0 text-tertiary-foreground" />
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
          <DropdownMenuContent align="start" className="max-h-80 overflow-y-auto">
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

      <div className="flex items-center gap-2">
        <Tabs value={filters.category}>
          <TabsList variant="segmented" size="excluded">
            {CATEGORIES.map((category) => (
              <TabsTrigger
                key={category.id}
                variant="segmented"
                value={category.id}
                disabled={disabled}
                onClick={() => set({ category: category.id })}
              >
                {category.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" disabled={disabled}>
              <span>{activeSort.label}</span>
              <CaretDownIcon />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {SORTS.map((sort) => (
              <DropdownMenuCheckboxItem
                key={sort.id}
                checked={filters.sort === sort.id}
                onCheckedChange={() => set({ sort: sort.id })}
              >
                {sort.label}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {selectable && (
          <Button
            variant="default"
            active={filters.selectedOnly}
            disabled={disabled}
            onClick={() => set({ selectedOnly: !filters.selectedOnly })}
          >
            ATTACHED · {selectedCount}
          </Button>
        )}
      </div>
    </div>
  );
}
