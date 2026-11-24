import { useTranslation } from 'react-i18next'
import {
  BookmarkSimpleIcon,
  FunnelSimpleIcon,
  XIcon,
} from '@phosphor-icons/react'
import { formatNumber } from '@/lib/intl'
import type { SavedView } from '@/services/api/savedViews'
import { Button } from '@/components/ui/button'

/**
 * The card lists' tab strip and pills row share these (design/ideas-cards):
 * Filter beside the tabs, and the open smart group leading the pills.
 */

/**
 * Every control on the list's head line — Filter, Views, Group, Sort — in one
 * voice: 14/20, the label grey, what it is set to in full ink, and as tall as
 * a pill (28px), so a line of pills that wraps leaves them on its first row.
 */
export const LINE_CONTROL =
  'flex h-7 shrink-0 cursor-pointer items-center gap-1.5 text-control text-secondary-foreground outline-none hover:text-foreground focus-visible:underline data-[state=open]:text-foreground'

/** Filter, opening the pills row's add field; how many filters are on. */
export function FilterButton({
  count,
  onClick,
}: {
  count: number
  onClick: () => void
}) {
  const { t, i18n } = useTranslation()
  return (
    <button type="button" onClick={onClick} className={LINE_CONTROL}>
      <FunnelSimpleIcon className="size-4" aria-hidden />
      {t('sentence.label')}
      {count > 0 && (
        <span className="font-medium text-foreground tabular-nums">
          {formatNumber(count, {}, i18n.language)}
        </span>
      )}
    </button>
  )
}

/** The open smart group, leading the pills row, and the way out of it. */
export function OpenView({
  view,
  edited,
  onClose,
}: {
  view: SavedView
  edited: boolean
  onClose: () => void
}) {
  const { t } = useTranslation()
  return (
    <span className="mr-1 flex h-7 min-w-0 items-center gap-1.5 font-medium text-foreground">
      <BookmarkSimpleIcon
        className="size-3 shrink-0"
        weight="fill"
        aria-hidden
      />
      <span className="truncate">{view.name}</span>
      {edited && (
        <span className="font-normal text-accent">
          {t('savedViews.edited')}
        </span>
      )}
      <Button
        variant="ghost"
        size="xsIcon"
        className="shrink-0"
        onClick={onClose}
        aria-label={t('savedViews.close', { name: view.name })}
      >
        <XIcon className="size-3" />
      </Button>
    </span>
  )
}
