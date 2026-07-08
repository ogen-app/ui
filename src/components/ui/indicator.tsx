import { cn } from '@/lib'
import { TONE_DOT, type StatusTone } from '@/components/ui/status-badge'

type IndicatorProps = {
  tone: StatusTone
  className?: string
}

/** Small status dot, e.g. overlaid on a rail button. Colors follow StatusBadge tones. */
export function Indicator({ tone, className }: IndicatorProps) {
  return (
    <span
      aria-hidden
      className={cn('size-2 rounded-full', TONE_DOT[tone], className)}
    />
  )
}
