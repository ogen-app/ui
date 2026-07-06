import {
  HeartIcon,
  ChatCircleIcon,
  RepeatIcon,
  PaperPlaneTiltIcon,
} from '@phosphor-icons/react'
import type { PreviewLayoutProps } from '../types'
import { PreviewBody } from '../parts/PreviewBody'
import { PreviewEngagementBar } from '../parts/PreviewEngagementBar'
import { PreviewMedia } from '../parts/PreviewMedia'

const ACTIONS = [
  { icon: HeartIcon },
  { icon: ChatCircleIcon },
  { icon: RepeatIcon },
  { icon: PaperPlaneTiltIcon },
]

// Single Threads post layout. The media slot resolves text vs. image.
export function ThreadsPost({ post, media }: PreviewLayoutProps) {
  return (
    <article className="w-full max-w-[560px] bg-white rounded-2xl border border-black/10 px-5 py-4 flex gap-3">
      <div className="size-9 rounded-full bg-black text-white flex items-center justify-center font-semibold shrink-0">
        @
      </div>
      <div className="flex flex-col gap-2 min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="text-[14px] font-semibold text-foreground">yourhandle</span>
          <span className="text-[13px] text-tertiary-foreground">· now</span>
        </div>
        <PreviewBody content={post.content} />
        <PreviewMedia
          media={media}
          placeholderClassName="aspect-[4/5] rounded-xl overflow-hidden"
          imageClassName="max-h-[460px] rounded-xl"
        />
        <PreviewEngagementBar items={ACTIONS} align="start" />
      </div>
    </article>
  )
}
