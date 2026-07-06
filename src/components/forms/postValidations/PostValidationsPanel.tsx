import { RailPanel } from '@/components/page-primitives/RailPanel'
import { StatusBadge, type StatusTone } from '@/components/ui/status-badge'
import type {
  ValidationCheck,
  ValidationLevel,
  ValidationReport,
} from '@/types/validation'

const LEVEL_TONE: Record<ValidationLevel, StatusTone> = {
  pass: 'positive',
  warning: 'warn',
  error: 'destructive',
  pending: 'warn',
}

const LEVEL_LABEL: Record<ValidationLevel, string> = {
  pass: 'Met',
  warning: 'Warning',
  error: 'Not met',
  pending: 'Pending',
}

type Props = {
  report: ValidationReport
  onClose?: () => void
}

export function PostValidationsPanel({ report, onClose }: Props) {
  const { checks, overall } = report

  const summary =
    overall === 'pass'
      ? 'All requirements met'
      : overall === 'error'
        ? `${checks.filter((c) => c.level === 'error').length} requirement(s) not met`
        : 'Some requirements need attention'

  return (
    <RailPanel title="Validations" onClose={onClose}>
      <p className="text-sm text-tertiary-foreground">{summary}</p>

      {checks.length === 0 ? (
        <p className="text-sm text-tertiary-foreground">
          No checkable requirements for this platform and post type yet.
        </p>
      ) : (
        <div className="flex flex-col">
          {checks.map((check) => (
            <CheckRow key={check.id} check={check} />
          ))}
        </div>
      )}
    </RailPanel>
  )
}

function CheckRow({ check }: { check: ValidationCheck }) {
  return (
    <div className="flex flex-col gap-0.5 py-2.5">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm text-foreground">{check.label}</span>
        <StatusBadge tone={LEVEL_TONE[check.level]} label={LEVEL_LABEL[check.level]} />
      </div>
      {check.detail && (
        <span className="text-xs text-tertiary-foreground">{check.detail}</span>
      )}
    </div>
  )
}
