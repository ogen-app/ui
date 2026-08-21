import { Button } from '@/components/ui/button'
import { ModalContainer } from '@/components/ui/modal'

type Props = {
  /** How many documents the selection holds. */
  count: number
  /** The campaign whose page this is — null in the workspace bank. */
  campaignId: string | null
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  deleting: boolean
}

/**
 * Confirmation for deleting a whole selection.
 *
 * A single row deletes on one click without asking: it is one of twenty, the
 * mistake is visible immediately, and a dialog for every tidy-up would be the
 * thing that trains people to click through dialogs. A selection is the
 * opposite case — it is deliberate, it may hold documents scrolled out of
 * sight, and there is no undo behind it — so it says how many and what that
 * costs before doing it.
 *
 * The count is in the title rather than the body because it is the fact being
 * confirmed, and it is the one thing a reader checks against what they think
 * they ticked.
 */
export function DeleteDocumentsDialog({
  count,
  campaignId,
  isOpen,
  onClose,
  onConfirm,
  deleting,
}: Props) {
  const one = count === 1

  return (
    <ModalContainer
      isOpen={isOpen}
      onClose={deleting ? () => {} : onClose}
      title={one ? 'Delete this document?' : `Delete ${count} documents?`}
      size="small"
      closeOnBackdropClick={!deleting}
      closeOnEscape={!deleting}
    >
      <div className="flex flex-col gap-4">
        <p className="text-sm text-secondary-foreground">
          {campaignId
            ? `${one ? 'This document' : 'These documents'} will be permanently deleted, and this campaign will stop writing from ${one ? 'it' : 'them'}. This cannot be undone.`
            : `${one ? 'This document' : 'These documents'} will be permanently deleted, and any campaign using ${one ? 'it' : 'them'} will stop writing from ${one ? 'it' : 'them'}. This cannot be undone.`}
        </p>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose} disabled={deleting}>
            {one ? 'KEEP DOCUMENT' : 'KEEP DOCUMENTS'}
          </Button>
          <Button
            type="button"
            variant="destructiveInverted"
            onClick={onConfirm}
            loading={deleting}
          >
            {one ? 'DELETE DOCUMENT' : `DELETE ${count} DOCUMENTS`}
          </Button>
        </div>
      </div>
    </ModalContainer>
  )
}
