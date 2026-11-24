import { useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { CaretDownIcon } from '@phosphor-icons/react'
import { FilterPills } from '@/components/smartFilter/FilterPills'
import { FilterButton, LINE_CONTROL } from '@/components/smartFilter/ListStrip'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { NoMatches } from '@/components/smartFilter/NoMatches'
import { viewerTimeZone } from '@/lib/assetFilter'
import { formatNumber } from '@/lib/intl'
import {
  filteredCampaignPostsKey,
  filteredWorkspacePostsKey,
} from '@/lib/queryKeys'
import {
  POST_FILTER_MODEL,
  POST_GROUPS,
  postRequestParams,
  type PostFilter,
  type PostGrouping,
} from '@/lib/postFilter'
import type { CountQuery } from '@/lib/smartFilter'
import { listCampaignPosts, listPosts } from '@/services/api/posts'
import { usePostVocabulary } from './usePostVocabulary'

/**
 * How many posts a filter would leave: the length of the server's answer to
 * it, read under the filtered key so the list showing that filter shares it —
 * a campaign's, or the workspace's (`campaignId` null).
 */
function countQueryFor(campaignId: string | null): CountQuery<PostFilter> {
  return (filter) => {
    const params = postRequestParams(filter, viewerTimeZone())
    if (campaignId === null)
      return {
        queryKey: [...filteredWorkspacePostsKey(params), 'count'],
        // The workspace's pages leave archived campaigns out
        // (`useWorkspacePosts`), so the count does too.
        queryFn: () =>
          listPosts(params).then(
            (rows) => rows.filter((p) => !p.campaign?.archived_at).length,
          ),
      }
    return {
      queryKey: [...filteredCampaignPostsKey(campaignId, params), 'count'],
      queryFn: () =>
        listCampaignPosts(campaignId, params).then((rows) => rows.length),
    }
  }
}

/**
 * The posts filter (CON-472) over a posts list and a calendar — a
 * campaign's, or the workspace's (`campaignId` null) — on the Assets list's
 * head line: `Filter`, then the filter as pills, which show only while
 * something narrows the list, and the list's own controls at the end. With
 * nothing chosen the line is the button alone: an unfiltered list says
 * nothing about itself.
 */
export function PostsFilterBar({
  campaignId,
  filter,
  onChange,
  total,
  totalUnfiltered,
  setByAssistant = false,
  showCount = true,
  end,
}: {
  campaignId: string | null
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
  /** At the line's end: the list's Group by. */
  end?: ReactNode
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
      {end && <div className="ml-auto flex shrink-0 items-center">{end}</div>}
    </div>
  )
}

/**
 * Group by, at the end of the posts list's filter line, in the line's voice
 * (`LINE_CONTROL`) — the Assets list's control, for posts: by status, and by
 * campaign where the rows come from more than one.
 */
export function PostsGroupMenu({
  grouping,
  onChange,
  scoped,
}: {
  grouping: PostGrouping
  onChange: (next: PostGrouping) => void
  /** A campaign's own list: no Campaign grouping, every row is in it. */
  scoped: boolean
}) {
  const { t } = useTranslation()
  const groupings = POST_GROUPS.filter((g) => !(scoped && g === 'campaign'))
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className={LINE_CONTROL}>
        {t('postsTable.view.groupBy')}
        <span className="font-medium text-foreground">
          {t(`postsTable.view.group.${grouping}`)}
        </span>
        <CaretDownIcon className="size-3" aria-hidden />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={6} className="w-56">
        <DropdownMenuLabel className="text-xs tracking-wide text-secondary-foreground">
          {t('postsTable.view.groupByHeading')}
        </DropdownMenuLabel>
        <DropdownMenuRadioGroup
          value={grouping}
          onValueChange={(v) => onChange(v as PostGrouping)}
        >
          {groupings.map((g) => (
            <DropdownMenuRadioItem key={g} value={g}>
              {t(`postsTable.view.group.${g}`)}
            </DropdownMenuRadioItem>
          ))}
          <DropdownMenuSeparator className="mx-2" />
          <DropdownMenuRadioItem value="none">
            {t('postsTable.view.group.none')}
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

/** A filter nothing matches: what each clause was holding back, one at a time. */
export function PostsNoMatches({
  campaignId,
  filter,
  onChange,
}: {
  campaignId: string | null
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
        ...(campaignId === null ? [t('postsTable.columnCampaign')] : []),
        t('postsTable.columnStatus'),
        t('postsTable.columnWarnings'),
        t('postsTable.columnPlatform'),
        t('postsTable.columnPublishDate'),
      ]}
    />
  )
}
