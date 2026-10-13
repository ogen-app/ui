import { memo, useMemo } from 'react'
import type { TFunction } from 'i18next'
import { Link, type LinkProps } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { TrashIcon } from '@phosphor-icons/react'
import { VirtualTable } from '../VirtualTable'
import type { ColumnConfig } from '../types'
import type { Asset, Tag } from '@/types/content'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { StatusBadge } from '@/components/ui/status-badge'
import { AssetKindMark } from '@/components/content/AssetKindMark'
import { VerdictPill } from '@/components/content/VerdictPill'
import { useFeatureFlag } from '@/config/featureFlags'
import { useCampaigns } from '@/hooks/useCampaigns'
import { useIdeas } from '@/hooks/useIdeas'
import { cn } from '@/lib'
import { extentLabel } from '@/lib/assetExtent'
import {
  formatDuration,
  ideaCountsByAsset,
  listDate,
  listKind,
  listTitle,
  type VerdictKey,
} from '@/lib/assetList'
import { statusToBadge } from '@/lib/assetStatus'
import { assetCampaignIndex } from '@/lib/assetUsage'
import type { IdeaCounts } from '@/lib/ideas'

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
 */

/** The shortest row: a 32px mark and two lines, with air. */
const ROW_HEIGHT = 60

/**
 * The cell fills the box the table gives it and adds the inset — no height of
 * its own, and no hairline: `VirtualTable` already draws `border-b-2` on the
 * wrapper around every custom cell.
 */
const CELL = 'flex h-full items-center px-3 py-2.5'

type AssetRow = Asset & Record<string, unknown>

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
function statusLabel(t: TFunction, row: Asset): string | null {
  switch (row.status) {
    case 'ready':
      return null
    case 'partial': {
      const kind = listKind(row)
      return kind === 'page'
        ? t('content.list.status.partialPage')
        : kind === 'audio'
          ? t('content.list.status.partialAudio')
          : t('content.list.status.partial')
    }
    default:
      return t(`content.list.status.${row.status}`)
  }
}

/** The facts line: where a page is from, how much there is, any status. */
function Facts({ row }: { row: Asset }) {
  const { t, i18n } = useTranslation()
  const domain = row.type === 'URL' ? hostOf(row.source_url) : null
  const settling = row.status === 'pending' || row.status === 'processing'
  const extent = settling ? null : extentLabel(t, row, i18n.language)
  const ms = row.file?.duration_ms ?? 0
  const status = statusLabel(t, row)
  const badge = statusToBadge(row.status)
  const facts = [domain, ms > 0 ? formatDuration(t, ms) : null, extent]
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
function isReading(row: Asset): boolean {
  return (
    row.status === 'pending' ||
    row.status === 'processing' ||
    row.analysis_status === 'pending' ||
    row.analysis_status === 'running'
  )
}

type AssetsTableProps = {
  assets: Asset[]
  /**
   * The campaign whose page this is — rows open its copy of the asset page.
   * Null in the workspace bank, where a document is opened without one.
   */
  campaignId: string | null
  /**
   * Asks for the row's document to be deleted — it does not delete it. The
   * list answers with a confirmation naming the document; the whole asset
   * goes up rather than its id because that dialog needs the title.
   */
  onDelete: (asset: Asset) => void
  /** Offered by the shared empty state as RESET FILTERS. */
  onEmptyStateAction?: () => void
  /** Ids currently ticked. Omitted entirely turns the select column off. */
  selectedIds?: Set<string>
  onToggleRow?: (id: string) => void
  /** Ticks every row on screen, or clears them if they all already are. */
  onToggleAll?: () => void
  /** Reaches the table's own root — it is the grid item its page sizes. */
  className?: string
}

function AssetsTableComponent({
  assets,
  campaignId,
  onDelete,
  onEmptyStateAction,
  selectedIds,
  onToggleRow,
  onToggleAll,
  className,
}: AssetsTableProps) {
  const { t, i18n } = useTranslation()
  const data = assets as AssetRow[]
  const showGist = useFeatureFlag('asset-list-gist')

  const campaigns = useCampaigns()
  const held = useMemo(
    () => assetCampaignIndex(campaigns.data ?? []),
    [campaigns.data],
  )

  // The whole backlog, grouped by source asset here rather than asked for
  // per row; the Ideas inbox reads the same cache.
  const ideas = useIdeas(null)
  const ideaCounts = useMemo(
    () => ideaCountsByAsset(ideas.ideas, new Date()),
    [ideas.ideas],
  )

  const selectable = !!selectedIds && !!onToggleRow && !!onToggleAll
  // Against the rows on screen, not the whole selection: while a filter is
  // narrowing the list the header answers "is everything here ticked?".
  const visibleSelected = useMemo(
    () =>
      selectedIds ? assets.filter((a) => selectedIds.has(a.id)).length : 0,
    [assets, selectedIds],
  )
  const allVisibleSelected =
    assets.length > 0 && visibleSelected === assets.length

  const columnConfigs = useMemo<ColumnConfig<AssetRow>[]>(() => {
    const untitled = t('content.list.untitled')
    const titleOf = (row: Asset) => listTitle(row, untitled)
    // Same row, two pages: the campaign's copy keeps the campaign in the URL
    // so its back caret and its delete know where they are.
    const open = (row: Asset, verdict?: VerdictKey): LinkProps =>
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
    const campaignsOf = (row: Asset) =>
      (held.get(row.id) ?? []).filter((c) => c.id !== campaignId)
    const countsOf = (row: Asset): IdeaCounts | undefined =>
      ideaCounts.get(row.id)

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
        accessorFn: (row) => titleOf(row).toLocaleLowerCase(),
        header: t('content.list.title'),
        isAutoSize: true,
        cell: (_value, row) => {
          const gist = showGist ? row.gist?.trim() : ''
          return (
            <Link {...open(row)} className={cn(CELL, 'gap-3')}>
              <span className="flex size-8 shrink-0 items-center justify-center">
                <AssetKindMark asset={row} />
              </span>
              <span className="flex min-w-0 flex-col gap-0.5">
                <span className="table-text break-words whitespace-normal hover:underline">
                  {titleOf(row)}
                </span>
                {isReading(row) ? (
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
        accessorFn: (row) => countsOf(row)?.waiting ?? -1,
        cell: (_value, row) => {
          const counts = countsOf(row)
          return (
            <div className={CELL}>
              {/* Blank while the ideas or the reading are still coming —
                  "none" is a claim, and it must not be made a beat early. */}
              {ideas.isLoading || isReading(row) ? null : counts ? (
                <VerdictPill
                  counts={counts}
                  link={(verdict) => open(row, verdict)}
                />
              ) : (
                <Nothing />
              )}
            </div>
          )
        },
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
        accessorFn: (row) =>
          campaignsOf(row)[0]?.name.toLocaleLowerCase() ?? '',
        cell: (_value, row) => {
          const names = campaignsOf(row)
          return (
            <div className={CELL}>
              {/* Blank until the campaigns land, rather than a dash that
                  claims "in no campaign" for one frame. */}
              {!campaigns.data ? null : names.length === 0 ? (
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
    held,
    campaigns.data,
    ideaCounts,
    ideas.isLoading,
    showGist,
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
      initialSorting={[{ id: 'updated_at', desc: true }]}
      estimatedRowHeight={ROW_HEIGHT}
      measureRows
      overscan={6}
      showFooter={false}
      fillHeight={false}
      className={className}
      onEmptyStateAction={onEmptyStateAction}
    />
  )
}

export const AssetsTable = memo(AssetsTableComponent)
