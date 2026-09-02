import { useTranslation } from 'react-i18next'
import { LockIcon } from '@phosphor-icons/react'
import type { PostStatus } from '@/types/posts'
import { canEditScheduledAt } from '@/lib/postStatusMachine'
import { cn } from '@/lib'

/**
 * The padlock a calendar card wears when its date can no longer move.
 *
 * Its own file, and deliberately not part of `status.ts`, because it is not a
 * status — it is a second, independent thing that happens to be *derivable*
 * from one today. `canEditScheduledAt` is the rule (the Zernio submission owns
 * the publish time once `scheduled`, and `published` is history), and the day
 * a post's date is locked for some other reason — an approval, a channel
 * freeze, a client sign-off — this predicate changes and nothing else does.
 * A row in `STATUS_ICON` could not have absorbed that.
 *
 * That independence is also why it sits at the far right of its row rather
 * than beside the status glyph. Two marks together read as one compound
 * statement about the post; the same two at opposite ends of a row read as two
 * separate facts, which is what they are. The status is what this post *is*.
 * The lock is what you can *do* to it, and it belongs with nothing.
 */

/** Whether this post's `scheduled_at` is fixed — the lock's one input. */
export function isDateLocked(status: PostStatus): boolean {
  return !canEditScheduledAt(status)
}

type Props = {
  /** The glyph's size — `size-3.5` on the week card, `size-3` on the month. */
  className?: string
}

/**
 * Two rungs down the foreground ladder from the type it sits in: `tertiary`
 * (gray-600) is the time's grey, so `quinary` (gray-400) is two steps lighter.
 * Quiet on purpose — a card is read for what it says, and this is a note about
 * what it won't let you do.
 */
export function LockMark({ className }: Props) {
  const { t } = useTranslation()
  return (
    <LockIcon
      weight="bold"
      className={cn('shrink-0 text-quinary-foreground', className)}
      aria-label={t('calendar.dateLocked')}
    />
  )
}
