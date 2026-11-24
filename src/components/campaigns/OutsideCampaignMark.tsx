import { useTranslation } from 'react-i18next'
import { ProhibitIcon } from '@phosphor-icons/react'
import { cn } from '@/lib'
import type { OutsideCampaign } from '@/lib/campaignTarget'

/**
 * The mark for a post left outside its campaign's platforms or post types
 * (CON-483), wherever a campaign's posts are listed — the words Quality
 * uses. `compact` is the calendar card's: the glyph alone, with the words
 * for assistive tech and the pointer.
 */
export function OutsideCampaignMark({
  outside,
  compact = false,
  className,
}: {
  outside: OutsideCampaign | null
  compact?: boolean
  className?: string
}) {
  const { t } = useTranslation()
  if (!outside) return null
  const label = t(`posts.outsideCampaign.${outside}`)
  return (
    <span
      title={compact ? label : undefined}
      className={cn(
        'inline-flex shrink-0 items-center gap-1 text-xs font-medium whitespace-nowrap text-warning',
        className,
      )}
    >
      <ProhibitIcon aria-hidden weight="bold" className="size-3.5" />
      <span className={cn(compact && 'sr-only')}>{label}</span>
    </span>
  )
}
