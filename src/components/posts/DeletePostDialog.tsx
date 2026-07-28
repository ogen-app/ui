import { useNavigate } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { ModalContainer } from '@/components/ui/modal'
import { useDeletePost } from '@/hooks/usePosts'
import { toast } from '@/stores/toastStore'
import type { Post, PostStatus } from '@/types/posts'

type Props = {
  post: Post
  isOpen: boolean
  onClose: () => void
  /**
   * Where to go once the post is gone. Defaults to the campaign page —
   * the post details route would 404 on the deleted id.
   */
  onDeleted?: () => void
}

function formatWhen(iso: string | null): string | null {
  if (!iso) return null
  const d = new Date(iso)
  if (isNaN(d.getTime())) return null
  return d.toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

/**
 * Status-aware copy. Deleting only ever removes the post from Ogen, but
 * what that means to the user differs per status: a published post keeps
 * living on the social network, a scheduled one loses a pending publish,
 * and a draft is just gone.
 */
function warningFor(status: PostStatus, when: string | null) {
  switch (status) {
    case 'published':
      return {
        confirmLabel: 'Delete anyway',
        body: (
          <>
            <p>
              This post has already been published. Deleting it removes it from
              Ogen only — <strong>the published post stays live on the social
              network</strong> and will not be taken down.
            </p>
            <p>
              You'll lose the content, settings and history we keep for it here.
              This cannot be undone.
            </p>
          </>
        ),
      }
    case 'scheduled':
    case 'scheduled_for_manual_publishing':
      return {
        confirmLabel: 'Cancel schedule and delete',
        body: (
          <>
            <p>
              This post is <strong>scheduled to publish
              {when ? ` on ${when}` : ''}</strong>. Deleting it cancels the
              scheduled publish — it will never go out.
            </p>
            <p>Please confirm. This cannot be undone.</p>
          </>
        ),
      }
    default:
      return {
        confirmLabel: 'Delete post',
        body: <p>This post will be permanently deleted. This cannot be undone.</p>,
      }
  }
}

export function DeletePostDialog({ post, isOpen, onClose, onDeleted }: Props) {
  const navigate = useNavigate()
  const { mutate: deletePost, isPending: deleting } = useDeletePost(post.campaign_id)

  const title = post.title.trim()
  const { confirmLabel, body } = warningFor(post.status, formatWhen(post.scheduled_at))

  const handleConfirm = () => {
    deletePost(post.id, {
      onSuccess: () => {
        toast.success('Post deleted')
        onClose()
        if (onDeleted) {
          onDeleted()
          return
        }
        void navigate({
          to: '/campaigns/$campaignId',
          params: { campaignId: post.campaign_id },
        })
      },
      onError: (err) => {
        toast.error('Unable to delete post', {
          description: err instanceof Error ? err.message : undefined,
        })
      },
    })
  }

  return (
    <ModalContainer
      isOpen={isOpen}
      onClose={deleting ? () => {} : onClose}
      title={title ? `Delete "${title}"?` : 'Delete this post?'}
      size="small"
      closeOnBackdropClick={!deleting}
      closeOnEscape={!deleting}
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2 text-sm text-secondary-foreground">
          {body}
        </div>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose} disabled={deleting}>
            Keep post
          </Button>
          <Button
            type="button"
            variant="destructiveInverted"
            onClick={handleConfirm}
            loading={deleting}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </ModalContainer>
  )
}
