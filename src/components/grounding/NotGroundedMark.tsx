import { useTranslation } from 'react-i18next'
import { CircleDashedIcon } from '@phosphor-icons/react'
import { cn } from '@/lib'
import type { GroundingMode } from '@/types/posts'

/**
 * The one mark for generated work that drew on nothing of the campaign's own
 * (CON-448/469), wherever a post or idea is listed.
 *
 * Only the absence is marked. Grounded is what generation is meant to be, so
 * it stays quiet, and `null` — a post someone typed, or one from before the
 * column existed — is unknown rather than ungrounded and says nothing either.
 * That is why the component takes the mode rather than being rendered behind
 * a check at each call site: the rule lives here once.
 *
 * `compact` is the calendar card's, which has no room for the words: the
 * glyph alone, with the words for assistive tech and the pointer.
 */
export function NotGroundedMark({
  mode,
  compact = false,
  className,
}: {
  mode: GroundingMode | null | undefined
  compact?: boolean
  className?: string
}) {
  const { t } = useTranslation()
  if (mode !== 'exploratory') return null
  const label = t('grounding.notGrounded')
  return (
    <span
      title={compact ? label : undefined}
      className={cn(
        'inline-flex shrink-0 items-center gap-1 text-[12px]/[16px] font-medium whitespace-nowrap text-warning',
        className,
      )}
    >
      <CircleDashedIcon aria-hidden weight="bold" className="size-3.5" />
      <span className={cn(compact && 'sr-only')}>{label}</span>
    </span>
  )
}
