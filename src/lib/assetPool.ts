import type { Asset } from "@/types/content";
import { assetCategory } from "@/lib/assetCategory";

/**
 * Filtering for the campaign asset pool — the browse-and-pick surface on
 * `/campaigns/:id/assets`.
 *
 * Deliberately narrower than the Content Bank's own tabs: there is no
 * `imagery` category here. Retrieval works over text chunks, so an image
 * couldn't inform a caption even if it were selectable (deferred with the rest
 * of the imagery work, CON-16/88).
 */
export type AssetPoolCategory = "all" | "text" | "files";

export type AssetPoolSort = "recent" | "title";

export type AssetPoolFilters = {
  query: string;
  tagIds: string[];
  category: AssetPoolCategory;
  sort: AssetPoolSort;
  /** Narrows the list to what's already attached — the review view. */
  selectedOnly: boolean;
};

export const EMPTY_FILTERS: AssetPoolFilters = {
  query: "",
  tagIds: [],
  category: "all",
  sort: "recent",
  selectedOnly: false,
};

/** Whether anything is narrowing the list, for the "select all matching" copy. */
export function isFiltered(filters: AssetPoolFilters): boolean {
  return (
    filters.query.trim() !== "" ||
    filters.tagIds.length > 0 ||
    filters.category !== "all" ||
    filters.selectedOnly
  );
}

/**
 * Client-side filter + sort over the whole bank.
 *
 * This is the stopgap shape: today `GET /api/content-bank/assets` returns every
 * asset in one unpaginated response (with its full extracted text), so the
 * front end has no choice but to filter locally. Once the list endpoint takes
 * `?q=&tags=&type=&sort=` this collapses into query params and the sort moves
 * server-side — the filter type is already the right wire shape for that.
 */
export function filterAssetPool(
  assets: Asset[],
  filters: AssetPoolFilters,
  selectedIds: string[],
): Asset[] {
  const query = filters.query.trim().toLowerCase();
  const tags = new Set(filters.tagIds);
  const selected = new Set(selectedIds);

  const matched = assets.filter((asset) => {
    if (filters.selectedOnly && !selected.has(asset.id)) return false;
    if (filters.category !== "all" && assetCategory(asset) !== filters.category)
      return false;
    // Any of the chosen tags, not all of them: the tag filter exists to gather
    // a pool ("everything about pricing or onboarding") and hand it to "select
    // all matching". Requiring all tags at once would only ever shrink it.
    if (tags.size > 0 && !asset.tag_ids.some((id) => tags.has(id))) return false;
    if (query !== "" && !asset.title.toLowerCase().includes(query)) return false;
    return true;
  });

  return sortAssetPool(matched, filters.sort);
}

function sortAssetPool(assets: Asset[], sort: AssetPoolSort): Asset[] {
  const sorted = [...assets];
  if (sort === "title") {
    sorted.sort((a, b) =>
      a.title.trim().localeCompare(b.title.trim(), undefined, {
        sensitivity: "base",
      }),
    );
    return sorted;
  }
  sorted.sort((a, b) => b.updated_at.localeCompare(a.updated_at));
  return sorted;
}
