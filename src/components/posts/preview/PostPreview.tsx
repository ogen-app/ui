import type { Post } from '@/types/posts'
import { usePostTypeRule } from '@/hooks/usePostTypeRules'
import { imageRequired, firstImageUrl } from '@/lib/postMedia'
import { getPreviewLayout } from './registry'
import { GenericPreview } from './GenericPreview'

type Props = {
  post: Post
  title: string
}

// Resolves the platform/post-type-specific preview layout (falling back
// to a generic card) and the media slot: the first inline image in the
// content is used whenever present; the `required` flag only governs the
// empty state (mandatory -> "Image required" placeholder, optional ->
// nothing).
export function PostPreview({ post, title }: Props) {
  const rule = usePostTypeRule(post.platform_id, post.platform_post_type)
  const Layout =
    getPreviewLayout(post.platform_id, post.platform_post_type) ?? GenericPreview

  const media = {
    required: imageRequired(rule),
    imageUrl: firstImageUrl(post.content),
  }

  return (
    <div className="flex justify-center">
      <Layout post={post} title={title} media={media} />
    </div>
  )
}
