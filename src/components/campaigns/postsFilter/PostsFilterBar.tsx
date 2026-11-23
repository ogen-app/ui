import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { FilterPills } from '@/components/smartFilter/FilterPills'
import { FilterButton } from '@/components/smartFilter/ListStrip'
import { NoMatches } from '@/components/smartFilter/NoMatches'
import { viewerTimeZone } from '@/lib/assetFilter'
import { formatNumber } from '@/lib/intl'
import { filteredCampaignPostsKey } from '@/lib/queryKeys'
import {
  POST_FILTER_MODEL,
  postRequestParams,
  type PostFilter,
} from '@/lib/postFilter'
import type { CountQuery } from '@/lib/smartFilter'
import { listCampaignPosts } from '@/services/api/posts'
import { usePostVocabulary } from './usePostVocabulary'

/**
 * How many posts a filter would leave: the length of the server's answer to
 * it, read under the filtered key so the list showing that filter shares it.
 */
function countQueryFor(campaignId: string): CountQuery<PostFilter> {
  return (filter) => {
    const params = postRequestParams(filter, viewerTimeZone())
    return {
      queryKey: [...filteredCampaignPostsKey(campaignId, params), 'count'],
      queryFn: () =>
        listCampaignPosts(campaignId, params).then((rows) => rows.length),
    }
  }
}

/**
 * The posts filter (CON-472) over a campaign's posts list and its calendar,
 * on the Assets list's head line: `Filter`, then the filter as pills, which
 * show only while something narrows the list. With nothing chosen the line
 * is the button alone — an unfiltered list says nothing about itself.
 */
export function PostsFilterBar({
  campaignId,
  filter,
  onChange,
  total,
  totalUnfiltered,
  setByAssistant = false,
  showCount = true,
}: {
  campaignId: string
  filter: PostFilter
  onChange: (next: PostFilter) => void
  total: number
  totalUnfiltered: number
  /** The assistant put this filter here (CON-482), and it hasn't changed. */
  setByAssistant?: boolean
  /**
   * Whether the pills end on how many match ("3 of 21"): off while the list
   * is still answering, when the number would be the last filter's.
   */
  showCount?: boolean
}) {
  const { t, i18n } = useTranslation()
  const vocabulary = usePostVocabulary(campaignId)
  const countQuery = countQueryFor(campaignId)
  const [adding, setAdding] = useState(false)
  const locale = i18n.language
  return (
    <div className="flex min-w-0 items-start gap-x-4">
      <FilterButton
        count={POST_FILTER_MODEL.tokensOf(filter).length}
        onClick={() => setAdding(true)}
      />
      <FilterPills
        inline
        filter={filter}
        onChange={onChange}
        model={POST_FILTER_MODEL}
        vocabulary={vocabulary}
        countQuery={countQuery}
        adding={adding}
        onAddingChange={setAdding}
        clearable
        trailing={
          <>
            {showCount && (
              <span aria-live="polite" className="tabular-nums">
                {t('content.filter.count', {
                  count: total,
                  shown: formatNumber(total, {}, locale),
                  total: formatNumber(totalUnfiltered, {}, locale),
                })}
              </span>
            )}
            {setByAssistant && (
              <span className="rounded-sm bg-accent/10 px-1.5 py-0.5 text-xs/4 text-accent-ink">
                {t('postsFilter.setByAssistant')}
              </span>
            )}
          </>
        }
      />
    </div>
  )
}

/** A filter nothing matches: what each clause was holding back, one at a time. */
export function PostsNoMatches({
  campaignId,
  filter,
  onChange,
}: {
  campaignId: string
  filter: PostFilter
  onChange: (next: PostFilter) => void
}) {
  const { t } = useTranslation()
  const vocabulary = usePostVocabulary(campaignId)
  const countQuery = countQueryFor(campaignId)
  return (
    <NoMatches
      title={t('postsFilter.nothingMatches')}
      filter={filter}
      model={POST_FILTER_MODEL}
      vocabulary={vocabulary}
      countQuery={countQuery}
      onChange={onChange}
      columns={[
        t('postsTable.columnTitle'),
        t('postsTable.columnStatus'),
        t('postsTable.columnWarnings'),
        t('postsTable.columnPlatform'),
        t('postsTable.columnPublishDate'),
      ]}
    />
  )
}
