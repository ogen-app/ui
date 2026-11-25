import { memo, useCallback, useId, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { ArrowDataTransferHorizontalIcon } from '@hugeicons/core-free-icons'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import { useRegisterSettingsSave } from '@/components/settings/settingsSave'
import { useWorkspace, useUpdateWorkspace } from '@/hooks/useWorkspaces'
import { canManageWorkspace, type Workspace } from '@/types/workspace'
import { ReadOnlyField } from './SettingsRow'

/**
 * The current workspace's own settings: name and slug.
 *
 * The name registers with the page-level save context rather than submitting
 * itself, so one Save button covers the card — the same arrangement the
 * campaign settings use.
 */
function WorkspaceSectionComponent() {
  const { t } = useTranslation()
  const workspace = useWorkspace()
  const navigate = useNavigate()

  // Every card has a title, and this one's is the workspace's own name — so
  // until the workspace is read, the title says that it is being read.
  if (!workspace) return <Card title={t('common.loading')} capped />

  return (
    // The workspace's name is the heading, e.g. "BN Digital Workspace". The
    // whole phrase is one key: the name does not sit in the same place in
    // every language.
    <Card
      title={t('workspaceSettings.workspace.rowTitle', {
        name: workspace.name,
      })}
      // The way out of this card: everything in it describes one workspace,
      // so the other ones belong behind a single move.
      action={{
        label: t('workspaceSettings.workspace.switch'),
        icon: ArrowDataTransferHorizontalIcon,
        onClick: () => void navigate({ to: '/workspaces' }),
      }}
      capped
    >
      {/* Same two-column body as the platform rows, so the fields line up
          and stretch across the card: the name and the slug it was made
          from, side by side. */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-5">
        <NameField workspace={workspace} />
        <ReadOnlyField
          label={t('workspaceSettings.workspace.slugLabel')}
          value={workspace.slug}
          description={t('workspaceSettings.workspace.slugNote')}
        />
      </div>
    </Card>
  )
}

/** Inline-editable name. Edits mark the page dirty; the page's Save persists them. */
function NameField({ workspace }: { workspace: Workspace }) {
  const { t } = useTranslation()
  const id = useId()
  // null = pristine; reseeds from the freshest workspace after every save.
  const [draft, setDraft] = useState<string | null>(null)
  const value = draft ?? workspace.name
  const trimmed = value.trim()
  const invalid = trimmed.length === 0
  const dirty = !invalid && trimmed !== workspace.name
  const readOnly = !canManageWorkspace(workspace.role)

  const { mutateAsync: update } = useUpdateWorkspace(workspace.id)
  const save = useCallback(
    () => update({ name: trimmed }).then(() => setDraft(null)),
    [update, trimmed],
  )
  useRegisterSettingsSave('workspace-name', dirty, save)

  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{t('workspaceSettings.workspace.nameLabel')}</Label>
      <Input
        id={id}
        value={value}
        onChange={(e) => setDraft(e.target.value)}
        aria-invalid={invalid}
        disabled={readOnly}
      />
      {invalid && (
        <p className="text-xs text-destructive">
          {t('workspaceSettings.workspace.nameEmpty')}
        </p>
      )}
    </div>
  )
}

export const WorkspaceSection = memo(WorkspaceSectionComponent)
