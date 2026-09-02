import { PostSourcesControl } from '@/components/posts/sources/PostSourcesControl'
import { isSubmitted } from '@/lib/postStatusMachine'
import { cn } from '@/lib'
import type { Post } from '@/types/posts'

type Props = {
  post: Post
  changeDoc: (fn: (p: Post) => void) => void
  className?: string
}

/**
 * What the post writes from, under the copy — the primary home for sources,
 * sitting with the other material attached to a post (media, notes) because
 * that is what it is.
 *
 * Uncollapsed and always present. Like the notes card and unlike the media
 * card it never disappears: a post reading from nothing is exactly the state
 * that needs an entry point. The same control also appears as a section in the
 * settings rail, for reaching it without leaving the panel — but the rail
 * shows one panel at a time, so this is the copy that can be read while the
 * assistant consuming these documents is open.
 */
export function PostSourcesCard({ post, changeDoc, className }: Props) {
  return (
    <div className={cn('bg-primary px-10 py-6', className)}>
      <PostSourcesControl
        post={post}
        changeDoc={changeDoc}
        layout="card"
        locked={isSubmitted(post.status)}
      />
    </div>
  )
}
