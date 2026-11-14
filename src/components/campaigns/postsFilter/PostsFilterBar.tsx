import { useTranslation } from 'react-i18next'
import { FilterSentence } from '@/components/smartFilter/FilterSentence'
import { NoMatches } from '@/components/smartFilter/NoMatches'
import { viewerTimeZone } from '@/lib/assetFilter'
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
 * The posts filter as a sentence (CON-472), over a campaign's posts list and
 * its calendar: the Ideas list's `FilterSentence` on the posts model.
 */
export function PostsFilterBar({
  campaignId,
  filter,
  onChange,
  total,
  totalUnfiltered,
  setByAssistant = false,
}: {
  campaignId: string
  filter: PostFilter
  onChange: (next: PostFilter) => void
  total: number
  totalUnfiltered: number
  /** The assistant put this filter here (CON-482), and it hasn't changed. */
  setByAssistant?: boolean
}) {
  const { t } = useTranslation()
  const vocabulary = usePostVocabulary(campaignId)
  const countQuery = countQueryFor(campaignId)
  return (
    <FilterSentence
      trailing={
        setByAssistant ? (
          <span className="rounded-sm bg-accent/10 px-1.5 py-0.5 text-[12px] text-accent-ink">
            {t('postsFilter.setByAssistant')}
          </span>
        ) : undefined
      }
      filter={filter}
      model={POST_FILTER_MODEL}
      onChange={onChange}
      vocabulary={vocabulary}
      total={total}
      totalUnfiltered={totalUnfiltered}
      countQuery={countQuery}
      clearable
    />
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
    />
  )
}
