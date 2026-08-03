import type { Asset } from "@/types/content";

/**
 * Filtering for the campaign asset pool — the list on the lower half of the
 * Assets page.
 *
 * There is no category filter, no tag filter and no sort here. The table is
 * the Content Bank's, and it sorts its own columns. What is left is what the
 * Content Bank has no answer for at all: finding a document among hundreds,
 * and reviewing what you already assigned.
 */
export type AssetPoolFilters = {
  query: string;
  /** Narrows the list to what's already assigned — the review view. */
  selectedOnly: boolean;
};

export const EMPTY_FILTERS: AssetPoolFilters = {
  query: "",
  selectedOnly: false,
};

/** Whether anything is narrowing the list, so the empty state can say which. */
export function isFiltered(filters: AssetPoolFilters): boolean {
  return filters.query.trim() !== "" || filters.selectedOnly;
}

/**
 * Client-side filter over the whole bank.
 *
 * This is the stopgap shape: today `GET /api/content-bank/assets` returns every
 * asset in one unpaginated response (with its full extracted text), so the
 * front end has no choice but to filter locally. Once the list endpoint takes
 * `?q=` this collapses into query params — the filter type is already the
 * right wire shape for that.
 */
export function filterAssetPool(
  assets: Asset[],
  filters: AssetPoolFilters,
  selectedIds: string[],
): Asset[] {
  const query = filters.query.trim().toLowerCase();
  const selected = new Set(selectedIds);

  return assets.filter((asset) => {
    if (filters.selectedOnly && !selected.has(asset.id)) return false;
    if (query !== "" && !asset.title.toLowerCase().includes(query)) return false;
    return true;
  });
}
