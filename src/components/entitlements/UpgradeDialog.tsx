import { useNavigate } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { ModalContainer } from '@/components/ui/modal'
import { UpgradeCallout } from './UpgradeCallout'
import type { UpgradeGate } from './useUpgradeGate'

/**
 * What a sold denial looks like when the user has already clicked.
 *
 * A modal rather than an inline notice, because by the time this renders the
 * user has asked for something and is owed an answer to *that* — not a message
 * that appears somewhere else on the screen for them to go and find. It is the
 * one rendering in this folder that interrupts, and `useUpgradeGate` is the
 * only thing that opens it.
 *
 * The body is `UpgradeCallout` unchanged, so the sentence read here is the one
 * that would be read inline; the modal contributes the interruption and the
 * two buttons and nothing else. The callout is handed no `onUpgrade` — its own
 * action slot sits at the top of the notice, which is where this modal's close
 * control already is, and a dialog answers itself along its bottom edge.
 *
 * **Where UPGRADE goes is decided here, once.** Every call site sells the same
 * plan screen, so knowing its address is not eleven screens' business. It is
 * also why there is an upgrade button at all now: the callout has always taken
 * `onUpgrade` optionally, on the rule that a button which explains a limit and
 * then does nothing is worse than no button, and `/plans` is the first place
 * there has been to send anyone.
 *
 * Dismissal is a real choice, spelled out. A modal offering only the way
 * forward reads as a toll gate, and the answer to "you've used all 3" is often
 * to go and delete one — which is behind this dialog, not beyond it.
 */
export function UpgradeDialog({
  gate,
  format,
  hideUsage,
}: {
  gate: UpgradeGate
  /** Both passed straight to the callout — see `UpgradeCallout`. */
  format?: (value: number) => string
  hideUsage?: boolean
}) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  if (gate.entitlement.state !== 'denied') return null

  return (
    <ModalContainer
      isOpen={gate.selling}
      onClose={gate.dismiss}
      size="small"
      showCloseButton={false}
    >
      <div className="flex flex-col gap-5">
        <UpgradeCallout
          entitlement={gate.entitlement}
          format={format}
          hideUsage={hideUsage}
        />
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={gate.dismiss}>
            {t('tiers.notNow')}
          </Button>
          <Button
            onClick={() => {
              gate.dismiss()
              void navigate({ to: '/plans' })
            }}
          >
            {t('tiers.upgrade')}
          </Button>
        </div>
      </div>
    </ModalContainer>
  )
}
