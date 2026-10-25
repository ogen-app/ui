import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { ModalContainer } from '@/components/ui/modal'
import type { Tier } from '@/types/tiers'

type Props = {
  /** The tier the workspace holds — one the price list does not offer. */
  heldName: string
  target: Tier
  busy: boolean
  onConfirm: () => void
  onClose: () => void
}

/**
 * The one switch on a complimentary workspace that cannot be undone from here
 * (CON-402): leaving a tier the Ogen team set up and nobody can choose. Every
 * other switch is free, instant and reversible, so it is applied on the click;
 * this one asks first, because only the Ogen team can move the workspace back.
 */
export function LeaveHiddenTierDialog({
  heldName,
  target,
  busy,
  onConfirm,
  onClose,
}: Props) {
  const { t, i18n } = useTranslation()
  return (
    <ModalContainer
      isOpen
      // Not dismissable while the switch is in flight: the request carries on
      // regardless, and the dialog is what says it is still happening.
      onClose={busy ? () => {} : onClose}
      closeOnBackdropClick={!busy}
      closeOnEscape={!busy}
      title={t('tiers.leaveHidden.title', { name: heldName })}
    >
      <div className="flex flex-col gap-5">
        <p className="text-sm">
          {t('tiers.leaveHidden.body', {
            name: heldName,
            target: target.name,
          })}
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            {t('tiers.leaveHidden.cancel')}
          </Button>
          <Button variant="defaultInverted" onClick={onConfirm} loading={busy}>
            {t('tiers.ledger.switchNamed', {
              name: target.name.toLocaleUpperCase(i18n.language),
            })}
          </Button>
        </div>
      </div>
    </ModalContainer>
  )
}
