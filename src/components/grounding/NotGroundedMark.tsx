import { useTranslation } from 'react-i18next'
import { cn } from '@/lib'
import { isNotGrounded } from '@/lib/grounding'
import type { GroundingMode } from '@/types/posts'

/**
 * The one mark for generated work that drew on nothing of the campaign's own
 * (CON-448/469), wherever a post or idea is listed: a small hollow amber
 * ring and the words, as the CON-469 board draws it (CON-484).
 *
 * Only the absence is marked. Grounded is what generation is meant to be, so
 * it stays quiet, and `null` — a post someone typed, or one from before the
 * column existed — is unknown rather than ungrounded and says nothing either.
 * That is why the component takes the mode rather than being rendered behind
 * a check at each call site: the rule lives here once.
 *
 * `caps` is the calendar card's, where it is a line of its own under the
 * title and reads as the card's other small-caps labels do. The words are
 * always there — a mark explained only by a tooltip is lost on touch.
 */
export function NotGroundedMark({
  mode,
  caps = false,
  className,
}: {
  mode: GroundingMode | null | undefined
  caps?: boolean
  className?: string
}) {
  const { t } = useTranslation()
  if (!isNotGrounded(mode)) return null
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center gap-1.5 text-[11.5px]/4 font-semibold whitespace-nowrap text-warning-ink',
        caps && 'text-[10.5px] uppercase tracking-[0.06em]',
        className,
      )}
    >
      <span
        aria-hidden
        className="size-1.5 shrink-0 rounded-full border border-current"
      />
      {t('grounding.notGrounded')}
    </span>
  )
}
