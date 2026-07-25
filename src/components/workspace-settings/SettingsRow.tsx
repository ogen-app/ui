import { useId, type ReactNode } from 'react'
import { PencilSimpleIcon } from '@phosphor-icons/react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

type SettingsRowProps = {
  title: ReactNode
  badges?: ReactNode
  actions?: ReactNode
  description?: ReactNode
  children?: ReactNode
}

/**
 * The shared card layout for a workspace-settings row: title + badges on the
 * left, actions on the right, then an optional description and body.
 */
export function SettingsRow({
  title,
  badges,
  actions,
  description,
  children,
}: SettingsRowProps) {
  return (
    <li className="bg-primary px-6 py-5 flex flex-col gap-3 min-w-0">
      <div className="flex items-center justify-between gap-4 min-w-0">
        <div className="flex items-center gap-3 min-w-0">
          <h3 className="text-base font-medium">{title}</h3>
          {badges}
        </div>
        {actions && <div className="flex items-center gap-1 shrink-0">{actions}</div>}
      </div>
      {description && (
        <div className="max-w-150 flex flex-col gap-1 text-sm text-tertiary-foreground min-w-0">
          {description}
        </div>
      )}
      {children}
    </li>
  )
}

/** The corner pencil every settings row uses to open its edit modal. */
export function EditIconButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="smIcon"
      onClick={onClick}
      aria-label={label}
      title={label}
    >
      <PencilSimpleIcon className="size-5" weight="regular" />
    </Button>
  )
}

/** A labeled, non-editable value rendered as a disabled input. */
export function ReadOnlyField({
  label,
  value,
}: {
  label: string
  value: string | undefined
}) {
  const text = value?.trim() ?? ''
  const id = useId()
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} value={text} readOnly disabled placeholder="—" title={text || undefined} />
    </div>
  )
}
