import {
  TEXT_MAX,
  TEXT_MIN,
  tokensOf,
  withToken,
  withoutToken,
  type AssetFilter,
  type FilterField,
} from '@/lib/assetFilter'
import type { FilterModel } from '@/lib/smartFilter'

/** The Assets filter as the smart filter reads it (`lib/smartFilter`). */
export const ASSET_MODEL: FilterModel<AssetFilter, FilterField> = {
  kindOf: (field) =>
    field === 'title'
      ? 'substrings'
      : field === 'text'
        ? 'search'
        : field === 'updated'
          ? 'date'
          : 'choice',
  tokensOf,
  withToken,
  withoutToken,
  // A title search, then a search inside the documents.
  freeText: ['title', 'text'],
  searchMin: TEXT_MIN,
  textMax: TEXT_MAX,
}
