import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { ModalContainer } from '@/components/ui/modal'

/**
 * Confirmation for deleting ideas, from every way in: a written idea's own
 * DELETE IDEA (a selection of one) and, under `ideas-smart-filter`, the
 * selection bar (CON-388 §6).
 *
 * `DeleteDocumentsDialog`'s reasoning, for ideas: one idea is *named*, because
 * the name is what separates a misclick from the delete that was meant; a
 * selection says how many, which is what a reader checks against what they
 * ticked. Nothing in the product undoes this, and the copy says so. It
 * promises nothing about re-analysis — a later reading of the same document
 * writes a fresh set of ideas, which may well include a similar one.
 */
export function DeleteIdeasDialog({
  count,
  title: named,
  isOpen,
  onClose,
  onConfirm,
  deleting,
}: {
  count: number
  /** The idea's title, when it is one — the dialog names it. */
  title: string | null
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  deleting: boolean
}) {
  const { t } = useTranslation()
  const title = count === 1 ? (named ?? '') : ''

  return (
    <ModalContainer
      isOpen={isOpen}
      onClose={deleting ? () => {} : onClose}
      title={
        title
          ? t('ideas.delete.titleNamed', { title })
          : t('ideas.delete.title', { count })
      }
      size="small"
      closeOnBackdropClick={!deleting}
      closeOnEscape={!deleting}
    >
      <div className="flex flex-col gap-4">
        <p className="text-sm text-secondary-foreground">
          {t('ideas.delete.body', { count })}
        </p>
        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            disabled={deleting}
          >
            {t('ideas.delete.keep', { count })}
          </Button>
          <Button
            type="button"
            variant="destructiveInverted"
            onClick={onConfirm}
            loading={deleting}
          >
            {t('ideas.delete.confirm', { count })}
          </Button>
        </div>
      </div>
    </ModalContainer>
  )
}
