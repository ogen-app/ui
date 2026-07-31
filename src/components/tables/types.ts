import type { ReactNode } from 'react'
import type { SortingState } from '@tanstack/react-table'

// Totals configuration for columns
export type TotalsConfig<T> = {
  type: 'sum' | 'average' | 'count' | 'custom'
  formatter?: (value: number) => string
  customCalculation?: (rows: T[]) => unknown
  showInTotalsRow?: boolean
}

// Base column configuration interface
export type ColumnConfig<T> = {
  id: string
  accessorKey?: keyof T | string
  accessorFn?: (row: T) => unknown
  header: string | (() => ReactNode)
  size?: number
  maxSize?: number
  minSize?: number
  isAutoSize?: boolean
  alignment?: 'left' | 'right'
  borderSide?: 'left' | 'right' | 'both'
  cell?: (value: unknown, row: T) => ReactNode
  sortable?: boolean
  sortUndefined?: 'first' | 'last' | false
  isSticky?: boolean
  stickyPosition?: 'left' | 'right' // NEW: specify which side for sticky
  /**
   * The column holds row controls rather than data — a delete button, a
   * checkbox. Skeleton rows leave it blank, since there is no content coming
   * that a placeholder bar would be standing in for.
   */
  isControl?: boolean
  totals?: TotalsConfig<T>
  cellClassName?: string
}

// Virtual table specific props
export type VirtualTableProps<TData extends Record<string, unknown>> = {
  data: TData[]
  columnConfigs: ColumnConfig<TData>[]
  activeColumns: string[]
  className?: string
  initialSorting?: SortingState
  enableFiltering?: boolean
  enableGlobalFilter?: boolean
  estimatedRowHeight?: number
  overscan?: number
  showFooter?: boolean
  fillHeight?: boolean
  emptyStateMessage?: string
  emptyStateActionLabel?: string
  onEmptyStateAction?: () => void
  /**
   * Rows haven't arrived yet. The header and its column widths are the real
   * ones, so the table doesn't move when they do — and the empty state is
   * held back, since "no rows yet" and "no rows" are different answers.
   */
  loading?: boolean
}
