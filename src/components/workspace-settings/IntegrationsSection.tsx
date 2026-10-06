import { memo, useState } from 'react'
import { Trans, useTranslation } from 'react-i18next'
import { ArrowSquareOutIcon, FigmaLogoIcon } from '@phosphor-icons/react'

import { SettingsCard } from '@/components/settings/SettingsCard'
import { Button } from '@/components/ui/button'
import { useFigmaConnections } from '@/hooks/useFigmaIntegration'
import { useLocale } from '@/hooks/useLocale'
import { useWorkspace } from '@/hooks/useWorkspaces'
import { awaiting } from '@/lib/fetched'
import { formatDate } from '@/lib/intl'
import { canManageWorkspace } from '@/types/workspace'
import type { PluginConnection } from '@/types/integrations'
import { DisconnectFigmaDialog } from './DisconnectFigmaDialog'
import { SettingsRow } from './SettingsRow'

/**
 * The plugin's Figma Community page. Null until it is published (CON-341) —
 * and while it is null the link is not drawn at all, rather than drawn to
 * somewhere that does not exist yet.
 */
const FIGMA_PLUGIN_URL: string | null = null

/**
 * The anchor a "Figma plugin connected" notification lands on — the `hash` in
 * `notificationTarget`, which is a pure module and so spells it out itself.
 */
const INTEGRATIONS_SECTION_ID = 'integrations'

/**
 * Integrations → Figma (CON-339): the plugin installs that hold a token for
 * this workspace, and the way to take one away.
 *
 * A member sees their own connections; an owner sees everyone's, which is why
 * the row names its member only for an owner — to a member every row is theirs
 * and the name would be their own, repeated.
 */
function IntegrationsSectionComponent() {
  const { t } = useTranslation()
  const query = useFigmaConnections()
  const workspace = useWorkspace()
  const showMember = workspace ? canManageWorkspace(workspace.role) : false

  return (
    <div id={INTEGRATIONS_SECTION_ID} className="scroll-mt-4">
      <SettingsCard title={t('integrations.figma.settings.title')}>
        {awaiting(query) ? (
          <p className="text-sm text-tertiary-foreground">
            {t('common.loading')}
          </p>
        ) : query.isError || !query.data ? (
          <p className="text-sm text-destructive">
            {t('integrations.figma.settings.loadFailed')}
          </p>
        ) : query.data.length === 0 ? (
          <EmptyState />
        ) : (
          <ul className="flex flex-col border-t border-border pt-6 divide-y divide-border">
            {query.data.map((c) => (
              <ConnectionRow
                key={c.id}
                connection={c}
                showMember={showMember}
              />
            ))}
          </ul>
        )}
      </SettingsCard>
    </div>
  )
}

/**
 * Nothing connected yet. The steps name the plugin's own menu path, because
 * pairing starts in Figma — there is no button on this side that could begin
 * it.
 */
function EmptyState() {
  const { t } = useTranslation()
  return (
    <div className="flex flex-col gap-3 text-sm text-tertiary-foreground max-w-150">
      <p>{t('integrations.figma.settings.empty.body')}</p>
      <p>
        <Trans
          i18nKey="integrations.figma.settings.empty.steps"
          components={{
            strong: <strong className="font-medium text-primary-foreground" />,
          }}
        />
      </p>
      {FIGMA_PLUGIN_URL && (
        <a
          href={FIGMA_PLUGIN_URL}
          target="_blank"
          rel="noreferrer noopener"
          className="flex items-center gap-1.5 self-start text-primary-foreground underline underline-offset-4"
        >
          {t('integrations.figma.settings.empty.communityLink')}
          <ArrowSquareOutIcon aria-hidden className="size-3.5" />
        </a>
      )}
    </div>
  )
}

function ConnectionRow({
  connection,
  showMember,
}: {
  connection: PluginConnection
  showMember: boolean
}) {
  const { t } = useTranslation()
  const locale = useLocale()
  const [confirming, setConfirming] = useState(false)

  const connectedAt = formatDate(
    connection.created_at,
    { dateStyle: 'medium' },
    locale,
  )
  const lastUsed = formatDate(
    connection.last_used_at,
    { dateStyle: 'medium' },
    locale,
  )
  const member = showMember
    ? connection.user?.name || connection.user?.email
    : null

  const details = [
    member ? t('integrations.figma.settings.member', { name: member }) : null,
    t('integrations.figma.settings.connectedOn', { date: connectedAt ?? '' }),
    lastUsed
      ? t('integrations.figma.settings.lastUsed', { date: lastUsed })
      : t('integrations.figma.settings.neverUsed'),
  ].filter((d): d is string => Boolean(d))

  return (
    <SettingsRow>
      <div className="flex items-center gap-3 min-w-0">
        <span className="flex size-10 shrink-0 items-center justify-center bg-secondary">
          <FigmaLogoIcon aria-hidden className="size-5" />
        </span>
        <div className="flex min-w-0 flex-1 flex-col">
          <p className="truncate text-base font-medium">{connection.label}</p>
          <p className="truncate text-xs text-tertiary-foreground">
            {details.join(' · ')}
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setConfirming(true)}
        >
          {t('integrations.figma.settings.disconnect')}
        </Button>
      </div>
      <DisconnectFigmaDialog
        connection={connection}
        isOpen={confirming}
        onClose={() => setConfirming(false)}
      />
    </SettingsRow>
  )
}

export const IntegrationsSection = memo(IntegrationsSectionComponent)
