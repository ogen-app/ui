import { memo, useMemo } from 'react'
import { Link } from '@tanstack/react-router'
import { FilePdfIcon, ImageSquareIcon, NoteIcon, TrashIcon } from '@phosphor-icons/react'
import { VirtualTable } from '../VirtualTable'
import type { ColumnConfig } from '../types'
import type { Asset, Tag } from '@/types/content'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/ui/status-badge'
import { statusToBadge } from '@/lib/assetStatus'
import { assetCategory } from '@/lib/assetCategory'
import { extentLabel } from '@/lib/assetExtent'
import { relativeTime } from '@/lib/relativeTime'
import { cn, formatTitle } from '@/lib'

/*
 * The campaign's document list.
 *
 * One table, where there used to be two: this one and `AssetPoolTable`, whose
 * own header comment said it was deliberately identical to it. With the
 * workspace bank gone there is one place assets are listed, so there is one
 * component that lists them (CON-210).
 *
 * Two lines rather than six columns. The old row was built for a
 * workspace-wide file list, where the job is finding one document among
 * hundreds; a campaign holds four to twenty, and the job becomes *what have I
 * given this campaign, and can it actually read it*. So `type` and `created`
 * stop being columns — the kind is the glyph, and nothing here has ever been
 * decided by when a document was first uploaded — and the width goes to the
 * title and to what is under it.
 */

/** Row box and text block: 32px of icon, two 16px lines, 12px of air. */
const ROW_HEIGHT = 56

/**
 * The cell fills the box the table gives it and adds the inset — no height of
 * its own, and no hairline: `VirtualTable` already draws `border-b-2` on the
 * wrapper around every custom cell.
 */
const CELL = 'flex h-full items-center px-3'

type AssetRow = Asset & Record<string, unknown>

/**
 * `01 Aug 26`.
 *
 * Pinned to en-GB rather than the browser's locale: day-first is the format
 * asked for, and an en-US visitor would otherwise read "Aug 01, 26". The app
 * has no date-format convention yet and this is the first place two of them
 * meet — worth settling once, everywhere, rather than here.
 */
function stamp(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: '2-digit',
  })
}

/** 32px container, 24px glyph, pale border — kind at a glance, before the title. */
function AssetIcon({ asset }: { asset: Asset }) {
  const category = assetCategory(asset)
  const Icon =
    category === 'files' ? FilePdfIcon : category === 'imagery' ? ImageSquareIcon : NoteIcon
  return (
    <span className="flex size-8 shrink-0 items-center justify-center border border-quaternary">
      <Icon className="size-6 text-tertiary-foreground" />
    </span>
  )
}

/**
 * A tag on a row, in the row's own voice.
 *
 * `table-text` rather than the smaller, heavier type `TagsInput` uses: in a
 * field a tag is a control and wants to look like one, but in a table it is
 * data, and data that shouts a size down from the title next to it reads as a
 * badge. The surface is two steps of the grey ramp and nothing else.
 */
function TagPill({ tag }: { tag: Tag }) {
  return (
    <span className="table-text inline-flex max-w-full items-center truncate rounded-[1px] border border-tertiary bg-secondary p-[2px] text-primary-foreground">
      {tag.name}
    </span>
  )
}

type AssetsTableProps = {
  assets: Asset[]
  /** The campaign whose page this is — rows open its copy of the editor. */
  campaignId: string
  onDelete: (id: string) => void
  emptyStateMessage?: string
}

function AssetsTableComponent({
  assets,
  campaignId,
  onDelete,
  emptyStateMessage = 'Nothing in this campaign yet',
}: AssetsTableProps) {
  const data = assets as AssetRow[]

  const columnConfigs = useMemo<ColumnConfig<AssetRow>[]>(
    () => [
      {
        id: 'title',
        accessorKey: 'title',
        header: 'Title',
        isAutoSize: true,
        cell: (_value, row) => {
          const badge = statusToBadge(row.status)
          return (
            <Link
              to="/campaigns/$campaignId/content/$assetId"
              params={{ campaignId, assetId: row.id }}
              className={cn(CELL, 'gap-3')}
            >
              <AssetIcon asset={row} />
              <span className="flex min-w-0 flex-col gap-0.5">
                <span className="table-text truncate hover:underline">
                  {formatTitle(row.title)}
                </span>
                {/* How much of it there is, then whether the campaign can read
                    it. Both are properties of the thing named above, which is
                    why they sit under it rather than in columns of their own. */}
                <span className="flex items-center gap-2 text-xs text-tertiary-foreground">
                  <span className="shrink-0 tabular-nums">{extentLabel(row)}</span>
                  <StatusBadge tone={badge.tone} label={badge.label} />
                </span>
              </span>
            </Link>
          )
        },
      },
      {
        id: 'updated_at',
        accessorKey: 'updated_at',
        header: 'Updated',
        size: 150,
        minSize: 130,
        cell: (_value, row) => (
          <div className={CELL}>
            <span className="flex flex-col gap-0.5">
              {/* The exact date for reconciling against something outside the
                  app, the distance for the question people actually ask. */}
              <span className="table-text tabular-nums">{stamp(row.updated_at)}</span>
              <span className="text-xs text-tertiary-foreground">
                {relativeTime(row.updated_at)}
              </span>
            </span>
          </div>
        ),
      },
      {
        id: 'tags',
        header: 'Tags',
        size: 200,
        minSize: 160,
        sortable: false,
        cell: (_value, row) => (
          <div className={cn(CELL, 'justify-start gap-1.5')}>
            {row.tags.length === 0 ? (
              <span className="text-xs text-tertiary-foreground">—</span>
            ) : (
              row.tags.slice(0, 2).map((tag) => <TagPill key={tag.id} tag={tag} />)
            )}
          </div>
        ),
      },
      {
        id: 'actions',
        header: '',
        size: 60,
        minSize: 60,
        sortable: false,
        cell: (_value, row) => (
          <div className={cn(CELL, 'justify-center')}>
            <Button
              variant="ghost"
              size="xsIcon"
              aria-label={`Delete ${formatTitle(row.title)}`}
              onClick={(e) => {
                e.stopPropagation()
                onDelete(row.id)
              }}
            >
              <TrashIcon className="size-4 text-tertiary-foreground hover:text-destructive" />
            </Button>
          </div>
        ),
      },
    ],
    [campaignId, onDelete],
  )

  const activeColumns = useMemo(() => ['title', 'updated_at', 'tags', 'actions'], [])

  return (
    <VirtualTable
      data={data}
      columnConfigs={columnConfigs}
      activeColumns={activeColumns}
      initialSorting={[{ id: 'updated_at', desc: true }]}
      estimatedRowHeight={ROW_HEIGHT}
      overscan={6}
      showFooter={false}
      fillHeight={false}
      emptyStateMessage={emptyStateMessage}
    />
  )
}

export const AssetsTable = memo(AssetsTableComponent)
