import { useEffect, useMemo, useRef } from 'react'
import type { ReactNode, Ref } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { cn } from '@/lib'
import { formatNumber } from '@/lib/intl'
import {
  citationStatus,
  inRange,
  isNumericCell,
  sheetColumns,
  type CitedRange,
  type Sheet,
  type SheetRow,
} from '@/lib/sheetChunks'

/** How many pages a citation may pull in on its own before it waits. */
const MAX_CITATION_PAGES = 10

type Props = {
  sheets: Sheet[]
  /** A CSV's one unnamed sheet is called this — the file's name. */
  fallbackName: string
  /** The sheet on screen, by its anchor name; null picks the first. */
  selected: string | null
  onSelect: (name: string) => void
  cited: CitedRange | null
  onClearCited: () => void
  loading: boolean
  failed: boolean
  hasMore: boolean
  loadingMore: boolean
  onLoadMore: () => void
  /** What to show when the chunks hold no sheet at all — the text view. */
  fallback: ReactNode
}

/**
 * A spreadsheet under the Source tab (CON-366 §5.4): one pill per sheet and
 * the sheet as a table, rebuilt from the row chunks.
 *
 * Read-only for the reason a PDF's text is: these rows are what the assistant
 * reads and cites. A cited range — an idea's "Pipeline · rows 10–24" — is
 * scrolled to and marked, with a banner naming what cited it, and the pages
 * that hold it are fetched if they are not loaded yet.
 */
export function SheetView({
  sheets,
  fallbackName,
  selected,
  onSelect,
  cited,
  onClearCited,
  loading,
  failed,
  hasMore,
  loadingMore,
  onLoadMore,
  fallback,
}: Props) {
  const { t, i18n } = useTranslation()
  const sheet = sheets.find((s) => s.name === selected) ?? sheets[0]
  const columns = useMemo(() => (sheet ? sheetColumns(sheet) : []), [sheet])
  const range = cited && sheet && cited.sheet === sheet.name ? cited : null
  const firstCitedRef = useRef<HTMLTableRowElement | null>(null)
  const citedLoaded = range ? sheet.rows.some((r) => inRange(r, range)) : true
  // The rows a citation names may sit in a page not loaded yet — even on a
  // sheet no loaded page has reached — so go and get them rather than
  // highlighting nothing.
  // Bounded: a citation is chased for a few pages at most, and not at all
  // once the loaded chunks show it cannot be there. Load more stays for the
  // rest.
  const citedMissing =
    cited !== null && citationStatus(sheets, cited) === 'more'
  const autoLoads = useRef<{ cited: CitedRange | null; count: number }>({
    cited: null,
    count: 0,
  })

  useEffect(() => {
    if (!citedMissing || !hasMore || loadingMore) return
    if (autoLoads.current.cited !== cited) {
      autoLoads.current = { cited, count: 0 }
    }
    if (autoLoads.current.count >= MAX_CITATION_PAGES) return
    autoLoads.current.count += 1
    onLoadMore()
  }, [cited, citedMissing, hasMore, loadingMore, onLoadMore])

  useEffect(() => {
    if (range && citedLoaded) {
      firstCitedRef.current?.scrollIntoView?.({ block: 'center' })
    }
  }, [range, citedLoaded])

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner tone="onSurface" className="w-24" />
      </div>
    )
  }
  if (failed) {
    return (
      <p className="text-sm text-destructive">
        {t('assetInsights.sheet.loadFailed')}
      </p>
    )
  }
  if (!sheet) return <>{fallback}</>

  const nameOf = (s: Sheet) => s.name || fallbackName
  const firstCited = range ? sheet.rows.findIndex((r) => inRange(r, range)) : -1

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {sheets.length > 1 ? (
          <div
            role="tablist"
            aria-label={t('assetInsights.sheet.sheets', {
              count: sheets.length,
            })}
            className="flex flex-wrap gap-1.5"
          >
            {sheets.map((s) => {
              const active = s === sheet
              return (
                <button
                  key={s.name}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => onSelect(s.name)}
                  className={cn(
                    'flex h-8 cursor-pointer items-center gap-2 rounded-md px-3 text-[13px] font-medium',
                    active
                      ? 'bg-primary-foreground text-primary'
                      : 'bg-tertiary text-secondary-foreground hover:text-foreground',
                  )}
                >
                  {nameOf(s)}
                  {s.rowCount !== null && (
                    <span
                      className={cn(
                        'text-xs font-normal tabular-nums',
                        active ? 'text-primary/60' : 'text-tertiary-foreground',
                      )}
                    >
                      {formatNumber(s.rowCount, {}, i18n.language)}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        ) : (
          <span className="text-sm font-medium text-foreground">
            {nameOf(sheet)}
          </span>
        )}
        <span className="text-xs text-tertiary-foreground">
          {t('assetInsights.sheet.readOnly')}
        </span>
      </div>

      {range && (
        <div className="flex items-center justify-between gap-4 border-l-3 border-warning bg-warning/10 px-4 py-2.5 text-sm">
          <span className="text-secondary-foreground">
            <span className="font-medium text-foreground">
              {t('assetInsights.sheet.citedRange', {
                from: range.from,
                to: range.to,
              })}
            </span>
            {range.by &&
              ` ${t('assetInsights.sheet.citedBy', { idea: range.by })}`}
          </span>
          <button
            type="button"
            onClick={onClearCited}
            className="shrink-0 cursor-pointer font-medium text-accent hover:underline"
          >
            {t('assetInsights.sheet.clear')}
          </button>
        </div>
      )}

      {sheet.rows.length === 0 ? (
        <p className="text-sm text-tertiary-foreground">
          {hasMore
            ? t('assetInsights.sheet.notLoaded')
            : t('assetInsights.sheet.empty')}
        </p>
      ) : (
        <div className="max-h-[70vh] overflow-auto rounded-md border border-quaternary">
          <table className="min-w-full border-collapse text-sm">
            <thead className="sticky top-0 z-10 bg-secondary">
              <tr>
                <th
                  scope="col"
                  className="sticky left-0 z-10 w-12 bg-secondary px-3 py-2.5 text-center text-xs font-semibold text-tertiary-foreground"
                >
                  #
                </th>
                {columns.map((column) => (
                  <th
                    key={column}
                    scope="col"
                    className="whitespace-nowrap px-3 py-2.5 text-left text-xs font-semibold text-secondary-foreground"
                  >
                    {column}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sheet.rows.map((row, i) => {
                const hot = range !== null && inRange(row, range)
                return (
                  <Row
                    key={i}
                    row={row}
                    columns={columns}
                    hot={hot}
                    rowRef={i === firstCited ? firstCitedRef : undefined}
                  />
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex items-center justify-between gap-4">
        <p className="text-xs text-tertiary-foreground">
          {sheet.rowCount !== null
            ? t('assetInsights.sheet.showing', {
                shown: formatNumber(sheet.rows.length, {}, i18n.language),
                total: formatNumber(sheet.rowCount, {}, i18n.language),
              })
            : t('assetInsights.sheet.loaded', {
                count: sheet.rows.length,
                shown: formatNumber(sheet.rows.length, {}, i18n.language),
              })}
        </p>
        {hasMore && (
          <Button
            variant="outline"
            className="uppercase"
            onClick={onLoadMore}
            loading={loadingMore}
          >
            {t('assetInsights.sheet.loadMore')}
          </Button>
        )}
      </div>
    </div>
  )
}

function Row({
  row,
  columns,
  hot,
  rowRef,
}: {
  row: SheetRow
  columns: string[]
  hot: boolean
  rowRef?: Ref<HTMLTableRowElement>
}) {
  return (
    <tr
      ref={rowRef}
      className={cn(
        'border-t border-quaternary',
        hot ? 'bg-warning/10' : 'hover:bg-secondary',
      )}
    >
      <td
        className={cn(
          'sticky left-0 px-3 py-2 text-center text-xs tabular-nums text-tertiary-foreground',
          hot ? 'border-l-3 border-warning bg-primary' : 'bg-primary',
        )}
      >
        {row.row ?? ''}
      </td>
      {row.cells === null ? (
        // A line that would not split into fields: shown as it is stored,
        // rather than spread across columns it may not belong to.
        <td
          colSpan={columns.length}
          className="px-3 py-2 text-secondary-foreground"
        >
          {row.raw}
        </td>
      ) : (
        columns.map((column) => {
          const value = row.cells?.[column] ?? ''
          return (
            <td
              key={column}
              className={cn(
                'whitespace-nowrap px-3 py-2 text-foreground',
                isNumericCell(value) && 'text-right tabular-nums',
              )}
            >
              {value}
            </td>
          )
        })
      )}
    </tr>
  )
}
