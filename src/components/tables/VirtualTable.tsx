import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  memo,
  type JSX,
} from 'react'
import {
  type Column,
  type ColumnDef,
  createSortedRowModel,
  flexRender,
  type Row,
  rowSortingFeature,
  sortFn_alphanumeric,
  sortFn_datetime,
  sortFn_text,
  type SortingState,
  tableFeatures,
  type Updater,
  useTable,
} from '@tanstack/react-table'
import { useVirtualizer } from '@tanstack/react-virtual'
import * as ScrollAreaPrimitive from '@radix-ui/react-scroll-area'
import { cn } from '@/lib'
import type { VirtualTableProps, ColumnConfig, TableGroup } from './types'
import { calculateTotal } from './utils'
import { useColumnWidths, useContainerWidth } from './hooks/useColumnWidths'
import { Button } from '@/components/ui/button'
import { ScrollBar } from '@/components/ui/scroll-area'
import { ZIndex } from '@/config/zIndex.ts'
import {
  CaretDownIcon,
  CaretRightIcon,
  CaretUpIcon,
} from '@phosphor-icons/react'
import { useTranslation } from 'react-i18next'
import { formatNumber } from '@/lib/intl'
import { FooterCell } from '@/components/tables/TableCells.tsx'
import { TableEmptyState } from './TableEmptyState'

/**
 * What the table can do: sort, and nothing else. v9 registers features one by
 * one, so this is the whole list. The three sort functions are the ones the
 * `auto` sort picks between by looking at a column's values (dates, strings
 * with numbers in them, plain strings); v8 shipped them built in, and without
 * them every string column would sort by raw `<`, case first.
 *
 * Module scope because it must not change between renders.
 */
const features = tableFeatures({
  rowSortingFeature,
  sortedRowModel: createSortedRowModel(),
  sortFns: {
    alphanumeric: sortFn_alphanumeric,
    text: sortFn_text,
    datetime: sortFn_datetime,
  },
})
type Features = typeof features

/** What the body draws, in order: a group's head, or one of its rows. */
type BodyItem<TData extends Record<string, unknown>> =
  | { kind: 'group'; group: TableGroup; count: number; folded: boolean }
  | { kind: 'row'; row: Row<Features, TData> }

function VirtualTableComponent<TData extends Record<string, unknown>>({
  data,
  columnConfigs,
  activeColumns,
  className,
  initialSorting = [],
  sorting: controlledSorting,
  onSortingChange,
  estimatedRowHeight = 34,
  measureRows = false,
  overscan = 5,
  showFooter = true,
  fillHeight = false,
  emptyStateMessage,
  emptyStateActionLabel,
  onEmptyStateAction,
  emptyState,
  loading = false,
  manualSorting = false,
  onEndReached,
  rowClassName,
  endInset = 0,
  groupOf,
}: VirtualTableProps<TData>) {
  const { t, i18n } = useTranslation()
  // Controlled when the caller passes `sorting`, otherwise the table owns it.
  // Whoever owns it, the header below only ever calls `setSorting`.
  const [ownSorting, setOwnSorting] = useState<SortingState>(initialSorting)
  const sorting = controlledSorting ?? ownSorting
  const setSorting = useCallback(
    (updater: Updater<SortingState>) => {
      // TanStack hands us either the next state or a function of the current
      // one; a controlled parent gets the resolved value either way, since it
      // has no way to apply an updater against state it doesn't hold.
      const next = typeof updater === 'function' ? updater(sorting) : updater
      if (onSortingChange) onSortingChange(next)
      else setOwnSorting(next)
    },
    [sorting, onSortingChange],
  )
  const [spacerHeight, setSpacerHeight] = useState(0)
  const [contentFitsInSpace, setContentFitsInSpace] = useState(false)

  // Refs for measuring
  const containerRef = useRef<HTMLDivElement>(null)
  const viewportRef = useRef<HTMLDivElement>(null)
  const headerRef = useRef<HTMLDivElement>(null)
  const footerRef = useRef<HTMLDivElement>(null)

  // Measure container width for responsive column sizing
  const containerWidth = useContainerWidth(viewportRef)

  // Helper function to get column config by id
  const getColumnConfig = useCallback(
    (columnId: string) => {
      return columnConfigs.find((config) => config.id === columnId)
    },
    [columnConfigs],
  )

  // Create TanStack Table columns from configs
  const columns = useMemo<ColumnDef<Features, TData>[]>(() => {
    const activeConfigs = activeColumns
      .map((columnId) => getColumnConfig(columnId))
      .filter(Boolean) as ColumnConfig<TData>[]

    return activeConfigs.map((config) => ({
      id: config.id,
      accessorKey: config.accessorKey,
      accessorFn: config.accessorFn,
      size: config.isAutoSize ? undefined : config.size,
      minSize: config.isAutoSize ? undefined : config.minSize,
      maxSize: config.isAutoSize ? undefined : config.maxSize,
      enableSorting: config.sortable !== false,
      sortUndefined: config.sortUndefined,
      header: ({ column }: { column: Column<Features, TData, unknown> }) => {
        if (typeof config.header === 'function') {
          return config.header()
        }

        const sortDirection = column.getIsSorted()
        const alignment = config.alignment || 'left'

        if (config.sortable === false) {
          return (
            // The sortable header's button box and typography, minus the
            // button. Without it an unsortable column's label rendered at the
            // page's base size in full-strength ink and sat a few pixels above
            // every header beside it — the height and padding here are the
            // `size="sm"` button's own, so the two labels share a baseline.
            // It never showed because every unsortable column in the app so
            // far has an empty header string.
            <div
              className={cn(
                'inline-flex h-8 w-full items-center px-3',
                'text-xs font-normal text-tertiary-foreground',
                alignment === 'right' && 'justify-end text-right',
                alignment === 'center' && 'justify-center text-center',
                alignment === 'left' && 'justify-start text-left',
              )}
            >
              {config.header}
            </div>
          )
        }

        return (
          <Button
            variant="tableHeader"
            size="sm"
            active={!!sortDirection}
            onClick={() =>
              column.toggleSorting(
                sortDirection
                  ? sortDirection === 'asc'
                  : !!config.sortDescFirst,
              )
            }
            className={cn(
              'w-full justify-start gap-1 overflow-hidden',
              alignment === 'right'
                ? 'text-right flex-row-reverse'
                : 'text-left',
            )}
          >
            <span className="truncate">{config.header}</span>
            <div className="size-2.5 shrink-0 leading-0">
              {/* The way the values run down the column: a newest-first list
                  descends, so its caret points down. */}
              {sortDirection === 'asc' && (
                <CaretUpIcon className={'size-2.5'} />
              )}
              {sortDirection === 'desc' && (
                <CaretDownIcon className={'size-2.5'} />
              )}
            </div>
          </Button>
        )
      },
      cell: ({ row }: { row: Row<Features, TData> }) => {
        const value = config.accessorKey
          ? row.getValue(config.accessorKey as string)
          : row.getValue(config.id)
        const alignment = config.alignment || 'left'
        const cellClass = cn(
          alignment === 'right' ? 'text-right' : 'text-left',
          config.cellClassName ?? '',
        )

        if (config.cell) {
          return (
            // The second hard-coded 34: every custom cell is wrapped here, so
            // a table asking for a taller row got a correctly-sized row
            // containing 34px cell boxes its content hung out of — the
            // hairline drawn a third of the way up the row, and the cell's own
            // box no longer the thing the eye reads as the row. Same fix as
            // the wrapper: one number, read in both places.
            <div
              className={cn(
                'border-b-2 border-background leading-7 relative',
                cellClass,
              )}
              style={
                measureRows
                  ? { height: '100%', minHeight: `${estimatedRowHeight}px` }
                  : { height: `${estimatedRowHeight}px` }
              }
            >
              {config.cell(value, row.original)}
            </div>
          )
        }

        return <div className={cn('', cellClass)}>{String(value)}</div>
      },
      footer: config.totals
        ? ({ table }) => {
            const allRows = table.getRowModel().rows.map((row) => row.original)
            const result = calculateTotal(allRows, config)
            const alignment = config.alignment || 'left'
            const cellClass = alignment === 'right' ? 'text-right' : 'text-left'

            if (config.totals!.formatter && typeof result === 'number') {
              return (
                <div className={cn('h-8 px-3', cellClass)}>
                  <FooterCell
                    className={'leading-8'}
                    value={config.totals!.formatter(result)}
                  />
                </div>
              )
            }

            return <div className={cn('px-3', cellClass)}>{String(result)}</div>
          }
        : undefined,
    }))
  }, [activeColumns, getColumnConfig, estimatedRowHeight, measureRows])

  // Create TanStack Table instance
  const table = useTable({
    features,
    data,
    columns,
    onSortingChange: setSorting,
    // A server-sorted table draws its rows in the order they came, and the
    // header only reports the click.
    manualSorting,
    state: { sorting },
  })

  const { rows } = table.getRowModel()

  // Grouped, the body is each group's head and then its rows, in the table's
  // sort; a folded group is its head alone. Ungrouped, it is the rows.
  const [folded, setFolded] = useState<ReadonlySet<string>>(new Set())
  const items = useMemo<BodyItem<TData>[]>(() => {
    if (!groupOf) return rows.map((row) => ({ kind: 'row', row }))
    const groups = new Map<
      string,
      { group: TableGroup; rows: Row<Features, TData>[] }
    >()
    for (const row of rows) {
      const group = groupOf(row.original)
      const entry = groups.get(group.key) ?? { group, rows: [] }
      entry.rows.push(row)
      groups.set(group.key, entry)
    }
    const out: BodyItem<TData>[] = []
    const ordered = [...groups.values()].sort(
      (a, b) =>
        a.group.rank - b.group.rank ||
        a.group.label.localeCompare(b.group.label, i18n.language),
    )
    for (const { group, rows: inGroup } of ordered) {
      const isFolded = folded.has(group.key)
      out.push({
        kind: 'group',
        group,
        count: inGroup.length,
        folded: isFolded,
      })
      if (!isFolded) for (const row of inGroup) out.push({ kind: 'row', row })
    }
    return out
  }, [rows, groupOf, folded, i18n.language])
  const toggleFold = useCallback(
    (key: string) =>
      setFolded((prev) => {
        const next = new Set(prev)
        if (!next.delete(key)) next.add(key)
        return next
      }),
    [],
  )

  // Row virtualizer — over the body's items, keyed by what they are, so a
  // fold or a regroup never hands one item's measured size to another.
  // Stable between renders: the virtualiser re-derives every offset when
  // either changes, so a fresh function each render would lay out each render.
  // A group head is a row's height, so every item is.
  const estimateSize = useCallback(
    () => estimatedRowHeight,
    [estimatedRowHeight],
  )
  const getItemKey = useCallback(
    (index: number) => {
      const item = items[index]
      if (!item) return index
      return item.kind === 'group' ? `group:${item.group.key}` : item.row.id
    },
    [items],
  )
  const rowVirtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => viewportRef.current,
    estimateSize,
    getItemKey,
    overscan,
  })

  const virtualRows = rowVirtualizer.getVirtualItems()
  const totalSize = rowVirtualizer.getTotalSize()

  // The last rendered row is within the overscan of the end: time for the next
  // page. Asked again whenever the rows grow, so a page too short to scroll
  // still pulls the one after it.
  const lastRendered = virtualRows[virtualRows.length - 1]?.index ?? -1
  useEffect(() => {
    if (!onEndReached || items.length === 0) return
    if (lastRendered >= items.length - 1 - overscan) onEndReached()
  }, [onEndReached, lastRendered, items.length, overscan])

  // Calculate dynamic column widths based on container size
  const {
    cssVariables: columnWidthVars,
    totalWidth,
    hasOverflow,
    stickyLeftPositions,
    stickyRightPositions,
  } = useColumnWidths(containerWidth, activeColumns, columnConfigs)

  // Get sticky left position for a column
  const getStickyLeftPosition = useCallback(
    (columnId: string) => stickyLeftPositions.get(columnId) ?? 0,
    [stickyLeftPositions],
  )

  // Get sticky right position for a column
  const getStickyRightPosition = useCallback(
    (columnId: string) => stickyRightPositions.get(columnId) ?? 0,
    [stickyRightPositions],
  )

  // The column shell for a body-level row that carries no cell content: the
  // spacer and the skeleton rows. Sticky offsets and column borders belong to
  // the column, not to what is in it, so they can't be left out of either.
  const rowCellShell = useCallback(
    (columnId: string) => {
      const columnConfig = getColumnConfig(columnId)
      const isLeftSticky =
        columnConfig?.isSticky && columnConfig?.stickyPosition === 'left'
      const isRightSticky =
        columnConfig?.isSticky && columnConfig?.stickyPosition === 'right'

      return {
        className: cn(
          'shrink-0 border-background',
          isLeftSticky && 'sticky bg-table-row',
          isRightSticky && 'sticky bg-table-row',
          columnConfig?.borderSide === 'left' && 'border-l-2',
          columnConfig?.borderSide === 'right' && 'border-r-2',
          columnConfig?.borderSide === 'both' && 'border-x-2',
        ),
        style: {
          width: `var(--col-${columnId}-width)`,
          ...(isLeftSticky && {
            left: getStickyLeftPosition(columnId),
            zIndex: ZIndex.stickyTableColumnLeft,
          }),
          ...(isRightSticky && {
            right: getStickyRightPosition(columnId),
            zIndex: ZIndex.stickyTableColumnRight,
          }),
        },
      }
    },
    [getColumnConfig, getStickyLeftPosition, getStickyRightPosition],
  )

  // One header group carries the leaf columns; the spacer row below walks it
  // rather than re-deriving it per cell.
  const leafHeaders = table.getHeaderGroups()[0]?.headers ?? []

  // `!loading` is part of it: with a controlled sort the rows can already be
  // in hand while the stored order is still being read, and painting them then
  // would show the default order only to re-sort it a moment later. Loading
  // means the header and nothing else — no body, no footer, no empty state,
  // and (via the header's pointer-events guard) no sort clicks racing the
  // read.
  const hasData = !loading && rows.length > 0
  const hasFooter =
    showFooter &&
    table
      .getFooterGroups()
      .some((group) =>
        group.headers.some((header) => header.column.columnDef.footer),
      )

  // Calculate spacer height when fillHeight is enabled and check if content fits.
  //
  // Before paint, not after: `contentFitsInSpace` starts false, and false is
  // the full-height branch below. Measuring in a passive effect meant a short
  // list mounted as a page-tall slab of table surface and collapsed to its six
  // rows a frame later — which is what switching to this section looked like,
  // a flash of the whole column going white. The measurement reads the parent,
  // the header and the virtualiser's total, none of which depend on the height
  // being decided here, so there is no second pass to wait for.
  useLayoutEffect(() => {
    if (!containerRef.current || !viewportRef.current) return

    const updateMeasurements = () => {
      // Measure parent's available space (the grid cell)
      const parentHeight =
        containerRef.current?.parentElement?.clientHeight ?? 0
      const headerHeight = headerRef.current?.clientHeight ?? 0
      const footerHeight = hasFooter
        ? (footerRef.current?.clientHeight ?? 0)
        : 0
      const contentHeight = headerHeight + totalSize + endInset + footerHeight

      // Update spacer height for fillHeight mode
      if (fillHeight) {
        const viewportHeight = viewportRef.current?.clientHeight ?? 0
        const remainingHeight = viewportHeight - contentHeight
        setSpacerHeight(Math.max(0, remainingHeight))
      }

      // Check if content fits within parent's available space
      setContentFitsInSpace(contentHeight <= parentHeight)
    }

    updateMeasurements()

    // Observe parent element for resize, not ourselves
    const resizeObserver = new ResizeObserver(updateMeasurements)
    const parent = containerRef.current?.parentElement
    if (parent) {
      resizeObserver.observe(parent)
    }

    return () => resizeObserver.disconnect()
  }, [fillHeight, totalSize, hasFooter, endInset])

  return (
    <div
      ref={containerRef}
      className={cn(
        'flex flex-col w-full overflow-hidden bg-table-row box-border',
        // When no data, always fill height. When has data, use fillHeight prop or contentFitsInSpace logic
        //
        // `h-full` as well as `flex-1`, because `flex-1` only grows inside a
        // flex parent and not every caller gives it one. Without a height of
        // its own the loading table is as tall as its header, and the
        // virtualizer — which sizes its window from the scroll viewport it
        // attaches to — settles on room for one row and keeps that range after
        // the data lands, showing a handful of a long list.
        !hasData || fillHeight
          ? 'flex-1 min-h-0 h-full'
          : contentFitsInSpace
            ? 'self-start'
            : 'flex-1 min-h-0',
        className,
      )}
      style={columnWidthVars}
    >
      {/* Scrollable viewport */}
      <ScrollAreaPrimitive.Root
        className={cn('relative flex-1 min-h-0 overflow-hidden')}
      >
        <ScrollAreaPrimitive.Viewport
          ref={viewportRef}
          // `overscroll-none` turns off the elastic bounce macOS gives an inner
          // scroller. The bounce translates the scrolled box as a whole, and a
          // header held in place by `sticky top-0` has nothing to hold on to
          // once the scroll position goes past its own top — so pulling down at
          // the top of the list dragged the column headings along with the
          // rows, which is not something a table header does.
          className={'h-full w-full overscroll-none rounded-[inherit]'}
        >
          {/* Header - sticky top */}
          <div
            ref={headerRef}
            className={cn(
              'sticky top-0 bg-table-header',
              `z-${ZIndex.stickyTableHeader}`,
              !hasData && 'pointer-events-none',
            )}
          >
            {table.getHeaderGroups().map((headerGroup) => (
              <div
                key={headerGroup.id}
                className="flex"
                style={{
                  width: hasOverflow ? `${totalWidth}px` : '100%',
                }}
              >
                {headerGroup.headers.map((header) => {
                  const columnConfig = getColumnConfig(header.column.id)
                  const isLeftSticky =
                    columnConfig?.isSticky &&
                    columnConfig?.stickyPosition === 'left'
                  const isRightSticky =
                    columnConfig?.isSticky &&
                    columnConfig?.stickyPosition === 'right'
                  const stickyLeftPosition = isLeftSticky
                    ? getStickyLeftPosition(header.column.id)
                    : 0
                  const stickyRightPosition = isRightSticky
                    ? getStickyRightPosition(header.column.id)
                    : 0

                  return (
                    <div
                      key={header.id}
                      className={cn(
                        'shrink-0 w-full grid border-b-2 border-background',
                        isLeftSticky && 'sticky bg-table-header',
                        isRightSticky && 'sticky bg-table-header',
                        columnConfig?.borderSide === 'left' && 'border-l-2',
                        columnConfig?.borderSide === 'right' && 'border-r-2',
                        columnConfig?.borderSide === 'both' && 'border-x-2',
                      )}
                      style={{
                        width: `var(--col-${header.column.id}-width)`,
                        ...(isLeftSticky && {
                          left: stickyLeftPosition,
                          zIndex: ZIndex.stickyTableColumnLeft,
                        }),
                        ...(isRightSticky && {
                          right: stickyRightPosition,
                          zIndex: ZIndex.stickyTableColumnRight,
                        }),
                      }}
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext(),
                          )}
                    </div>
                  )
                })}
              </div>
            ))}
          </div>

          {/* Nothing between the header and the rows while they are in
              flight. The header is the real one at its real widths, so the
              rows arrive into the table rather than replacing a sketch of
              one — and a body of grey bars would be claiming there is
              something there to read. */}

          {/* Empty state */}
          {!hasData && !loading && (
            <div className="flex flex-1 items-center justify-center w-full">
              {emptyState ?? (
                <TableEmptyState
                  message={emptyStateMessage}
                  actionLabel={emptyStateActionLabel}
                  onAction={onEmptyStateAction}
                />
              )}
            </div>
          )}

          {/* Body - virtualized rows */}
          {hasData && (
            <div
              className="relative"
              style={{
                height: `${totalSize + endInset}px`,
                width: hasOverflow ? `${totalWidth}px` : '100%',
              }}
            >
              {virtualRows.map((virtualRow) => {
                const item = items[virtualRow.index]
                if (item.kind === 'group') {
                  const { group, count } = item
                  // A row like the others — the same surface, height and rule
                  // under it — whose words are bold: the group, then its count.
                  return (
                    <div
                      key={virtualRow.key}
                      data-index={virtualRow.index}
                      className="absolute top-0 left-0 flex items-center border-b-2 border-background bg-table-row px-3 hover:bg-table-row-hover"
                      style={{
                        height: `${estimatedRowHeight}px`,
                        transform: `translateY(${virtualRow.start}px)`,
                        width: hasOverflow ? `${totalWidth}px` : '100%',
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => toggleFold(group.key)}
                        aria-expanded={!item.folded}
                        aria-label={t(
                          item.folded
                            ? 'postsTable.view.unfold'
                            : 'postsTable.view.fold',
                          { group: group.label },
                        )}
                        className="table-text-accented flex max-w-full cursor-pointer items-center gap-2 text-left text-foreground outline-none focus-visible:underline"
                      >
                        {item.folded ? (
                          <CaretRightIcon
                            className="size-3 shrink-0 text-secondary-foreground"
                            aria-hidden
                          />
                        ) : (
                          <CaretDownIcon
                            className="size-3 shrink-0 text-secondary-foreground"
                            aria-hidden
                          />
                        )}
                        <span className="truncate">{group.label}</span>
                        <span className="shrink-0 text-secondary-foreground tabular-nums">
                          {formatNumber(count, {}, i18n.language)}
                        </span>
                      </button>
                    </div>
                  )
                }
                const { row } = item
                return (
                  <div
                    key={row.id}
                    // Measured rows report their own height; a fixed row's is
                    // the estimate, and `contain-strict` may size it.
                    ref={
                      measureRows ? rowVirtualizer.measureElement : undefined
                    }
                    data-index={virtualRow.index}
                    className={cn(
                      'group flex absolute top-0 left-0 bg-table-row hover:bg-table-row-hover',
                      measureRows
                        ? 'contain-[layout_style_paint]'
                        : 'contain-strict',
                      rowClassName?.(row.original),
                    )}
                    style={{
                      // Was hard-coded `h-[34px]`, which silently disagreed
                      // with the virtualiser: `estimateSize` already positions
                      // every row by `estimatedRowHeight`, so any table asking
                      // for a taller row got correct offsets and a 34px box
                      // that its cells spilled out of. Reading the same number
                      // for both is what lets a two-line row exist.
                      ...(measureRows
                        ? { minHeight: `${estimatedRowHeight}px` }
                        : { height: `${estimatedRowHeight}px` }),
                      transform: `translateY(${virtualRow.start}px)`,
                      width: hasOverflow ? `${totalWidth}px` : '100%',
                    }}
                  >
                    {row.getAllCells().map((cell) => {
                      const columnConfig = getColumnConfig(cell.column.id)
                      const isLeftSticky =
                        columnConfig?.isSticky &&
                        columnConfig?.stickyPosition === 'left'
                      const isRightSticky =
                        columnConfig?.isSticky &&
                        columnConfig?.stickyPosition === 'right'
                      const stickyLeftPosition = isLeftSticky
                        ? getStickyLeftPosition(cell.column.id)
                        : 0
                      const stickyRightPosition = isRightSticky
                        ? getStickyRightPosition(cell.column.id)
                        : 0

                      return (
                        <div
                          key={cell.id}
                          className={cn(
                            'shrink-0 border-background contain-[layout_style_paint]',
                            isLeftSticky &&
                              'sticky bg-table-row group-hover:bg-table-row-hover',
                            isRightSticky &&
                              'sticky bg-table-row group-hover:bg-table-row-hover',
                            columnConfig?.borderSide === 'left' && 'border-l-2',
                            columnConfig?.borderSide === 'right' &&
                              'border-r-2',
                            columnConfig?.borderSide === 'both' && 'border-x-2',
                            columnConfig?.cellClassName,
                          )}
                          style={{
                            width: `var(--col-${cell.column.id}-width)`,
                            ...(isLeftSticky && {
                              left: stickyLeftPosition,
                              zIndex: ZIndex.stickyTableColumnLeft,
                            }),
                            ...(isRightSticky && {
                              right: stickyRightPosition,
                              zIndex: ZIndex.stickyTableColumnRight,
                            }),
                          }}
                        >
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext(),
                          )}
                        </div>
                      )
                    })}
                  </div>
                )
              })}
            </div>
          )}

          {/* Spacer row to fill remaining height */}
          {hasData && fillHeight && spacerHeight > 0 && (
            <div
              className="flex bg-table-row"
              style={{
                height: `${spacerHeight}px`,
                width: hasOverflow ? `${totalWidth}px` : '100%',
              }}
            >
              {leafHeaders.map((header) => (
                <div key={header.id} {...rowCellShell(header.column.id)} />
              ))}
            </div>
          )}

          {/* Footer - sticky bottom */}
          {hasData && hasFooter && (
            <div
              ref={footerRef}
              className={cn(
                'sticky bottom-0 bg-table-footer -mt-0.5',
                `z-${ZIndex.stickyTableFooter}`,
              )}
            >
              {table.getFooterGroups().map((footerGroup) => (
                <div
                  key={footerGroup.id}
                  className="flex"
                  style={{
                    width: hasOverflow ? `${totalWidth}px` : '100%',
                  }}
                >
                  {footerGroup.headers.map((header) => {
                    const columnConfig = getColumnConfig(header.column.id)
                    const isLeftSticky =
                      columnConfig?.isSticky &&
                      columnConfig?.stickyPosition === 'left'
                    const isRightSticky =
                      columnConfig?.isSticky &&
                      columnConfig?.stickyPosition === 'right'
                    const stickyLeftPosition = isLeftSticky
                      ? getStickyLeftPosition(header.column.id)
                      : 0
                    const stickyRightPosition = isRightSticky
                      ? getStickyRightPosition(header.column.id)
                      : 0

                    return (
                      <div
                        key={header.id}
                        className={cn(
                          'shrink-0 border-t-2 border-background',
                          isLeftSticky && 'sticky bg-table-footer',
                          isRightSticky && 'sticky bg-table-footer',
                          columnConfig?.borderSide === 'left' && 'border-l-2',
                          columnConfig?.borderSide === 'right' && 'border-r-2',
                          columnConfig?.borderSide === 'both' && 'border-x-2',
                        )}
                        style={{
                          width: `var(--col-${header.column.id}-width)`,
                          ...(isLeftSticky && {
                            left: stickyLeftPosition,
                            zIndex: ZIndex.stickyTableColumnLeft,
                          }),
                          ...(isRightSticky && {
                            right: stickyRightPosition,
                            zIndex: ZIndex.stickyTableColumnRight,
                          }),
                        }}
                      >
                        {header.isPlaceholder
                          ? null
                          : flexRender(
                              header.column.columnDef.footer,
                              header.getContext(),
                            )}
                      </div>
                    )
                  })}
                </div>
              ))}
            </div>
          )}
        </ScrollAreaPrimitive.Viewport>
        {hasData && (
          <ScrollBar
            orientation="vertical"
            style={{ zIndex: ZIndex.scrollBar }}
          />
        )}
        {hasData && hasOverflow && (
          <ScrollBar
            orientation="horizontal"
            style={{ zIndex: ZIndex.scrollBar }}
          />
        )}
        {hasData && (
          <ScrollAreaPrimitive.Corner style={{ zIndex: ZIndex.scrollBar }} />
        )}
      </ScrollAreaPrimitive.Root>
    </div>
  )
}

// Export memoized version
export const VirtualTable = memo(VirtualTableComponent) as <
  TData extends Record<string, unknown>,
>(
  props: VirtualTableProps<TData>,
) => JSX.Element
