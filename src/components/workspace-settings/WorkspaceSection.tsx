import { memo, useCallback, useId, useState } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { TextSelect } from '@/components/ui/text-select'
import { SettingsCard } from '@/components/settings/SettingsCard'
import { useRegisterSettingsSave } from '@/components/settings/settingsSave'
import { useActiveWorkspace, useUpdateWorkspace } from '@/hooks/useWorkspaces'
import { currentTimeIn, timezoneLabel, timezoneList } from '@/lib/timezones'
import { ROLE_LABELS, type Workspace } from '@/types/workspace'
import { ReadOnlyField, SettingsRow } from './SettingsRow'

/**
 * The current workspace's own settings: name, time zone, slug.
 *
 * Both editable fields register with the page-level save context rather than
 * submitting themselves, so one Save button covers the card — the same
 * arrangement the campaign settings use.
 */
function WorkspaceSectionComponent() {
  const workspace = useActiveWorkspace()

  return (
      <SettingsCard>
        {!workspace ? (
          <p className="text-sm text-tertiary-foreground">Loading…</p>
        ) : (
          <ul className="flex flex-col">
            {/* No card h2 — the row title doubles as the section heading. */}
            <SettingsRow
              title={`${workspace.name} Workspace`}
              badges={
                <span className="text-xs text-tertiary-foreground">
                  You are {ROLE_LABELS[workspace.role].toLowerCase()}
                </span>
              }
            >
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-5">
                <NameField workspace={workspace} />
                <TimezoneField workspace={workspace} />
                <ReadOnlyField label="Slug" value={workspace.slug} />
              </div>
            </SettingsRow>
          </ul>
        )}
      </SettingsCard>
  )
}

/** Inline-editable name. Edits mark the page dirty; the header's Save persists them. */
function NameField({ workspace }: { workspace: Workspace }) {
  const id = useId()
  // null = pristine; reseeds from the freshest workspace after every save.
  const [draft, setDraft] = useState<string | null>(null)
  const value = draft ?? workspace.name
  const trimmed = value.trim()
  const invalid = trimmed.length === 0
  const dirty = !invalid && trimmed !== workspace.name
  const readOnly = workspace.role === 'member'

  const { mutateAsync: update } = useUpdateWorkspace(workspace.id)
  const save = useCallback(
    () => update({ name: trimmed }).then(() => setDraft(null)),
    [update, trimmed],
  )
  useRegisterSettingsSave('workspace-name', dirty, save)

  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>Workspace name</Label>
      <Input
        id={id}
        value={value}
        onChange={(e) => setDraft(e.target.value)}
        aria-invalid={invalid}
        disabled={readOnly}
      />
      {invalid && <p className="text-xs text-destructive">Name can’t be empty</p>}
    </div>
  )
}

/**
 * The workspace time zone (CON-94).
 *
 * Instants are stored in UTC; this is the wall-clock everything in the
 * workspace is written and read against — the calendar's day boundaries, the
 * scheduler's picker, and the assistant resolving "tomorrow at 9am". Two
 * workspaces on different continents is the whole reason it is per-workspace
 * and not per-user.
 */
function TimezoneField({ workspace }: { workspace: Workspace }) {
  const id = useId()
  const [draft, setDraft] = useState<string | null>(null)
  const value = draft ?? workspace.timezone
  const dirty = value !== workspace.timezone
  const readOnly = workspace.role === 'member'

  const { mutateAsync: update } = useUpdateWorkspace(workspace.id)
  const save = useCallback(
    () => update({ timezone: value }).then(() => setDraft(null)),
    [update, value],
  )
  useRegisterSettingsSave('workspace-timezone', dirty, save)

  const now = currentTimeIn(value)

  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>Time zone</Label>
      <TextSelect
        id={id}
        value={value}
        onValueChange={setDraft}
        disabled={readOnly}
        elements={timezoneList().map((z) => ({ id: z, displayValue: timezoneLabel(z) }))}
        className="w-full"
      />
      <p className="text-xs text-tertiary-foreground">
        {now ? `It is ${now} there now. ` : ''}
        Schedules are shown and entered in this zone.
      </p>
    </div>
  )
}

export const WorkspaceSection = memo(WorkspaceSectionComponent)
