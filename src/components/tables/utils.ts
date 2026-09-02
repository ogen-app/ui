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
