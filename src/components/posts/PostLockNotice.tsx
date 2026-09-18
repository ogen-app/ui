import { LockIcon } from '@phosphor-icons/react'
import { useTranslation } from 'react-i18next'
import { isSubmitted } from '@/lib/postStatusMachine'
import type { PostStatus } from '@/types/posts'

/**
 * Why the post below is read-only — said once, for the whole screen (CON-251).
 *
 * Deliberately one line rather than a padlock on every card. The lock is a fact
 * about the post, not about its sources or its media, so repeating it per card
 * would make five statements out of one and still explain none of them. The
 * cards simply stop offering their controls; this is the sentence that says why.
 *
 * The two locked statuses get different sentences because they differ by
 * reversibility rather than by permission. A scheduled post's lock has a way
 * out and has to name it, or the screen reads as broken. A published post's has
 * none, and offering one would be a lie about what editing here would do.
 *
 * Sits between the quick-settings bar and the checks — above everything it
 * describes, and below the status badge that is the reason for it.
 */
export function PostLockNotice({ status }: { status: PostStatus }) {
  const { t } = useTranslation()
  if (!isSubmitted(status)) return null
  return (
    <p
      className="flex items-center gap-2 px-10 text-xs text-secondary-foreground"
      role="status"
    >
      <LockIcon weight="bold" className="size-3.5 shrink-0" />
      <span>
        {status === 'scheduled'
          ? t('posts.locked.scheduled')
          : t('posts.locked.published')}
      </span>
    </p>
  )
}
