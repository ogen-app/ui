import { cn } from '@/lib'
import type { ValidationSeverity } from '@/types/validation'

// Severity-driven status dot. Color is driven entirely by the
// SEVERITY_DOT map, so adding a new severity (e.g. 'info') is a
// one-line change here plus the union in types/validation.ts.
const SEVERITY_DOT: Record<ValidationSeverity, string> = {
  error: 'bg-destructive', // red
  warning: 'bg-chart-5', // amber/yellow
}

type IndicatorProps = {
  severity: ValidationSeverity
  // Optional badge count; when omitted (or <= 1) a plain dot renders.
  count?: number
  className?: string
}

export function Indicator({ severity, count, className }: IndicatorProps) {
  const showCount = typeof count === 'number' && count > 1
  return (
    <span
      aria-hidden
      className={cn(
        'flex items-center justify-center rounded-full text-white',
        showCount
          ? 'min-w-3.5 h-3.5 px-1 text-[9px] font-semibold leading-none'
          : 'size-2',
        SEVERITY_DOT[severity],
        className,
      )}
    >
      {showCount ? count : null}
    </span>
  )
}
