import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { ModalContainer } from '@/components/ui/modal'
type Props = {
  /** How many documents are about to go — one row, a selection, or every match. */
  count: number
  /** The document's title, when it is one — the dialog names it. */
  title: string | null
  /** The campaign whose page this is — null in the workspace bank. */
  campaignId: string | null
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  deleting: boolean
}

/**
 * Confirmation for deleting documents, from either way in.
 *
 * Both ask now. The row's bin used to delete on one click, and the argument
 * for that was written down: a row is one of twenty and the mistake is visible
 * immediately. The first half is true and the second is not — there is no undo
 * behind this anywhere in the product, and "visible" only means you get to
 * watch it happen. It was the cheapest gesture on the screen and the only
 * unrecoverable one, sitting a few pixels from the row click that opens the
 * document.
 *
 * The fear that motivated the one-click version is real, though, and the copy
 * is what answers it: a dialog people click past is one that says the same
 * thing every time. So a single document is *named*. That is the one fact
 * separating a misclick from the delete that was meant, and it costs a reader
 * nothing to check. A selection can't be named — the names would be a list —
 * so it says how many, which is what a reader checks against what they think
 * they ticked — and "all 124 matching" reaches past the rows on screen, so
 * the count is the only honest description of it.
 */
export function DeleteDocumentsDialog({
  count,
  title: named,
  campaignId,
  isOpen,
  onClose,
  onConfirm,
  deleting,
}: Props) {
  const { t } = useTranslation()

  const title = count === 1 ? (named ?? '') : ''

  return (
    <ModalContainer
      isOpen={isOpen}
      onClose={deleting ? () => {} : onClose}
      title={
        title
          ? t('content.delete.titleNamed', { title })
          : t('content.delete.title', { count })
      }
      size="small"
      closeOnBackdropClick={!deleting}
      closeOnEscape={!deleting}
    >
      <div className="flex flex-col gap-4">
        <p className="text-sm text-secondary-foreground">
          {campaignId
            ? t('content.delete.bodyCampaign', { count })
            : t('content.delete.bodyBank', { count })}
        </p>
        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            disabled={deleting}
          >
            {t('content.delete.keep', { count })}
          </Button>
          <Button
            type="button"
            variant="destructiveInverted"
            onClick={onConfirm}
            loading={deleting}
          >
            {t('content.delete.confirm', { count })}
          </Button>
        </div>
      </div>
    </ModalContainer>
  )
}
