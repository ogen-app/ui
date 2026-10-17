import type { ReactNode } from 'react'
import { SmartFilterBar } from '@/components/smartFilter/SmartFilterBar'
import { assetCountQuery } from '@/hooks/useContent'
import type { AssetFilter } from '@/lib/assetFilter'
import type { AssetQueryParams } from '@/types/assetList'
import { ASSET_MODEL } from './assetModel'
import type { FilterVocabulary } from './useFilterVocabulary'

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
