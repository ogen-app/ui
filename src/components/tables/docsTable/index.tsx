import { memo, useCallback, useMemo, type ReactNode } from 'react'
import type { TFunction } from 'i18next'
import type { SortingState } from '@tanstack/react-table'
import { Link, type LinkProps } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { TrashIcon } from '@phosphor-icons/react'
import { VirtualTable } from '../VirtualTable'
import type { ColumnConfig } from '../types'
import type { Tag } from '@/types/content'
import type { AssetListItem } from '@/types/assetList'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { StatusBadge } from '@/components/ui/status-badge'
import { AssetKindMark } from '@/components/content/AssetKindMark'
import { VerdictPill } from '@/components/content/VerdictPill'
import { useCampaignNames } from '@/hooks/useCampaignNames'
import { cn } from '@/lib'
import { DEFAULT_SORT, type AssetSort } from '@/lib/assetFilter'
import {
  formatDuration,
  listDate,
  listTitle,
  type VerdictKey,
} from '@/lib/assetList'
import { statusToBadge } from '@/lib/assetStatus'
import { MatchSnippet } from '@/components/content/MatchSnippet'

/*
 * The Assets list (CON-210, CON-370) — what each document *offers*, not its
 * storage record.
 *
 * A row is the asset's title, written as words; under it, when there is one,
 * a sentence of what it says or where its reading has got to; under that, a
 * quiet line of facts. Then the ideas its analysis distilled, as a verdict
 * pill; when it last changed; the campaigns holding it; its tags.
 *
 * Quiet by default. An empty cell is a faint dash, never "Not used" or "No
 * tags" on every row, and a status is shown only when it isn't Ready — so the
 * rows that need attention are the ones that look different. The bin shows on
 * hover and focus only: the one always-visible action used to be the
 * destructive one.
 *
 * Titles wrap rather than truncate, so rows take the height of their content
 * (`measureRows`), and the title column gives up width to Campaign and Tags so
 * a campaign's name fits whole.
 *
 * Every row, figure and order here is the server's (CON-374): the table draws
 * a page of the Assets query in the order it arrived, a header click asks for
 * another order rather than re-sorting what is loaded, and reaching the end
 * asks for the next page. While the query searches inside the documents, a
 * row's second line is where it matched rather than its gist.
 */

/** The shortest row: a 32px mark and two lines, with air. */
const ROW_HEIGHT = 60

/**
 * The cell fills the box the table gives it and adds the inset — no height of
 * its own, and no hairline: `VirtualTable` already draws `border-b-2` on the
 * wrapper around every custom cell.
 */
const CELL = 'flex h-full items-center px-3 py-2.5'

type AssetRow = AssetListItem & Record<string, unknown>

/**
 * A tag on a row, in the row's own voice: data rather than a control, so the
 * table's text size on two steps of the grey ramp.
 */
function TagPill({ tag }: { tag: Tag }) {
  return (
    <span className="table-text inline-flex max-w-full items-center truncate rounded-[1px] border border-tertiary bg-secondary p-[2px] text-primary-foreground">
      {tag.name}
    </span>
  )
}

/** An empty cell: a faint mark for the eye, a word for a screen reader. */
function Nothing() {
  const { t } = useTranslation()
  return (
    <>
      <span aria-hidden className="table-text text-quaternary-foreground">
        –
      </span>
      <span className="sr-only">{t('content.list.none')}</span>
    </>
  )
}

/** What went wrong or is still happening; nothing at all when it is Ready. */
function statusLabel(t: TFunction, row: AssetListItem): string | null {
  switch (row.status) {
    case 'ready':
      return null
    case 'partial': {
      const kind = row.kind
      return kind === 'web'
        ? t('content.list.status.partialPage')
        : kind === 'audio'
          ? t('content.list.status.partialAudio')
          : t('content.list.status.partial')
    }
    default:
      return t(`content.list.status.${row.status}`)
  }
}

/**
 * The facts line: where a page is from, how long a recording runs, how many
 * pages a file has, and any status.
 *
 * The list row carries no `content` (CON-374), so a note or a page no longer
 * states its words — counting them meant shipping every document whole to
 * draw one figure.
 */
function Facts({ row }: { row: AssetListItem }) {
  const { t } = useTranslation()
  const domain = row.type === 'URL' ? hostOf(row.source_url) : null
  const settling = row.status === 'pending' || row.status === 'processing'
  const pages = settling ? 0 : (row.file?.page_count ?? 0)
  const ms = row.file?.duration_ms ?? 0
  const status = statusLabel(t, row)
  const badge = statusToBadge(row.status)
  const facts = [
    domain,
    ms > 0 ? formatDuration(t, ms) : null,
    pages > 0 ? t('content.extent.pages', { count: pages }) : null,
  ]
    .filter(Boolean)
    .join(' · ')
  return (
    <span className="flex flex-wrap items-center gap-x-2 text-xs text-secondary-foreground">
      {facts && <span className="tabular-nums">{facts}</span>}
      {status && (
        <StatusBadge
          tone={badge.tone}
          label={status}
          className={cn(
            'text-secondary-foreground',
            row.status === 'partial' && 'text-warning',
          )}
        />
      )}
    </span>
  )
}

/** "infoq.com" — the domain alone, the path being noise in a list. */
function hostOf(url: string | null | undefined): string | null {
  if (!url) return null
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return null
  }
}

/** Ingest or analysis still under way: the row says so in place. */
function isReading(row: AssetListItem): boolean {
  return (
    row.status === 'pending' ||
    row.status === 'processing' ||
    row.analysis_status === 'pending' ||
    row.analysis_status === 'running'
  )
}

/** The table's sort as the server names it, and back. */
const SORT_OF: Record<string, { asc: AssetSort; desc: AssetSort }> = {
  title: { asc: 'title', desc: '-title' },
  updated_at: { asc: 'updated_at', desc: '-updated_at' },
  // Only most-undecided-first exists: "fewest undecided" is a list of every
  // asset nobody has read yet, which is not a question anyone asks.
  ideas: { asc: DEFAULT_SORT, desc: '-ideas_undecided' },
}

function sortingOf(sort: AssetSort): SortingState {
  switch (sort) {
    case 'title':
      return [{ id: 'title', desc: false }]
    case '-title':
      return [{ id: 'title', desc: true }]
    case 'updated_at':
      return [{ id: 'updated_at', desc: false }]
    case '-updated_at':
      return [{ id: 'updated_at', desc: true }]
    case '-ideas_undecided':
      return [{ id: 'ideas', desc: true }]
    case 'relevance':
      // Best match first: no column is the order.
      return []
  }
}

type AssetsTableProps = {
  /** The rows loaded so far, in the order the server sorted them. */
  assets: AssetListItem[]
  /**
   * The campaign whose page this is — rows open its copy of the asset page.
   * Null in the workspace bank, where a document is opened without one.
   */
  campaignId: string | null
  /**
   * Asks for the row's document to be deleted — it does not delete it. The
   * list answers with a confirmation naming the document; the whole row goes
   * up rather than its id because that dialog needs the title.
   */
  onDelete: (asset: AssetListItem) => void
  /** The server's order (CON-374); a header click asks for another. */
  sort: AssetSort
  onSortChange: (sort: AssetSort) => void
  /** The last rows are on screen: fetch the next page, if there is one. */
  onEndReached?: () => void
  /** What the table says when there are no rows. */
  emptyState?: ReactNode
  /** Ids currently ticked. Omitted entirely turns the select column off. */
  selectedIds?: Set<string>
  onToggleRow?: (id: string) => void
  /** Ticks every loaded row, or clears them if they all already are. */
  onToggleAll?: () => void
  /** Reaches the table's own root — it is the grid item its page sizes. */
  className?: string
}

function AssetsTableComponent({
  assets,
  campaignId,
  onDelete,
  sort,
  onSortChange,
  onEndReached,
  emptyState,
  selectedIds,
  onToggleRow,
  onToggleAll,
  className,
}: AssetsTableProps) {
  const { t, i18n } = useTranslation()
  const data = assets as AssetRow[]

  const { names: campaignNames, ready: campaignsReady } = useCampaignNames()

  const selectable = !!selectedIds && !!onToggleRow && !!onToggleAll
  // Against the loaded rows, not the whole selection: the header answers "is
  // everything here ticked?", and "everything matching" is the bar's offer.
  const visibleSelected = useMemo(
    () =>
      selectedIds ? assets.filter((a) => selectedIds.has(a.id)).length : 0,
    [assets, selectedIds],
  )
  const allVisibleSelected =
    assets.length > 0 && visibleSelected === assets.length

  const sorting = useMemo(() => sortingOf(sort), [sort])
  const handleSortingChange = useCallback(
    (next: SortingState) => {
      const first = next[0]
      if (!first) {
        onSortChange(DEFAULT_SORT)
        return
      }
      const pair = SORT_OF[first.id]
      if (pair) onSortChange(first.desc ? pair.desc : pair.asc)
    },
    [onSortChange],
  )

  const columnConfigs = useMemo<ColumnConfig<AssetRow>[]>(() => {
    const untitled = t('content.list.untitled')
    const titleOf = (row: AssetListItem) => listTitle(row, untitled)
    // Same row, two pages: the campaign's copy keeps the campaign in the URL
    // so its back caret and its delete know where they are.
    const open = (row: AssetListItem, verdict?: VerdictKey): LinkProps =>
      campaignId
        ? {
            to: '/campaigns/$campaignId/assets/$assetId',
            params: { campaignId, assetId: row.id },
            search: verdict ? { verdict } : {},
          }
        : {
            to: '/assets/$assetId',
            params: { assetId: row.id },
            search: verdict ? { verdict } : {},
          }
    // On a campaign's own page every row is in that campaign, so the column
    // names the others.
    const campaignsOf = (row: AssetListItem) =>
      row.campaign_ids
        .filter((id) => id !== campaignId)
        .map((id) => ({ id, name: campaignNames.get(id) }))
        .filter((c): c is { id: string; name: string } => !!c.name)
    const hasIdeas = (row: AssetListItem) =>
      Object.values(row.idea_counts).some((n) => n > 0)

    return [
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
                        : allVisibleSelected
                          ? true
                          : 'indeterminate'
                    }
                    onCheckedChange={onToggleAll}
                    aria-label={
                      allVisibleSelected
                        ? t('content.list.clearSelection')
                        : t('content.list.selectAll')
                    }
                  />
                </div>
              ),
              size: 44,
              minSize: 44,
              sortable: false,
              isControl: true,
              cell: (_value: unknown, row: AssetRow) => (
                <div className={cn(CELL, 'justify-center')}>
                  <Checkbox
                    checked={selectedIds!.has(row.id)}
                    onCheckedChange={() => onToggleRow!(row.id)}
                    aria-label={t('content.list.selectRow', {
                      title: titleOf(row),
                    })}
                  />
                </div>
              ),
            } satisfies ColumnConfig<AssetRow>,
          ]
        : []),
      {
        id: 'title',
        header: t('content.list.title'),
        isAutoSize: true,
        cell: (_value, row) => {
          const gist = row.gist?.trim()
          return (
            <Link {...open(row)} className={cn(CELL, 'gap-3')}>
              <span className="flex size-8 shrink-0 items-center justify-center">
                <AssetKindMark asset={row} />
              </span>
              <span className="flex min-w-0 flex-col gap-0.5">
                <span className="table-text break-words whitespace-normal hover:underline">
                  {titleOf(row)}
                </span>
                {row.match ? (
                  <MatchSnippet match={row.match} />
                ) : isReading(row) ? (
                  <span className="text-xs text-secondary-foreground">
                    {t('content.list.reading')}
                  </span>
                ) : (
                  gist && (
                    <span className="text-[13px] leading-5 text-secondary-foreground">
                      {gist}
                    </span>
                  )
                )}
                <Facts row={row} />
              </span>
            </Link>
          )
        },
      },
      {
        // Sorted by what is left to decide, most first.
        id: 'ideas',
        header: t('content.list.ideas'),
        size: 196,
        minSize: 160,
        sortDescFirst: true,
        cell: (_value, row) => (
          <div className={CELL}>
            {/* Blank while the reading is still under way — "none" is a
                claim, and it must not be made a beat early. */}
            {isReading(row) ? null : hasIdeas(row) ? (
              <VerdictPill
                counts={row.idea_counts}
                link={(verdict) => open(row, verdict)}
              />
            ) : (
              <Nothing />
            )}
          </div>
        ),
      },
      {
        id: 'updated_at',
        accessorKey: 'updated_at',
        header: t('content.list.updated'),
        size: 130,
        minSize: 120,
        sortDescFirst: true,
        cell: (_value, row) => {
          const date = listDate(t, row.updated_at, new Date(), i18n.language)
          return (
            <div className={CELL}>
              {date && (
                <span title={date.exact} className="table-text tabular-nums">
                  {date.label}
                </span>
              )}
            </div>
          )
        },
      },
      {
        id: 'campaign',
        header: campaignId
          ? t('content.list.alsoIn')
          : t('content.list.campaign'),
        size: 230,
        minSize: 160,
        sortable: false,
        cell: (_value, row) => {
          const names = campaignsOf(row)
          return (
            <div className={CELL}>
              {/* Blank until the campaigns land, rather than a dash that
                  claims "in no campaign" for one frame. */}
              {!campaignsReady ? null : names.length === 0 ? (
                <Nothing />
              ) : (
                <span className="flex min-w-0 flex-col gap-0.5">
                  {names.map((c) => (
                    <span
                      key={c.id}
                      className="table-text break-words whitespace-normal"
                    >
                      {c.name}
                    </span>
                  ))}
                </span>
              )}
            </div>
          )
        },
      },
      {
        id: 'tags',
        header: t('content.list.tags'),
        size: 200,
        minSize: 150,
        sortable: false,
        cell: (_value, row) => (
          <div className={cn(CELL, 'flex-wrap justify-start gap-1.5')}>
            {row.tags.length === 0 ? (
              <Nothing />
            ) : (
              row.tags.map((tag) => <TagPill key={tag.id} tag={tag} />)
            )}
          </div>
        ),
      },
      {
        id: 'actions',
        header: '',
        size: 52,
        minSize: 52,
        sortable: false,
        cell: (_value, row) => (
          <div className={cn(CELL, 'justify-center')}>
            {/* Out of sight until the row is pointed at or the bin is
                focused — still a tab stop, still the same confirmation. A
                screen with no hover shows it. */}
            <Button
              variant="ghost"
              size="xsIcon"
              aria-label={t('content.list.deleteRow', { title: titleOf(row) })}
              className="opacity-0 group-hover:opacity-100 focus-visible:opacity-100 [@media(hover:none)]:opacity-100"
              onClick={(e) => {
                e.stopPropagation()
                onDelete(row)
              }}
            >
              <TrashIcon className="size-4 text-secondary-foreground hover:text-destructive" />
            </Button>
          </div>
        ),
      },
    ]
  }, [
    t,
    i18n.language,
    campaignId,
    campaignNames,
    campaignsReady,
    onDelete,
    selectable,
    selectedIds,
    onToggleRow,
    onToggleAll,
    visibleSelected,
    allVisibleSelected,
  ])

  const activeColumns = useMemo(
    () => [
      ...(selectable ? ['select'] : []),
      'title',
      'ideas',
      'updated_at',
      'campaign',
      'tags',
      'actions',
    ],
    [selectable],
  )

  return (
    <VirtualTable
      data={data}
      columnConfigs={columnConfigs}
      activeColumns={activeColumns}
      sorting={sorting}
      onSortingChange={handleSortingChange}
      manualSorting
      onEndReached={onEndReached}
      emptyState={emptyState}
      estimatedRowHeight={ROW_HEIGHT}
      measureRows
      overscan={6}
      showFooter={false}
      fillHeight={false}
      className={className}
    />
  )
}

export const AssetsTable = memo(AssetsTableComponent)
