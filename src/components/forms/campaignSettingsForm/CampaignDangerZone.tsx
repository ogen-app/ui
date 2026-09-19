import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { ArchiveIcon, TrashIcon } from '@phosphor-icons/react'

import { Button } from '@/components/ui/button'
import { ModalContainer } from '@/components/ui/modal'
import { SettingsCard } from '@/components/settings/SettingsCard'
import { useArchiveCampaign, useDeleteCampaign } from '@/hooks/useCampaigns'
import type { Campaign } from '@/types/campaigns'

type Pending = 'archive' | 'delete' | null

/**
 * The two ways to stop running a campaign, in one card.
 *
 * Archiving used to sit in a card of its own, above this one, on the reasoning
 * that a red heading beside a delete would teach people to avoid the safe
 * option. That reasoning made the wrong trade: it left someone who wanted rid
 * of a campaign scanning two cards to find out which one they meant, and the
 * card that offered the *reversible* answer was the one they had already
 * scrolled past. Both actions live here, archive first, and both wear the
 * destructive button: what they have in common is that they take a campaign
 * out of circulation, and the card is titled Danger Zone. Which of the two is
 * reversible is a fact about consequences, and consequences are stated in the
 * modals rather than encoded in a button colour nobody reads that closely.
 *
 * The card's own copy is deliberately one generalised sentence. Consequences
 * belong on the click, not on the page: stated up here they are read once and
 * skipped forever after, and they are exactly what the person about to
 * confirm needs in front of them. So each action opens a modal that says what
 * it does — which is also why the delete no longer goes through
 * `window.confirm`, whose one line of text cannot hold them.
 *
 * Neither modal asks for the campaign's name to be typed, unlike deleting a
 * workspace. Two similar workspaces is the case typing catches, and it is a
 * real one; a campaign is opened from its own settings page, with its name in
 * the title bar above the button.
 */
export function CampaignDangerZone({ campaign }: { campaign: Campaign }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [pending, setPending] = useState<Pending>(null)
  const { mutate: archiveCampaign, isPending: archiving } = useArchiveCampaign()
  const { mutate: deleteCampaign, isPending: deleting } = useDeleteCampaign()

  const busy = archiving || deleting
  // Both modal titles name the campaign, so an untitled one has to say
  // something rather than render `Delete ?`.
  const name = campaign.name.trim() || t('campaigns.untitled')

  const close = () => {
    if (busy) return
    setPending(null)
  }

  /**
   * Archiving leaves the campaign whole, so it asks once and then leaves —
   * for the campaigns list with the archive open rather than closed, because
   * the campaign is about to vanish from that list and landing on a screen
   * that no longer shows it reads as a delete.
   */
  const handleArchive = () =>
    archiveCampaign(campaign.id, {
      onSuccess: () =>
        navigate({ to: '/campaigns', search: { archived: true } }),
    })

  const handleDelete = () =>
    deleteCampaign(campaign.id, {
      onSuccess: () => navigate({ to: '/campaigns' }),
    })

  return (
    <>
      <SettingsCard title={t('campaigns.dangerZone.title')}>
        <div className="flex flex-col gap-3 items-start">
          <p className="max-w-150 text-sm text-tertiary-foreground">
            {t('campaigns.dangerZone.body')}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="destructiveInverted"
              onClick={() => setPending('archive')}
            >
              <ArchiveIcon />
              <span>{t('campaigns.dangerZone.archive.action')}</span>
            </Button>
            <Button
              type="button"
              variant="destructiveInverted"
              onClick={() => setPending('delete')}
            >
              <TrashIcon />
              {/* Literal caps in every language — see CLAUDE.md on
                  destructive labels. */}
              <span>{t('campaigns.dangerZone.delete.action')}</span>
            </Button>
          </div>
        </div>
      </SettingsCard>

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
              onClick={handleArchive}
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
              saying it is retained reads as "recoverable", and nothing in the
              app or on the API can bring it back. */}
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
              onClick={handleDelete}
              loading={deleting}
            >
              <span>{t('campaigns.dangerZone.delete.confirm')}</span>
            </Button>
          </div>
        </div>
      </ModalContainer>
    </>
  )
}
