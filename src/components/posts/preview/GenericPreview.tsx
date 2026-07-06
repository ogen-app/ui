import type { PreviewLayoutProps } from './types'
import { getPlatformInfo } from '@/lib/platformDictionary'
import { PreviewAuthorHeader } from './parts/PreviewAuthorHeader'
import { PreviewBody } from './parts/PreviewBody'
import { PreviewMedia } from './parts/PreviewMedia'

// Fallback used when no platform/post-type-specific layout is
// registered, so every combination renders something rather than
// crashing.
export function GenericPreview({ post, media }: PreviewLayoutProps) {
  const info = getPlatformInfo(post.platform_id)
  return (
    <article className="w-full max-w-[560px] bg-white rounded-xl border border-black/10 p-5 flex flex-col gap-3">
      <PreviewAuthorHeader
        name={info?.name ?? 'Preview'}
        subtitle="Generic preview"
        accent={info?.color}
      />
      <PreviewBody content={post.content} />
      <PreviewMedia
        media={media}
        placeholderClassName="aspect-video rounded-lg overflow-hidden"
        imageClassName="rounded-lg max-h-[400px]"
      />
      <p className="text-xs text-tertiary-foreground">
        No tailored preview for this post type yet.
      </p>
    </article>
  )
}
