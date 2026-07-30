import { cn } from '@/lib'

export type StatusTone =
  | 'neutral'
  | 'positive'
  | 'negative'
  | 'destructive'
  /** Work in flight and on track. */
  | 'progress'
  /** Waiting on a person, with nothing wrong. */
  | 'attention'
  /** Something is off but not broken — degraded, disabled, inactive. */
  | 'warn'

const TONE_DOT: Record<StatusTone, string> = {
  neutral: 'bg-tertiary-foreground',
  positive: 'bg-positive',
  negative: 'bg-negative',
  destructive: 'bg-destructive',
  progress: 'bg-info',
  attention: 'bg-attention',
  // The one orange left in the status vocabulary, and it now points at the
  // warning token itself rather than a chart colour that happened to be
  // near it.
  warn: 'bg-warning',
}

type Props = {
  label: string
  tone: StatusTone
  className?: string
}

export function StatusBadge({ label, tone, className }: Props) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 text-xs text-tertiary-foreground',
        className,
      )}
    >
      <span className={cn('size-1.5 rounded-full shrink-0', TONE_DOT[tone])} />
      <span>{label}</span>
    </span>
  )
}
