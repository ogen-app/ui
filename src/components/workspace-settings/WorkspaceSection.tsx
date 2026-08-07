import { memo, useCallback, useId, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { Tenant } from '@/types/tenant'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useCurrentTenant, useRenameTenant } from '@/hooks/useTenant'
import { SettingsCard } from '@/components/settings/SettingsCard'
import { useRegisterSettingsSave } from '@/components/settings/settingsSave'
import { ReadOnlyField, SettingsRow } from './SettingsRow'

/**
 * The tenant (organization) settings — CON-97. The name is edited inline;
 * the change is applied by the page header's Save button once dirty. The
 * slug is assigned at signup and stable across renames, so it is never
 * editable.
 */
function WorkspaceSectionComponent() {
  const { t } = useTranslation()
  const { data: tenant, isLoading, isError } = useCurrentTenant()

  return (
    <SettingsCard>
      {isLoading ? (
        <p className="text-sm text-tertiary-foreground">{t('common.loading')}</p>
      ) : isError || !tenant ? (
        <p className="text-sm text-destructive">
          {t('workspaceSettings.workspace.loadFailed')}
        </p>
      ) : (
        <ul className="flex flex-col">
          {/* No card h2 here — the row title doubles as the section heading,
              e.g. "BN Digital Workspace". The whole phrase is one key: the
              name does not sit in the same place in every language. */}
          <SettingsRow title={t('workspaceSettings.workspace.rowTitle', { name: tenant.name })}>
            {/* Same two-column body as the platform rows, so the fields line
                up and stretch across the card. */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-5">
              <NameField tenant={tenant} />
              <ReadOnlyField
                label={t('workspaceSettings.workspace.slugLabel')}
                value={tenant.slug}
              />
            </div>
          </SettingsRow>
        </ul>
      )}
    </SettingsCard>
  )
}

/**
 * Inline-editable organization name. No per-field submit — edits register as
 * dirty with the page-level save context and are persisted by the header's
 * Save button.
 */
function NameField({ tenant }: { tenant: Tenant }) {
  const { t } = useTranslation()
  const id = useId()
  // null = pristine; reseeds from the freshest tenant after every save.
  const [draft, setDraft] = useState<string | null>(null)
  const value = draft ?? tenant.name
  const trimmed = value.trim()
  const invalid = trimmed.length === 0
  const dirty = !invalid && trimmed !== tenant.name

  const { mutateAsync: rename } = useRenameTenant()
  const save = useCallback(
    () => rename({ id: tenant.id, name: trimmed }).then(() => setDraft(null)),
    [rename, tenant.id, trimmed]
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
