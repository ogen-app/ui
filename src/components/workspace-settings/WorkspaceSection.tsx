import { memo, useId, useState, type FormEvent } from 'react'
import { PencilSimpleIcon } from '@phosphor-icons/react'
import type { Tenant } from '@/types/tenant'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ModalContainer } from '@/components/ui/modal'
import { useCurrentTenant, useRenameTenant } from '@/hooks/useTenant'
import { ReadOnlyField, SettingsRow } from './SettingsRow'

/**
 * The tenant (organization) settings — CON-97. The row shows the workspace
 * identity read-only; editing happens in a modal behind the corner pencil,
 * mirroring the platform rows. The slug is assigned at signup and stable
 * across renames, so it is never editable.
 */
function WorkspaceSectionComponent() {
  const { data: tenant, isLoading, isError } = useCurrentTenant()

  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-xl font-display font-medium tracking-tight">Workspace</h2>
      {isLoading ? (
        <div className="bg-primary px-6 py-5 text-sm text-tertiary-foreground">Loading…</div>
      ) : isError || !tenant ? (
        <div className="bg-primary px-6 py-5 text-sm text-destructive">
          Failed to load the workspace.
        </div>
      ) : (
        <ul className="flex flex-col gap-4">
          <SettingsRow title={tenant.name} actions={<WorkspaceEditIconButton tenant={tenant} />}>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-4 max-w-150">
              <ReadOnlyField label="Organization name" value={tenant.name} />
              <ReadOnlyField label="Slug" value={tenant.slug} />
            </div>
          </SettingsRow>
        </ul>
      )}
    </section>
  )
}

function WorkspaceEditIconButton({ tenant }: { tenant: Tenant }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="smIcon"
        onClick={() => setOpen(true)}
        aria-label="Edit workspace"
        title="Edit workspace"
      >
        <PencilSimpleIcon className="size-3.5" />
      </Button>
      <ModalContainer
        isOpen={open}
        onClose={() => setOpen(false)}
        title="Workspace settings"
        size="default"
      >
        {/* The modal unmounts when closed, so the form reseeds from the
            freshest tenant on every open. */}
        <RenameForm tenant={tenant} onClose={() => setOpen(false)} />
      </ModalContainer>
    </>
  )
}

function RenameForm({ tenant, onClose }: { tenant: Tenant; onClose: () => void }) {
  const nameId = useId()
  const slugId = useId()
  const [name, setName] = useState(tenant.name)
  const { mutate: rename, isPending, error, reset } = useRenameTenant()

  const trimmed = name.trim()
  const dirty = trimmed !== tenant.name
  const invalid = dirty && trimmed.length === 0

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (!dirty || invalid || isPending) return
    rename({ id: tenant.id, name: trimmed }, { onSuccess: onClose })
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={nameId}>Organization name</Label>
        <Input
          id={nameId}
          value={name}
          onChange={(e) => {
            setName(e.target.value)
            if (error) reset()
          }}
          aria-invalid={invalid}
          disabled={isPending}
          autoFocus
        />
        {invalid ? (
          <p className="text-xs text-destructive">Name can’t be empty</p>
        ) : error ? (
          <p className="text-xs text-destructive">{error.message}</p>
        ) : null}
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={slugId}>Slug</Label>
        <Input id={slugId} value={tenant.slug} readOnly disabled />
        <p className="text-xs text-tertiary-foreground">
          Assigned at signup and can’t be changed.
        </p>
      </div>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onClose} disabled={isPending}>
          Cancel
        </Button>
        <Button type="submit" loading={isPending} disabled={!dirty || invalid || isPending}>
          Save
        </Button>
      </div>
    </form>
  )
}

export const WorkspaceSection = memo(WorkspaceSectionComponent)
