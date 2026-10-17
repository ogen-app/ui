import type { ReactNode } from 'react'
import { SmartFilterBar } from '@/components/smartFilter/SmartFilterBar'
import { assetCountQuery } from '@/hooks/useContent'
import {
  TEXT_MAX,
  TEXT_MIN,
  parseFieldPrefix,
  tokensOf,
  withToken,
  withoutToken,
  type AssetFilter,
  type FilterField,
} from '@/lib/assetFilter'
import type { FilterModel } from '@/lib/smartFilter'
import type { AssetQueryParams } from '@/types/assetList'
import type { FilterVocabulary } from './useFilterVocabulary'

/** The Assets filter as the smart filter reads it (`lib/smartFilter`). */
const ASSET_MODEL: FilterModel<AssetFilter, FilterField> = {
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
  parseFieldPrefix,
  // A title search, then a search inside the documents.
  freeText: ['title', 'text'],
  searchMin: TEXT_MIN,
  textMax: TEXT_MAX,
}

/**
 * The Assets list's smart filter (CON-371): `SmartFilterBar` over the Assets
 * filter, its vocabulary and its count.
 */
export function AssetFilterBar({
  filter,
  onChange,
  vocabulary,
  total,
  totalUnfiltered,
  paramsFor,
  leading,
}: {
  filter: AssetFilter
  onChange: (next: AssetFilter) => void
  vocabulary: FilterVocabulary
  /** Assets matching every filter, and every asset in scope: "24 of 41". */
  total: number
  totalUnfiltered: number
  /** The request a filter would make — for the counts beside free text. */
  paramsFor: (filter: AssetFilter) => AssetQueryParams
  /** The list's select-all, at the bar's left end. */
  leading?: ReactNode
}) {
  return (
    <SmartFilterBar
      filter={filter}
      onChange={onChange}
      model={ASSET_MODEL}
      vocabulary={vocabulary}
      total={total}
      totalUnfiltered={totalUnfiltered}
      countQuery={(f) => assetCountQuery(paramsFor(f))}
      leading={leading}
    />
  )
}
