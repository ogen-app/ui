import { memo, useCallback, useId, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { ArrowsLeftRightIcon } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { SettingsCard } from '@/components/settings/SettingsCard'
import { useRegisterSettingsSave } from '@/components/settings/settingsSave'
import { useWorkspace, useUpdateWorkspace } from '@/hooks/useWorkspaces'
import { canManageWorkspace, type Workspace } from '@/types/workspace'
import { ReadOnlyField, SettingsRow } from './SettingsRow'

/**
 * The current workspace's own settings: name, slug, time zone.
 *
 * The name registers with the page-level save context rather than submitting
 * itself, so one Save button covers the card — the same arrangement the
 * campaign settings use.
 */
function WorkspaceSectionComponent() {
  const { t } = useTranslation()
  const workspace = useWorkspace()
  const navigate = useNavigate()

  return (
    <SettingsCard>
      {!workspace ? (
        <p className="text-sm text-tertiary-foreground">{t('common.loading')}</p>
      ) : (
        <ul className="flex flex-col">
          {/* No card h2 here — the row title doubles as the section heading,
              e.g. "BN Digital Workspace". The whole phrase is one key: the
              name does not sit in the same place in every language. */}
          <SettingsRow
            title={t('workspaceSettings.workspace.rowTitle', { name: workspace.name })}
            actions={
              // The way out of this card: everything in it describes one
              // workspace, so the other ones belong behind a single move.
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => navigate({ to: '/workspaces' })}
              >
                <ArrowsLeftRightIcon />
                <span>{t('workspaceSettings.workspace.switch')}</span>
              </Button>
            }
          >
            <div className="flex flex-col gap-5">
              {/* Same two-column body as the platform rows, so the fields line
                  up and stretch across the card. */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-8">
                <NameField workspace={workspace} />
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-5">
                <ReadOnlyField
                  label={t('workspaceSettings.workspace.slugLabel')}
                  value={workspace.slug}
                  description={t('workspaceSettings.workspace.slugNote')}
                />
                {/* Not a control yet, and shown rather than hidden because
                    "what time zone am I scheduling in" is a question the
                    calendar makes people ask. */}
                <ReadOnlyField
                  label={t('workspaceSettings.workspace.timeZoneLabel')}
                  value="UTC"
                  description={t('workspaceSettings.workspace.timeZoneNote')}
                />
              </div>
            </div>
          </SettingsRow>
        </ul>
      )}
    </SettingsCard>
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
