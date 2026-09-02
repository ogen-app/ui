import { useTranslation } from 'react-i18next'
import type { PostStatus } from '@/types/posts'
import { postStatusLabel } from '@/lib/postStatusLabel'
import { StatusBadge, type StatusTone } from '@/components/ui/status-badge'

const POST_STATUS_TONE: Record<PostStatus, StatusTone> = {
  draft: 'neutral',
  ready_for_publish: 'progress',
  scheduled: 'positive',
  // Scheduled and healthy — it just publishes by hand. That is a note to
  // the user, not a warning about the post.
  scheduled_for_manual_publishing: 'attention',
  failed: 'destructive',
  published: 'positive',
  not_published: 'negative',
}

type Props = {
  status: PostStatus
  className?: string
}

export function PostStatusBadge({ status, className }: Props) {
  const { t } = useTranslation()
  return (
    <StatusBadge
      label={postStatusLabel(t, status)}
      tone={POST_STATUS_TONE[status]}
      className={className}
    />
  )
}
