import {
  BookmarkSimpleIcon,
  ChatCircleIcon,
  DotsThreeIcon,
  HeartIcon,
  ImageIcon,
  PaperPlaneTiltIcon,
} from '@phosphor-icons/react'
import { PLATFORM_FOLDS } from '@/lib/socialText.ts'
import { frameAspect } from './frames.ts'
import { FoldedText, PreviewAvatar, PreviewMedia, PreviewSurface } from './previewParts.tsx'
import { INSTAGRAM as C } from './previewTheme.ts'
import type { PreviewProps } from './types.ts'

/**
 * An Instagram feed post.
 *
 * Instagram inverts the other two: the image is the post and the caption is a
 * footnote, folded after ~125 characters. It also cannot publish without
 * media at all, so the media slot shows that as a blocker rather than
 * quietly rendering a text-only card that could never exist.
 */
export function InstagramPreview({ text, media, postType, author, timeLabel }: PreviewProps) {
  const handle = author.username ?? author.name ?? 'your.account'
  // Square is the feed's shape; a Reel is 9:16 and previewing one in a square
  // shows a crop that will never exist.
  const aspect = frameAspect(postType, 1) ?? 1

  return (
    <PreviewSurface style={{ borderRadius: 4 }}>
      <div className="flex items-center gap-2 px-3 py-2">
        <PreviewAvatar src={author.avatarUrl} name={handle} size={32} background={C.muted} />
        <div
          className="min-w-0 flex-1 truncate font-semibold"
          style={{ color: C.text, fontSize: 14 }}
        >
          {handle}
        </div>
        <DotsThreeIcon className="size-5 shrink-0" style={{ color: C.text }} aria-hidden />
      </div>

      {media.length > 0 ? (
        <PreviewMedia items={media.slice(0, 1)} aspect={aspect} background="#fafafa" />
      ) : (
        <div
          className="flex flex-col items-center justify-center gap-2 px-6 text-center"
          style={{ aspectRatio: aspect, background: '#fafafa', color: C.muted }}
        >
          <ImageIcon className="size-8" aria-hidden />
          <span style={{ fontSize: 13 }}>
            Instagram posts need an image or video — this one has none.
          </span>
        </div>
      )}

      <div className="flex items-center gap-4 px-3 pt-3" style={{ color: C.text }}>
        <HeartIcon className="size-6" aria-hidden />
        <ChatCircleIcon className="size-6" aria-hidden />
        <PaperPlaneTiltIcon className="size-6" aria-hidden />
        <BookmarkSimpleIcon className="ml-auto size-6" aria-hidden />
      </div>

      <div className="px-3 pt-2 pb-3">
        {/* The handle runs into the caption as one paragraph — Instagram does
            not put it on its own line, and it is the caption's first words
            that have to survive the fold. */}
        <FoldedText
          text={text}
          fold={PLATFORM_FOLDS.instagram}
          moreLabel="more"
          color={C.text}
          moreColor={C.muted}
          style={{ fontSize: 14, lineHeight: 1.2857 }}
          prefix={
            <span className="mr-1.5 font-semibold" style={{ color: C.text }}>
              {handle}
            </span>
          }
        />
        <div className="pt-1.5 uppercase" style={{ color: C.muted, fontSize: 10 }}>
          {timeLabel}
        </div>
      </div>
    </PreviewSurface>
  )
}
