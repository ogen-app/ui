import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { ZIndex } from '@/config/zIndex'
import { cn } from '@/lib'
import { counted } from '@/lib/intl'
import type { LibraryKind, LibrarySelection } from './useLibrarySelection'

/**
 * How many entries are ticked, and CLEAR — at the foot of the column, where
 * the Ideas list's bar sits. Nothing renders while nothing is ticked.
 *
 * Two placements, neither of which moves the content when it appears
 * (CON-486). In a scrolling column it is sticky to the column's foot and
 * `-mt-12` takes back the room it would occupy, as the Ideas bar does. Over
 * the facts table, which scrolls inside itself, it floats over the table's
 * foot instead (`overlay`) — the page gives it a positioned box to sit in.
 */
export function LibrarySelectionBar({
  kind,
  selection,
  overlay = false,
  onRemove,
  busy = false,
}: {
  kind: LibraryKind
  selection: LibrarySelection
  overlay?: boolean
  /**
   * The facts ledger's REMOVE: the caller asks first, naming the count, and
   * removes. The other libraries have no bulk verb — a selection there is
   * something to ask the assistant about.
   */
  onRemove?: () => void
  busy?: boolean
}) {
  const { t } = useTranslation()
  const n = selection.ticked.size
  if (n === 0) return null
  return (
    <div
      className={cn(
        'pointer-events-none flex justify-center',
        overlay ? 'absolute inset-x-0 bottom-4' : 'sticky bottom-4 -mt-12',
      )}
      style={{ zIndex: ZIndex.pageActionBar }}
    >
      <div className="pointer-events-auto flex h-12 items-center gap-3 bg-primary px-4 shadow-lg">
        <span
          role="status"
          aria-live="polite"
          className="text-control font-medium tabular-nums whitespace-nowrap"
        >
          {t(`brand.selection.${kind}`, counted(n))}
        </span>
        <span className="h-6 w-px shrink-0 bg-border" aria-hidden />
        {onRemove && (
          <Button
            variant="ghost"
            size="sm"
            className="text-primary-foreground hover:text-destructive"
            onClick={onRemove}
            disabled={busy}
          >
            {t('brand.selection.remove')}
          </Button>
        )}
        <Button
          variant="ghost"
          size="sm"
          className="text-primary-foreground"
          onClick={selection.clear}
          disabled={busy}
        >
          {t('brand.selection.clear')}
        </Button>
      </div>
    </div>
  )
}
