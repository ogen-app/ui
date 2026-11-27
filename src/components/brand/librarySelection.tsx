import { useTranslation } from 'react-i18next'
import { TrashIcon } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { SelectionLine } from '@/components/page-primitives/SelectionLine'
import { counted } from '@/lib/intl'
import type { LibraryKind, LibrarySelection } from './useLibrarySelection'

/**
 * How many entries are ticked, the way out, and what can be done to them —
 * in the line the ledger's tabs and search stood in while nothing was ticked
 * (`SelectionLine`, the Ideas and Assets head), so the table under it never
 * moves and nothing floats over its foot.
 */
export function LibrarySelectionLine({
  kind,
  selection,
  onRemove,
  busy = false,
}: {
  kind: LibraryKind
  selection: LibrarySelection
  /** The facts ledger's REMOVE: the caller asks first, naming the count. */
  onRemove: () => void
  busy?: boolean
}) {
  const { t } = useTranslation()
  return (
    <SelectionLine
      status={t(`brand.selection.${kind}`, counted(selection.ticked.size))}
      clear={{
        label: t('brand.selection.clear'),
        onClick: selection.clear,
        disabled: busy,
      }}
    >
      <Button variant="ghost" size="sm" onClick={onRemove} disabled={busy}>
        <TrashIcon className="text-destructive" />
        <span>{t('brand.selection.remove')}</span>
      </Button>
    </SelectionLine>
  )
}
