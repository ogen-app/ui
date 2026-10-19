import { WarningCircleIcon } from '@phosphor-icons/react'
import { useTranslation } from 'react-i18next'
import { postFailureMessage } from '@/lib/postFailure'
import type { Post } from '@/types/posts'

/**
 * Why the post below did not publish — the one thing a Failed badge cannot say
 * (CON-200).
 *
 * The lock notice's twin, in the same slot and for the same reason: it is a
 * fact about the whole post, said once above everything it concerns. Shown
 * only while the post *is* failed — the server keeps `failure_reason` after
 * the post moves on, and a reason beside a post that has since been scheduled
 * again would explain a failure that is no longer the state of anything.
 */
export function PostFailureNotice({
  post,
}: {
  post: Pick<Post, 'status' | 'failure_reason'>
}) {
  const { t } = useTranslation()
  if (post.status !== 'failed' || !post.failure_reason) return null
  const { summary, detail } = postFailureMessage(t, post.failure_reason)
  return (
    <div className="flex items-start gap-2 px-10 text-xs" role="status">
      <WarningCircleIcon
        weight="fill"
        className="mt-px size-3.5 shrink-0 text-warning"
      />
      <p className="flex min-w-0 flex-col gap-0.5">
        <span className="text-secondary-foreground">{summary}</span>
        {/* The service's own words, as they arrived — not ours to translate,
            and the part someone reporting the problem will be asked for. */}
        {detail && (
          <span className="break-words text-tertiary-foreground">{detail}</span>
        )}
      </p>
    </div>
  )
}
