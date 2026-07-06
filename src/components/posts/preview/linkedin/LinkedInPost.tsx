import {
  ThumbsUpIcon,
  ChatCircleIcon,
  RepeatIcon,
  PaperPlaneTiltIcon,
} from '@phosphor-icons/react'
import type { PreviewLayoutProps } from '../types'
import { PreviewAuthorHeader } from '../parts/PreviewAuthorHeader'
import { PreviewBody } from '../parts/PreviewBody'
import { PreviewEngagementBar } from '../parts/PreviewEngagementBar'
import { PreviewMedia } from '../parts/PreviewMedia'

const LINKEDIN_BLUE = '#0A66C2'

const ACTIONS = [
  { icon: ThumbsUpIcon, label: 'Like' },
  { icon: ChatCircleIcon, label: 'Comment' },
  { icon: RepeatIcon, label: 'Repost' },
  { icon: PaperPlaneTiltIcon, label: 'Send' },
]

// Single LinkedIn feed-post layout. Text vs. image posts differ only by
// the media slot, which PreviewMedia resolves from the rule.
export function LinkedInPost({ post, media }: PreviewLayoutProps) {
  return (
    <article className="w-full max-w-[550px] bg-white rounded-xl border border-black/10 shadow-sm overflow-hidden">
      <div className="p-4 flex flex-col gap-3">
        <PreviewAuthorHeader
          name="Your Company"
          subtitle="12,480 followers · Promoted · Now"
          accent={LINKEDIN_BLUE}
        />
        <PreviewBody content={post.content} />
      </div>
      <PreviewMedia
        media={media}
        placeholderClassName="aspect-square"
        imageClassName="max-h-[460px]"
      />
      <div className="h-px bg-black/10 mx-4" />
      <div className="px-4 py-2.5">
        <PreviewEngagementBar items={ACTIONS} />
      </div>
    </article>
  )
}
