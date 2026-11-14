import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { ModalContainer } from '@/components/ui/modal'
import { counted } from '@/lib/intl'

/**
 * Asks before facts leave the ledger (CON-486), from the row's trash and from
 * the selection bar's REMOVE — the rule `DeleteDocumentsDialog` set for
 * documents, for the reason it gives: nothing in the product undoes this, and
 * the trash sits a few pixels from the statement that opens the row.
 *
 * One fact is named, since the statement is what tells a misclick from the
 * removal that was meant; several are counted, which is what a reader checks
 * against what they think they ticked.
 */
export function RemoveFactsDialog({
  count,
  statement,
  isOpen,
  onClose,
  onConfirm,
  removing,
}: {
  count: number
  /** The fact's statement, when there is one fact. */
  statement: string | null
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  removing: boolean
}) {
  const { t } = useTranslation()
  const named = count === 1 && statement ? statement : null
  return (
    <ModalContainer
      isOpen={isOpen}
      onClose={removing ? () => {} : onClose}
      title={
        named
          ? t('brand.factsLedger.remove.titleNamed', { statement: named })
          : t('brand.factsLedger.remove.title', counted(count))
      }
      size="small"
      closeOnBackdropClick={!removing}
      closeOnEscape={!removing}
    >
      <div className="flex flex-col gap-4">
        <p className="text-sm text-secondary-foreground">
          {t('brand.factsLedger.remove.body', counted(count))}
        </p>
        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            disabled={removing}
          >
            {t('brand.factsLedger.remove.keep', counted(count))}
          </Button>
          <Button
            type="button"
            variant="destructiveInverted"
            onClick={onConfirm}
            loading={removing}
          >
            {t('brand.factsLedger.remove.confirm', counted(count))}
          </Button>
        </div>
      </div>
    </ModalContainer>
  )
}
