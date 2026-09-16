import type { ColumnConfig } from './types'

/**
 * Calculate totals based on column configuration
 */
export function calculateTotal<TData extends Record<string, unknown>>(
  rows: TData[],
  config: ColumnConfig<TData>,
): unknown {
  if (!config.totals) return ''

  const { type, customCalculation } = config.totals

  if (type === 'custom' && customCalculation) {
    return customCalculation(rows)
  }

  const values = rows.map((row) => {
    const value = config.accessorKey
      ? (row as Record<string, unknown>)[config.accessorKey as string]
      : config.accessorFn?.(row)
    return typeof value === 'number' ? value : 0
  })

  switch (type) {
    case 'sum':
      return values.reduce((sum, val) => sum + val, 0)
    case 'average':
      return values.length > 0
        ? values.reduce((sum, val) => sum + val, 0) / values.length
        : 0
    case 'count':
      return rows.length
    default:
      return ''
  }
}

/**
 * `01 Aug 26` — a date in a table.
 *
 * Pinned to en-GB rather than the browser's locale: day-first is the format
 * asked for, and an en-US visitor would otherwise read "Aug 01, 26". The app
 * has no date-format convention yet and the tables are where two of them met —
 * settled here, once, so a stamp means the same thing in every column of every
 * table rather than per file.
 *
 * Returns null for a date that isn't set or can't be read, so a cell decides
 * for itself what an unset date should say.
 */
export function tableDate(value: string | null | undefined): string | null {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: '2-digit',
  })
}
