import { memo, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'
import { Link } from '@tanstack/react-router'
import type { SortingState } from '@tanstack/react-table'
import { TrashIcon } from '@phosphor-icons/react'
import { DEFAULT_POSTS_SORT } from '@/hooks/usePostsTableSort'
import { VirtualTable } from '../VirtualTable'
import { TextCell } from '../TableCells'
import type { ColumnConfig, TableGroup } from '../types'
import type { Post } from '@/types/posts'
import { DELETABLE_STATUSES } from '@/types/posts'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { formatTitle } from '@/lib'
import { formatDate as formatLocaleDate } from '@/lib/intl'
import { postStatusLabel } from '@/lib/postStatusLabel'
import { contentFormat, contentFormatLabel } from '@/lib/contentFormats'
import { useFeatureFlag } from '@/config/featureFlags'
import { SeriesMark } from '@/components/series/SeriesMark'
import { PostWarningsMark } from '@/components/campaigns/postsList/PostWarningsMark'
import { usePostWarnings } from '@/hooks/usePostWarnings'
import { counted } from '@/lib/intl'
import { POST_STATUSES, type PostGrouping } from '@/lib/postFilter'

type PostRow = Post & Record<string, unknown>

type PostsTableProps = {
  posts: Post[]
  /**
   * The campaign the rows belong to, or `null` on the workspace's list, where
   * they come from every campaign. That null adds a Campaign column and makes
   * each row answer to its own campaign — the link to the post, and what it is
   * checked against for being outside its campaign's platforms.
   */
  campaignId: string | null
  onDelete: (id: string) => void
  /**
   * A row's warning mark was pressed: open the drawer listing that post's
   * warnings. `warningsOpenFor` is the post it is open for, so its mark reads
   * as pressed.
   */
  onShowWarnings: (postId: string) => void
  warningsOpenFor?: string | null
  emptyStateMessage?: string
  emptyStateActionLabel?: string
  onEmptyStateAction?: () => void
  loading?: boolean
  /** Ids currently ticked. Omitted entirely turns the select column off. */
  selectedIds?: Set<string>
  /**
   * The header box's name while it would tick: the match it ticks, counted
   * (CON-486). Defaults to plain "Select all posts".
   */
  selectAllLabel?: string
  onToggleRow?: (id: string) => void
  /** Ticks every row, or clears them all when none are missing. */
  onToggleAll?: () => void
  /**
   * The order to render in, and where a header click reports to. Supplied
   * together by a caller that persists the choice (`usePostsTableSort`);
   * omitted, the table keeps its own order starting from the schedule date.
   */
  sorting?: SortingState
  onSortingChange?: (next: SortingState) => void
  /**
   * Rows under a head per status, in the order a post moves through them, or
   * per campaign, by name. Omitted or `none`, one run of rows.
   */
  grouping?: PostGrouping
}

function formatDate(
  dateStr: string | null,
  t: TFunction,
  locale: string,
): string {
  return (
    formatLocaleDate(
      dateStr,
      { year: 'numeric', month: 'short', day: 'numeric' },
      locale,
    ) ?? t('postsTable.notSet')
  )
}

/**
 * The same date as the column beside it, in the terms a person would use out
 * loud. Whole days apart, not hours: "Tomorrow" has to mean the next calendar
 * day whether the post goes out at 00:30 or 23:30.
 */
function formatRelativeDate(dateStr: string | null, t: TFunction): string {
  if (!dateStr) return t('postsTable.notSet')
  const now = new Date()
  const date = new Date(dateStr)
  const startOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  )
  const startOfTarget = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
  )
  const diffDays = Math.round(
    (startOfTarget.getTime() - startOfToday.getTime()) / (1000 * 60 * 60 * 24),
  )

  if (diffDays === 0) return t('postsTable.today')
  if (diffDays === 1) return t('postsTable.tomorrow')
  if (diffDays === -1) return t('postsTable.yesterday')
  if (diffDays > 1) return t('postsTable.inDays', { count: diffDays })
  return t('postsTable.daysAgo', { count: Math.abs(diffDays) })
}

/**
 * A row's group head: its status, in the order a post moves through them, or
 * its campaign, by name.
 */
function groupOfFor(
  grouping: PostGrouping,
  t: TFunction,
): ((row: PostRow) => TableGroup) | undefined {
  if (grouping === 'status')
    return (row) => ({
      key: row.status,
      label: postStatusLabel(t, row.status),
      rank: POST_STATUSES.indexOf(row.status),
    })
  if (grouping === 'campaign')
    return (row) => ({
      key: row.campaign_id,
      label: row.campaign?.name ?? '',
      rank: 0,
    })
  return undefined
}

function PostsTableComponent({
  posts,
  campaignId,
  onDelete,
  onShowWarnings,
  warningsOpenFor = null,
  emptyStateMessage,
  emptyStateActionLabel,
  onEmptyStateAction,
  loading = false,
  selectedIds,
  selectAllLabel,
  onToggleRow,
  onToggleAll,
  sorting,
  onSortingChange,
  grouping = 'none',
}: PostsTableProps) {
  const data = posts as PostRow[]
  const { t, i18n } = useTranslation()
  const locale = i18n.language
  const formats = useFeatureFlag('content-formats')
  const warningsOf = usePostWarnings(campaignId)

  const selectable = !!selectedIds && !!onToggleRow && !!onToggleAll
  // Against the rows on screen, not against the whole selection: the header
  // answers "is everything here ticked?", and a stale id from a deleted post
  // must not make it claim otherwise.
  const visibleSelected = useMemo(
    () => (selectedIds ? posts.filter((p) => selectedIds.has(p.id)).length : 0),
    [posts, selectedIds],
  )

  const columnConfigs = useMemo<ColumnConfig<PostRow>[]>(
    () => [
      ...(selectable
        ? [
            {
              id: 'select',
              header: () => (
                <div className="flex h-full items-center justify-center">
                  <Checkbox
                    checked={
                      visibleSelected === 0
                        ? false
                        : visibleSelected === posts.length
                          ? true
                          : 'indeterminate'
                    }
                    onCheckedChange={onToggleAll}
                    aria-label={
                      visibleSelected === posts.length
                        ? t('postsTable.clearSelection')
                        : (selectAllLabel ?? t('postsTable.selectAll'))
                    }
                  />
                </div>
              ),
              size: 44,
              minSize: 44,
              sortable: false,
              isControl: true,
              cell: (_value: unknown, row: PostRow) => (
                <div className="h-[34px] border-b-2 border-background px-3 flex items-center justify-center">
                  <Checkbox
                    checked={selectedIds!.has(row.id)}
                    onCheckedChange={() => onToggleRow!(row.id)}
                    aria-label={t('postsTable.selectPost', {
                      title: formatTitle(row.title),
                    })}
                  />
                </div>
              ),
            } satisfies ColumnConfig<PostRow>,
          ]
        : []),
      {
        id: 'title',
        accessorKey: 'title',
        header: t('postsTable.columnTitle'),
        isAutoSize: true,
        // What it keeps when the page is too narrow for every column — the
        // warnings drawer open, say — and the table scrolls sideways instead:
        // without it the title falls to the 50px default and reads as nothing.
        minSize: 240,
        cell: (_value, row) => {
          const displayTitle = formatTitle(row.title)
          return (
            <Link
              to="/campaigns/$campaignId/posts/$postId"
              params={{ campaignId: row.campaign_id, postId: row.id }}
              className="block h-[34px] border-b-2 border-background px-3 leading-8 hover:underline"
            >
              <TextCell value={displayTitle} />
            </Link>
          )
        },
      },
      {
        // Only on the workspace's list (see `activeColumns`). The name leads to
        // that campaign's own list: the same posts with the filter applied.
        id: 'campaign',
        accessorFn: (row) => row.campaign?.name ?? '',
        header: t('postsTable.columnCampaign'),
        size: 200,
        minSize: 140,
        cell: (_value, row) => (
          <Link
            to="/campaigns/$campaignId/list"
            params={{ campaignId: row.campaign_id }}
            className="block h-[34px] border-b-2 border-background px-3 leading-8 hover:underline"
          >
            <TextCell value={row.campaign?.name ?? ''} />
          </Link>
        ),
      },
      {
        id: 'status',
        accessorKey: 'status',
        header: t('postsTable.columnStatus'),
        size: 170,
        minSize: 130,
        cell: (_value, row) => (
          <div className="h-[34px] border-b-2 border-background px-3 leading-8">
            <TextCell value={postStatusLabel(t, row.status)} />
          </div>
        ),
      },
      {
        // The mark alone (`PostWarningsMark`): what is wrong is said in the
        // drawer it opens, so the row stays one line however much is wrong.
        // Read off the list payload only — see `lib/postWarnings`.
        id: 'warnings',
        accessorFn: (row) => warningsOf(row).length,
        header: t('postsTable.columnWarnings'),
        size: 110,
        minSize: 90,
        sortable: false,
        cell: (_value, row) => {
          const warnings = warningsOf(row)
          return (
            <div className="flex h-[34px] items-center border-b-2 border-background px-3">
              <PostWarningsMark
                warnings={warnings}
                pressed={warningsOpenFor === row.id}
                label={t('postsTable.warnings.open', {
                  ...counted(warnings.length, locale),
                  title: formatTitle(row.title),
                })}
                onPress={() => onShowWarnings(row.id)}
              />
            </div>
          )
        },
      },
      {
        id: 'platform',
        accessorFn: (row) => row.platform?.name ?? t('posts.noPlatform'),
        header: t('postsTable.columnPlatform'),
        size: 150,
        minSize: 120,
        cell: (_value, row) =>
          row.platform ? (
            <div className="h-[34px] border-b-2 border-background px-3 leading-8">
              <TextCell value={row.platform.name} />
            </div>
          ) : (
            <div className="h-[34px] border-b-2 border-background px-3 leading-8">
              <span className="table-text text-tertiary-foreground">
                {t('posts.noPlatform')}
              </span>
            </div>
          ),
      },
      {
        id: 'format',
        // Unset sorts last in both directions, for the reason the date column
        // gives — "no format" is not the first format alphabetically.
        accessorFn: (row) =>
          contentFormat(row.content_format)
            ? contentFormatLabel(t, row.content_format)
            : undefined,
        sortUndefined: 'last',
        header: t('postsTable.columnFormat'),
        size: 140,
        minSize: 110,
        cell: (_value, row) =>
          contentFormat(row.content_format) ? (
            <div className="h-[34px] border-b-2 border-background px-3 leading-8">
              <TextCell value={contentFormatLabel(t, row.content_format)} />
            </div>
          ) : (
            <div className="h-[34px] border-b-2 border-background px-3 leading-8">
              <span className="table-text text-tertiary-foreground">
                {t('formats.none')}
              </span>
            </div>
          ),
      },
      {
        id: 'series',
        // By id, which keeps a series' posts together; none sorts last.
        accessorFn: (row) => row.series_id ?? undefined,
        sortUndefined: 'last',
        header: t('postsTable.columnSeries'),
        size: 160,
        minSize: 110,
        cell: (_value, row) => (
          <div className="flex h-[34px] items-center border-b-2 border-background px-3 text-sm text-secondary-foreground">
            <SeriesMark seriesId={row.series_id} />
          </div>
        ),
      },
      {
        id: 'scheduled_at',
        // `null` becomes `undefined` so `sortUndefined` can take it: an
        // unscheduled post belongs at the bottom in both directions, not at
        // the top of an ascending sort as the epoch-adjacent value it would
        // otherwise compare as.
        accessorFn: (row) => row.scheduled_at ?? undefined,
        sortUndefined: 'last',
        header: t('postsTable.columnPublishDate'),
        size: 160,
        minSize: 130,
        cell: (_value, row) => (
          <div className="h-[34px] border-b-2 border-background px-3 leading-8">
            <TextCell value={formatDate(row.scheduled_at, t, locale)} />
          </div>
        ),
      },
      {
        id: 'relative_time',
        accessorFn: (row) => row.scheduled_at ?? undefined,
        sortUndefined: 'last',
        header: t('postsTable.columnWhen'),
        size: 140,
        minSize: 110,
        cell: (_value, row) => (
          <div className="h-[34px] border-b-2 border-background px-3 leading-8">
            <TextCell value={formatRelativeDate(row.scheduled_at, t)} />
          </div>
        ),
      },
      {
        id: 'actions',
        header: '',
        size: 60,
        minSize: 60,
        sortable: false,
        isControl: true,
        cell: (_value, row) => {
          const canDelete = DELETABLE_STATUSES.includes(row.status)
          if (!canDelete)
            return <div className="h-[34px] border-b-2 border-background" />
          return (
            <div className="h-[34px] border-b-2 border-background px-3 flex items-center justify-center">
              <Button
                variant="ghost"
                size="xsIcon"
                onClick={(e) => {
                  e.stopPropagation()
                  onDelete(row.id)
                }}
              >
                <TrashIcon className="size-4 text-tertiary-foreground hover:text-destructive" />
              </Button>
            </div>
          )
        },
      },
    ],
    [
      onDelete,
      onShowWarnings,
      warningsOpenFor,
      warningsOf,
      selectable,
      selectedIds,
      selectAllLabel,
      onToggleRow,
      onToggleAll,
      posts,
      visibleSelected,
      locale,
      t,
    ],
  )

  const groupOf = useMemo(() => groupOfFor(grouping, t), [grouping, t])

  const seriesOn = useFeatureFlag('series')
  const withSeries = seriesOn && data.some((post) => post.series_id)

  const activeColumns = useMemo(
    () => [
      ...(selectable ? ['select'] : []),
      'title',
      ...(campaignId ? [] : ['campaign']),
      'status',
      'warnings',
      'platform',
      ...(formats ? ['format'] : []),
      // Only where some post was made for a series (CON-496): a column empty
      // on every row is noise on a campaign that runs none.
      ...(withSeries ? ['series'] : []),
      'scheduled_at',
      'relative_time',
      'actions',
    ],
    [selectable, formats, campaignId, withSeries],
  )

  return (
    <VirtualTable
      data={data}
      columnConfigs={columnConfigs}
      activeColumns={activeColumns}
      initialSorting={DEFAULT_POSTS_SORT}
      sorting={sorting}
      onSortingChange={onSortingChange}
      estimatedRowHeight={34}
      overscan={5}
      showFooter={false}
      fillHeight={false}
      emptyStateMessage={emptyStateMessage ?? t('postsTable.noPosts')}
      emptyStateActionLabel={emptyStateActionLabel}
      onEmptyStateAction={onEmptyStateAction}
      loading={loading}
      groupOf={groupOf}
    />
  )
}

export const PostsTable = memo(PostsTableComponent)
