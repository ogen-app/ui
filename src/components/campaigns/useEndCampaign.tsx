import { useState, type ReactNode } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { ModalContainer } from '@/components/ui/modal'
import { useArchiveCampaign, useDeleteCampaign } from '@/hooks/useCampaigns'
import type { Campaign } from '@/types/campaigns'

export type CampaignEnding = 'archive' | 'delete'

/**
 * The two ways to stop running a campaign, as the asks that confirm them.
 *
 * Offered from two places: the Danger Zone at the foot of the campaign's
 * Settings, and the campaign's menu in the bar above every one of its pages
 * (`CampaignSwitcher`). The second exists because the first is where nobody
 * looks — someone who has just opened a test campaign and wants rid of it is
 * reading the campaign's name, not the gear at the foot of the rail. Both
 * places open these same modals, so the consequences are stated once, on the
 * click (see `CampaignDangerZone` on why they belong there).
 *
 * Neither asks for the campaign's name to be typed, unlike deleting a
 * workspace: the modal's title names it, and so does the bar it was opened
 * from.
 */
export function useEndCampaign(campaign: Campaign | undefined): {
  ask: (ending: CampaignEnding) => void
  dialogs: ReactNode
} {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [pending, setPending] = useState<CampaignEnding | null>(null)
  const { mutate: archiveCampaign, isPending: archiving } = useArchiveCampaign()
  const { mutate: deleteCampaign, isPending: deleting } = useDeleteCampaign()

  const busy = archiving || deleting

  const close = () => {
    if (busy) return
    setPending(null)
  }

  if (!campaign) return { ask: () => {}, dialogs: null }

  // Both titles name the campaign, so an untitled one has to say something
  // rather than render `Delete ?`.
  const name = campaign.name.trim() || t('campaigns.untitled')

  /**
   * Archiving leaves the campaign whole, so it asks once and then leaves —
   * for the campaigns list with the archive open rather than closed, because
   * the campaign is about to vanish from that list and landing on a screen
   * that no longer shows it reads as a delete.
   */
  const archive = () =>
    archiveCampaign(campaign.id, {
      onSuccess: () => {
        setPending(null)
        void navigate({ to: '/campaigns', search: { archived: true } })
      },
    })

  const remove = () =>
    deleteCampaign(campaign.id, {
      onSuccess: () => {
        setPending(null)
        void navigate({ to: '/campaigns' })
      },
    })

  return {
    ask: setPending,
    dialogs: (
      <>
        <ModalContainer
          isOpen={pending === 'archive'}
          onClose={close}
          title={t('campaigns.dangerZone.archive.confirmTitle', { name })}
          size="default"
          closeOnBackdropClick={!busy}
          closeOnEscape={!busy}
        >
          <div className="flex flex-col gap-4">
            <p className="text-sm text-primary-foreground">
              {t('campaigns.dangerZone.archive.confirmBody')}
            </p>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={close}
                disabled={busy}
              >
                {t('campaigns.dangerZone.archive.keep')}
              </Button>
              <Button
                type="button"
                variant="destructiveInverted"
                onClick={archive}
                loading={archiving}
              >
                <span>{t('campaigns.dangerZone.archive.confirm')}</span>
              </Button>
            </div>
          </div>
        </ModalContainer>

        <ModalContainer
          isOpen={pending === 'delete'}
          onClose={close}
          title={t('campaigns.dangerZone.delete.confirmTitle', { name })}
          size="default"
          closeOnBackdropClick={!busy}
          closeOnEscape={!busy}
        >
          <div className="flex flex-col gap-4">
            {/* No mention of the row the server keeps as its own safety net:
                saying it is retained reads as "recoverable", and nothing in
                the app or on the API can bring it back. */}
            <p className="text-sm text-primary-foreground">
              {t('campaigns.dangerZone.delete.confirmBody')}
            </p>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={close}
                disabled={busy}
              >
                {t('campaigns.dangerZone.delete.keep')}
              </Button>
              <Button
                type="button"
                variant="destructiveInverted"
                onClick={remove}
                loading={deleting}
              >
                <span>{t('campaigns.dangerZone.delete.confirm')}</span>
              </Button>
            </div>
          </div>
        </ModalContainer>
      </>
    ),
  }
}
