import { useState } from 'react'
import {
  CaretDownIcon,
  CheckCircleIcon,
  CircleDashedIcon,
  WarningCircleIcon,
  XCircleIcon,
} from '@phosphor-icons/react'
import { cn } from '@/lib'
import { worstStatus, type CheckStatus, type PostCheck } from '@/lib/postValidation'

type Props = {
  checks: PostCheck[]
  className?: string
}

/**
 * The pre-publish checklist, between the quick-settings bar and the post
 * itself. Everything here mirrors a rule the server enforces (post-type
 * structure, platform media constraints) plus the character limits the
 * front end still owns — see `lib/postValidation.ts`.
 *
 * Collapsed by default once everything passes: a green line is all the
 * user needs. Anything failing or warning is summarised in the header, and
 * the list opens on click.
 */
export function PostValidationsSection({ checks, className }: Props) {
  const overall = worstStatus(checks)
  const failing = checks.filter((c) => c.status === 'fail')
  const warning = checks.filter((c) => c.status === 'warn')
  const [open, setOpen] = useState(false)

  return (
    <div className={cn('w-full bg-primary px-10 py-3', className)}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center gap-2 text-left text-sm cursor-pointer"
      >
        <StatusIcon status={overall} />
        <span className="min-w-0 flex-1 truncate">
          {summary(overall, failing.length, warning.length)}
        </span>
        <span className="text-xs text-tertiary-foreground">
          {open ? 'Hide checks' : 'Show checks'}
        </span>
        <CaretDownIcon
          className={cn(
            'size-3.5 shrink-0 text-tertiary-foreground transition-transform',
            open && 'rotate-180',
          )}
        />
      </button>

      <div
        className={cn(
          'grid transition-[grid-template-rows] duration-200 ease-out',
          open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]',
        )}
      >
        <div className="overflow-hidden">
          <ul className="flex flex-col gap-1.5 pt-3">
            {checks.map((check) => (
              <li key={check.id} className="flex items-start gap-2 text-sm">
                <StatusIcon status={check.status} className="mt-0.5" />
                <span className="text-foreground">{check.label}</span>
                {check.detail && (
                  <span
                    className={cn(
                      'min-w-0 flex-1',
                      check.status === 'fail'
                        ? 'text-destructive'
                        : check.status === 'warn'
                          ? 'text-warning'
                          : 'text-tertiary-foreground',
                    )}
                  >
                    {check.detail}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}

function summary(overall: CheckStatus, failing: number, warning: number): string {
  if (overall === 'pending') return 'Checking this post…'
  if (failing > 0) {
    const rest = warning > 0 ? `, ${warning} to look at` : ''
    return `${failing} thing${failing === 1 ? '' : 's'} to fix before publishing${rest}`
  }
  if (warning > 0) {
    return `Ready to publish · ${warning} thing${warning === 1 ? '' : 's'} to look at`
  }
  return 'Everything checks out'
}

function StatusIcon({
  status,
  className,
}: {
  status: CheckStatus
  className?: string
}) {
  const shared = cn('size-4 shrink-0', className)
  switch (status) {
    case 'fail':
      return <XCircleIcon weight="fill" className={cn(shared, 'text-destructive')} />
    case 'warn':
      return <WarningCircleIcon weight="fill" className={cn(shared, 'text-warning')} />
    case 'pending':
      return (
        <CircleDashedIcon className={cn(shared, 'text-tertiary-foreground animate-spin')} />
      )
    default:
      return (
        <CheckCircleIcon weight="fill" className={cn(shared, 'text-tertiary-foreground')} />
      )
  }
}
