import type { ComponentType } from 'react'
import type { Post } from '@/types/posts'

export type PreviewMediaInfo = {
  // Image is mandatory for this post type. Only affects the empty state:
  // when no image is present, a required placeholder is shown.
  required: boolean
  // First inline image found in the post content; rendered whenever
  // present, regardless of `required`. Null when none is present.
  imageUrl: string | null
}

export type PreviewLayoutProps = {
  post: Post
  // Internal post title (not shown by feed-style layouts, but available
  // to title-bearing layouts like articles).
  title: string
  media: PreviewMediaInfo
}

export type PreviewComponent = ComponentType<PreviewLayoutProps>
