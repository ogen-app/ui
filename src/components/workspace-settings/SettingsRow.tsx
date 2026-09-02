import { useId, type ReactNode } from 'react'
import { LockSimpleIcon } from '@phosphor-icons/react'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

type SettingsRowProps = {
  /** Omit for a row whose body already identifies itself. */
  title?: ReactNode
  badges?: ReactNode
  actions?: ReactNode
  description?: ReactNode
  children?: ReactNode
}

/**
 * One row inside a SettingsCard: title + badges on the left, actions on the
 * right, then an optional description and body. Rows carry no surface of
 * their own — the parent card does — and rely on the list's `divide-y` for
 * separation when stacked.
 */
export function SettingsRow({
  title,
  badges,
  actions,
  description,
  children,
}: SettingsRowProps) {
  const hasHeader = Boolean(title || badges || actions)
  return (
    <li className="pt-6 pb-10 first:pt-0 last:pb-0 flex flex-col gap-5 min-w-0">
      {hasHeader && (
        <div className="flex items-center justify-between gap-4 min-w-0">
          <div className="flex items-center gap-3 min-w-0">
            {title && <h3 className="text-base font-medium">{title}</h3>}
            {badges}
          </div>
          {actions && (
            <div className="flex items-center gap-1 shrink-0">{actions}</div>
          )}
        </div>
      )}
      {description && (
        <div className="max-w-150 flex flex-col gap-1 text-sm text-tertiary-foreground min-w-0">
          {description}
        </div>
      )}
      {children}
    </li>
  )
}

/** A labeled, non-editable value rendered as a disabled input. */
export function ReadOnlyField({
  label,
  value,
  description,
  placeholder = '—',
}: {
  label: string
  value: string | undefined
  /** One line under the field — why it can't be edited, usually. */
  description?: string
  /** Shown when there is no value — say what the emptiness means. */
  placeholder?: string
}) {
  const text = value?.trim() ?? ''
  const id = useId()
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <Input
          id={id}
          value={text}
          readOnly
          disabled
          placeholder={placeholder}
          title={text || undefined}
          className="pr-10"
        />
        <LockSimpleIcon
          weight="regular"
          aria-hidden
          className="size-4 text-tertiary-foreground absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none"
        />
      </div>
      {description && (
        <p className="text-xs text-tertiary-foreground">{description}</p>
      )}
    </div>
  )
}
