import { memo } from 'react'
import { cn } from '@/lib'

// Text display cell
type TextCellProps = {
  value: string | null
  className?: string
}

export const TextCell = memo(function TextCell({
  value,
  className,
}: TextCellProps) {
  const isFilled = value !== null && value !== ''

  return (
    <span
      className={cn(
        'table-text',
        !isFilled && 'text-tertiary-foreground',
        className,
      )}
    >
      {isFilled ? value : '—'}
    </span>
  )
})

type FooterCellProps = {
  value: string | null
  className?: string
}
export const FooterCell = memo(function FooterCell({
  value,
  className,
}: FooterCellProps) {
  return (
    <span className={cn('table-text text-tertiary-foreground', className)}>
      {value}
    </span>
  )
})
