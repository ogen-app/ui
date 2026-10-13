import { useTranslation } from 'react-i18next'
import { cn } from '@/lib'
import { columnLetter, sheetColumns, type Sheet } from '@/lib/sheetChunks'

/** How much of the first sheet the stage draws. */
const STAGE_COLUMNS = 5
const STAGE_ROWS = 6

/**
 * A spreadsheet's picture (CON-366 §5.4): the top-left corner of its first
 * sheet as a grid — column letters, row numbers, the header bold — fading out
 * where the sheet goes on, with the workbook's sheet tabs under it.
 *
 * Drawn from the first loaded rows, else the summary's sample rows, so it
 * appears as soon as the first page of chunks does. A sheet tab opens Source
 * on that sheet.
 */
export function SheetStage({
  sheets,
  fallbackName,
  onOpenSheet,
}: {
  sheets: Sheet[]
  fallbackName: string
  onOpenSheet: (name: string) => void
}) {
  const { t } = useTranslation()
  const [first] = sheets
  const columns = sheetColumns(first).slice(0, STAGE_COLUMNS)
  const rows = (first.rows.length > 0 ? first.rows : first.samples).slice(
    0,
    STAGE_ROWS,
  )
  const headerRow = first.headerRow ?? 1

  return (
    <div className="flex w-full flex-col border-b border-quaternary bg-primary">
      <div className="relative overflow-hidden px-5 pt-6" aria-hidden>
        <table className="w-full table-fixed border-collapse text-[11px]">
          <thead>
            <tr className="bg-secondary text-secondary-foreground">
              <th className="w-7 border border-quaternary" />
              {columns.map((_, i) => (
                <th
                  key={i}
                  className="border border-quaternary py-1 font-medium"
                >
                  {columnLetter(i)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              <RowNumber n={headerRow} />
              {columns.map((column) => (
                <td
                  key={column}
                  className="truncate border border-quaternary px-1.5 py-1 font-semibold text-foreground"
                >
                  {column}
                </td>
              ))}
            </tr>
            {rows.map((row, i) => (
              <tr key={i}>
                <RowNumber n={row.row} />
                {columns.map((column) => (
                  <td
                    key={column}
                    className="truncate border border-quaternary px-1.5 py-1 text-secondary-foreground"
                  >
                    {row.cells?.[column] ?? ''}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {/* The sheet goes on past what is drawn. */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-linear-to-b from-transparent to-primary" />
      </div>
      <div
        className="flex gap-1 overflow-x-auto border-t border-quaternary px-5"
        role="list"
      >
        {sheets.map((sheet, i) => (
          <button
            key={sheet.name}
            type="button"
            role="listitem"
            onClick={() => onOpenSheet(sheet.name)}
            aria-label={t('assetInsights.sheet.open', {
              name: sheet.name || fallbackName,
            })}
            className={cn(
              'shrink-0 cursor-pointer border-b-2 px-3 py-2 text-xs font-medium',
              i === 0
                ? 'border-accent bg-secondary text-foreground'
                : 'border-transparent text-secondary-foreground hover:text-foreground',
            )}
          >
            {sheet.name || fallbackName}
          </button>
        ))}
      </div>
    </div>
  )
}

function RowNumber({ n }: { n: number | null }) {
  return (
    <td className="border border-quaternary bg-secondary py-1 text-center text-secondary-foreground tabular-nums">
      {n ?? ''}
    </td>
  )
}
