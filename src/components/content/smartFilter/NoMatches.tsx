import { useTranslation } from 'react-i18next'
import { NoMatches as SmartNoMatches } from '@/components/smartFilter/NoMatches'
import { assetCountQuery } from '@/hooks/useContent'
import type { AssetFilter } from '@/lib/assetFilter'
import type { AssetQueryParams } from '@/types/assetList'
import { ASSET_MODEL } from './assetModel'
import type { FilterVocabulary } from './useFilterVocabulary'

/** The Assets list's empty answer to a filter (CON-371) — the shared one, for assets. */
export function NoMatches({
  filter,
  vocabulary,
  paramsFor,
  onChange,
}: {
  filter: AssetFilter
  vocabulary: FilterVocabulary
  paramsFor: (filter: AssetFilter) => AssetQueryParams
  onChange: (next: AssetFilter) => void
}) {
  const { t } = useTranslation()
  return (
    <SmartNoMatches
      title={t('content.filter.empty.title')}
      filter={filter}
      model={ASSET_MODEL}
      vocabulary={vocabulary}
      countQuery={(f) => assetCountQuery(paramsFor(f))}
      onChange={onChange}
    />
  )
}
