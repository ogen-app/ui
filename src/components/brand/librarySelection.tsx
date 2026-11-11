import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { ZIndex } from '@/config/zIndex'
import { counted } from '@/lib/intl'
import type { LibraryKind, LibrarySelection } from './useLibrarySelection'

/**
 * How many entries are ticked, and CLEAR — at the foot of the column, where
 * the Ideas list's bar sits. Nothing renders while nothing is ticked.
 */
export function LibrarySelectionBar({
  kind,
  selection,
}: {
  kind: LibraryKind
  selection: LibrarySelection
}) {
  const { t } = useTranslation()
  const n = selection.ticked.size
  if (n === 0) return null
  return (
    <div
      className="pointer-events-none sticky bottom-4 flex justify-center"
      style={{ zIndex: ZIndex.pageActionBar }}
    >
      <div className="pointer-events-auto flex h-12 items-center gap-3 bg-primary px-4 shadow-lg">
        <span
          role="status"
          aria-live="polite"
          className="text-[13px]/4 font-medium tabular-nums whitespace-nowrap"
        >
          {t(`brand.selection.${kind}`, counted(n))}
        </span>
        <span className="h-6 w-px shrink-0 bg-border" aria-hidden />
        <Button
          variant="ghost"
          size="sm"
          className="text-primary-foreground"
          onClick={selection.clear}
        >
          {t('brand.selection.clear')}
        </Button>
      </div>
    </div>
  )
}
