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
import {
  CarouselDots,
  FoldedText,
  PreviewAvatar,
  PreviewCarousel,
  PreviewMedia,
  PreviewSurface,
  useCarousel,
} from './previewParts.tsx'
import { INSTAGRAM as C } from './previewTheme.ts'
import type { PreviewProps } from './types.ts'

/**
 * An Instagram feed post.
 *
 * Instagram inverts the other two: the image is the post and the caption is a
 * footnote, folded after ~125 characters. It also cannot publish without
 * media at all, so the media slot shows that as a blocker rather than
 * quietly rendering a text-only card that could never exist.
 *
 * More than one image is a carousel, and it is drawn as one — CON-144. The
 * old card showed the first frame and nothing else, which said "your other
 * nine images are gone" to anyone reading it literally. What a carousel
 * preview is actually for is the crop: every slide is squared to the *first*
 * slide's ratio, so a portrait shot in position four loses its top and
 * bottom, and there is nowhere else in the app to see that happen.
 */
export function InstagramPreview({ text, media, postType, author, timeLabel }: PreviewProps) {
  const handle = author.username ?? author.name ?? 'your.account'
  const carousel = useCarousel(media.length)
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

      {media.length === 0 ? (
        <div
          className="flex flex-col items-center justify-center gap-2 px-6 text-center"
          style={{ aspectRatio: aspect, background: C.surface, color: C.muted }}
        >
          <ImageIcon className="size-8" aria-hidden />
          <span style={{ fontSize: 13 }}>
            Instagram posts need an image or video — this one has none.
          </span>
        </div>
      ) : media.length === 1 ? (
        <PreviewMedia items={media} aspect={aspect} background={C.surface} />
      ) : (
        <PreviewCarousel
          carousel={carousel}
          items={media}
          aspect={aspect}
          background={C.surface}
          arrowColor={C.text}
        />
      )}

      {/* The dots sit in the action row, centred, exactly as Instagram places
          them — which is why the carousel's index lives in this component
          rather than inside the media block. */}
      <div className="relative flex items-center gap-4 px-3 pt-3" style={{ color: C.text }}>
        <HeartIcon className="size-6" aria-hidden />
        <ChatCircleIcon className="size-6" aria-hidden />
        <PaperPlaneTiltIcon className="size-6" aria-hidden />
        <div className="absolute inset-x-0 flex justify-center">
          <CarouselDots carousel={carousel} activeColor={C.dot} mutedColor={C.dotMuted} />
        </div>
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
