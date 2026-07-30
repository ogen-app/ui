import type { Asset } from "@/types/content";

/**
 * Filtering for the campaign asset pool — the browse-and-pick surface behind
 * the Assets page's Configure action.
 *
 * There is no category filter and no sort here. The table is the Content
 * Bank's, and it sorts its own columns; splitting text from files was a tab
 * bar, and tabs are deferred. What is left is what the Content Bank has no
 * answer for at all: finding a document among hundreds, and reviewing what you
 * already attached.
 */
export type AssetPoolFilters = {
  query: string;
  tagIds: string[];
  /** Narrows the list to what's already attached — the review view. */
  selectedOnly: boolean;
};

export const EMPTY_FILTERS: AssetPoolFilters = {
  query: "",
  tagIds: [],
  selectedOnly: false,
};

/** Whether anything is narrowing the list, for the "select all matching" copy. */
export function isFiltered(filters: AssetPoolFilters): boolean {
  return (
    filters.query.trim() !== "" ||
    filters.tagIds.length > 0 ||
    filters.selectedOnly
  );
}

/**
 * Client-side filter over the whole bank.
 *
 * This is the stopgap shape: today `GET /api/content-bank/assets` returns every
 * asset in one unpaginated response (with its full extracted text), so the
 * front end has no choice but to filter locally. Once the list endpoint takes
 * `?q=&tags=` this collapses into query params — the filter type is already the
 * right wire shape for that.
 */
export function filterAssetPool(
  assets: Asset[],
  filters: AssetPoolFilters,
  selectedIds: string[],
): Asset[] {
  const query = filters.query.trim().toLowerCase();
  const tags = new Set(filters.tagIds);
  const selected = new Set(selectedIds);

  return assets.filter((asset) => {
    if (filters.selectedOnly && !selected.has(asset.id)) return false;
    // Any of the chosen tags, not all of them: the tag filter exists to gather
    // a pool ("everything about pricing or onboarding") and hand it to "select
    // all matching". Requiring all tags at once would only ever shrink it.
    if (tags.size > 0 && !asset.tag_ids.some((id) => tags.has(id))) return false;
    if (query !== "" && !asset.title.toLowerCase().includes(query)) return false;
    return true;
  });
}
