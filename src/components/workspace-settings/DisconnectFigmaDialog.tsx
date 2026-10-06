import { useEffect } from 'react'
import { Trans, useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { ModalContainer } from '@/components/ui/modal'
import { useRevokeFigmaConnection } from '@/hooks/useFigmaIntegration'
import { ApiError } from '@/services/api/errors'
import { toast } from '@/stores/toastStore'
import type { PluginConnection } from '@/types/integrations'

type Props = {
  connection: PluginConnection
  isOpen: boolean
  onClose: () => void
}

/**
 * Confirms revoking one Figma plugin connection (CON-339).
 *
 * Revoking takes effect on the plugin's next call — it answers 401 and the
 * plugin drops back to its Connect screen — so the copy says what the user
 * will see in Figma rather than what happens to a token. Nothing already sent
 * is touched: the images stay in the bank.
 */
export function DisconnectFigmaDialog({ connection, isOpen, onClose }: Props) {
  const { t } = useTranslation()
  const { mutate: revoke, isPending, error, reset } = useRevokeFigmaConnection()

  // A fresh open is a fresh decision, never one that opens on the last error.
  useEffect(() => {
    if (isOpen) reset()
  }, [isOpen, reset])

  const run = () =>
    revoke(connection.id, {
      onSuccess: () => {
        toast.success(
          t('integrations.figma.disconnect.succeeded', {
            label: connection.label,
          }),
        )
        onClose()
      },
    })

  return (
    <ModalContainer
      isOpen={isOpen}
      onClose={isPending ? () => {} : onClose}
      title={t('integrations.figma.disconnect.title', {
        label: connection.label,
      })}
      size="small"
      closeOnBackdropClick={!isPending}
      closeOnEscape={!isPending}
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2 text-sm text-secondary-foreground">
          <p>
            <Trans
              i18nKey="integrations.figma.disconnect.body"
              values={{ label: connection.label }}
              components={{ strong: <strong /> }}
            />
          </p>
          <p>{t('integrations.figma.disconnect.keepsImages')}</p>
          {error && (
            <p className="text-destructive">
              {error instanceof ApiError && error.status === 403
                ? t('integrations.figma.disconnect.forbidden')
                : t('integrations.figma.disconnect.failed')}
            </p>
          )}
        </div>
        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            disabled={isPending}
          >
            {t('integrations.figma.disconnect.keep')}
          </Button>
          <Button
            type="button"
            variant="destructiveInverted"
            onClick={run}
            loading={isPending}
          >
            {/* Literal caps in the catalogue — see CLAUDE.md on destructive labels. */}
            {t('integrations.figma.disconnect.confirm')}
          </Button>
        </div>
      </div>
    </ModalContainer>
  )
}
