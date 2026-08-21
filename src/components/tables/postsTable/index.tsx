import { memo, useMemo } from 'react'
import { Link } from '@tanstack/react-router'
import type { SortingState } from '@tanstack/react-table'
import { TrashIcon } from '@phosphor-icons/react'
import { DEFAULT_POSTS_SORT } from '@/hooks/usePostsTableSort'
import { VirtualTable } from '../VirtualTable'
import { TextCell } from '../TableCells'
import type { ColumnConfig } from '../types'
import type { Post } from '@/types/posts'
import { POST_STATUS_LABELS, DELETABLE_STATUSES } from '@/types/posts'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { formatTitle } from '@/lib'
import { formatDate as formatLocaleDate } from '@/lib/intl'
import { useLocale } from '@/hooks/useLocale'

type PostRow = Post & Record<string, unknown>

type PostsTableProps = {
  posts: Post[]
  campaignId: string
  onDelete: (id: string) => void
  emptyStateMessage?: string
  emptyStateActionLabel?: string
  onEmptyStateAction?: () => void
  loading?: boolean
  /** Ids currently ticked. Omitted entirely turns the select column off. */
  selectedIds?: Set<string>
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
}

function formatDate(dateStr: string | null, locale: string): string {
  return (
    formatLocaleDate(dateStr, { year: 'numeric', month: 'short', day: 'numeric' }, locale) ??
    'Not set'
  )
}

function formatRelativeDate(dateStr: string | null): string {
  if (!dateStr) return 'Not set'
  const now = new Date()
  const date = new Date(dateStr)
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const startOfTarget = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const diffDays = Math.round((startOfTarget.getTime() - startOfToday.getTime()) / (1000 * 60 * 60 * 24))

  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Tomorrow'
  if (diffDays === -1) return 'Yesterday'
  if (diffDays > 1) return `In ${diffDays} days`
  return `${Math.abs(diffDays)} days ago`
}

function PostsTableComponent({
  posts,
  campaignId,
  onDelete,
  emptyStateMessage = 'No posts',
  emptyStateActionLabel,
  onEmptyStateAction,
  loading = false,
  selectedIds,
  onToggleRow,
  onToggleAll,
  sorting,
  onSortingChange,
}: PostsTableProps) {
  const data = posts as PostRow[]
  // The two date columns format without reading the catalogue, so this is
  // what re-renders them when the language changes.
  const locale = useLocale()

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
                      visibleSelected === posts.length ? 'Clear selection' : 'Select all posts'
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
                    aria-label={`Select ${formatTitle(row.title)}`}
                  />
                </div>
              ),
            } satisfies ColumnConfig<PostRow>,
          ]
        : []),
      {
        id: 'title',
        accessorKey: 'title',
        header: 'Title',
        isAutoSize: true,
        cell: (_value, row) => {
          const displayTitle = formatTitle(row.title)
          return (
            <Link
              to="/campaigns/$campaignId/posts/$postId"
              params={{ campaignId, postId: row.id }}
              className="block h-[34px] border-b-2 border-background px-3 leading-8 hover:underline"
            >
              <TextCell value={displayTitle} />
            </Link>
          )
        },
      },
      {
        id: 'status',
        accessorKey: 'status',
        header: 'Status',
        size: 180,
        minSize: 140,
        cell: (_value, row) => (
          <div className="h-[34px] border-b-2 border-background px-3 leading-8">
            <TextCell value={POST_STATUS_LABELS[row.status] ?? row.status} />
          </div>
        ),
      },
      {
        id: 'platform',
        accessorFn: (row) => row.platform?.name ?? 'No platform',
        header: 'Platform',
        size: 150,
        minSize: 120,
        cell: (_value, row) =>
          row.platform ? (
            <div className="h-[34px] border-b-2 border-background px-3 leading-8">
              <TextCell value={row.platform.name} />
            </div>
          ) : (
            <div className="h-[34px] border-b-2 border-background px-3 leading-8">
              <span className="table-text text-tertiary-foreground">No platform</span>
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
        header: 'Scheduled Date',
        size: 160,
        minSize: 130,
        cell: (_value, row) => (
          <div className="h-[34px] border-b-2 border-background px-3 leading-8">
            <TextCell value={formatDate(row.scheduled_at, locale)} />
          </div>
        ),
      },
      {
        id: 'relative_time',
        accessorFn: (row) => row.scheduled_at ?? undefined,
        sortUndefined: 'last',
        header: 'When',
        size: 140,
        minSize: 110,
        cell: (_value, row) => (
          <div className="h-[34px] border-b-2 border-background px-3 leading-8">
            <TextCell value={formatRelativeDate(row.scheduled_at)} />
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
          if (!canDelete) return <div className="h-[34px] border-b-2 border-background" />
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
    [campaignId, onDelete, selectable, selectedIds, onToggleRow, onToggleAll, posts, visibleSelected, locale],
  )

  const activeColumns = useMemo(
    () => [
      ...(selectable ? ['select'] : []),
      'title',
      'status',
      'platform',
      'scheduled_at',
      'relative_time',
      'actions',
    ],
    [selectable],
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
      emptyStateMessage={emptyStateMessage}
      emptyStateActionLabel={emptyStateActionLabel}
      onEmptyStateAction={onEmptyStateAction}
      loading={loading}
    />
  )
}

export const PostsTable = memo(PostsTableComponent)