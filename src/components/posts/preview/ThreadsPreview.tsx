import {
  ChatCircleIcon,
  DotsThreeIcon,
  HeartIcon,
  PaperPlaneTiltIcon,
  RepeatIcon,
} from '@phosphor-icons/react'
import { PLATFORM_FOLDS } from '@/lib/socialText.ts'
import {
  CarouselDots,
  FoldedText,
  PreviewAvatar,
  PreviewCarousel,
  PreviewMedia,
  PreviewSurface,
  useCarousel,
} from './previewParts.tsx'
import { THREADS as C } from './previewTheme.ts'
import type { PreviewProps } from './types.ts'

/**
 * A Threads post.
 *
 * Threads reads like X and behaves like Instagram: a 500-character cap that
 * is also the fold, and multi-image posts that swipe rather than tile. It
 * inherits the Instagram account, so the handle in the header is the same one
 * the Instagram card shows — worth seeing side by side, because that is the
 * account the post actually goes out as.
 */
export function ThreadsPreview({
  text,
  media,
  author,
  timeLabel,
}: PreviewProps) {
  const handle = author.username ?? author.name ?? 'your.account'
  const carousel = useCarousel(media.length)

  return (
    <PreviewSurface style={{ borderRadius: 8 }}>
      <div className="flex gap-2 p-3">
        <PreviewAvatar
          src={author.avatarUrl}
          name={handle}
          size={36}
          background={C.muted}
        />

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5" style={{ fontSize: 15 }}>
            <span
              className="min-w-0 truncate font-semibold"
              style={{ color: C.text }}
            >
              {handle}
            </span>
            <span
              className="ml-auto shrink-0"
              style={{ color: C.muted, fontSize: 14 }}
            >
              {timeLabel}
            </span>
            <DotsThreeIcon
              className="size-5 shrink-0"
              style={{ color: C.muted }}
              aria-hidden
            />
          </div>

          <div className="pt-0.5">
            <FoldedText
              text={text}
              fold={PLATFORM_FOLDS.threads}
              moreLabel="more"
              color={C.text}
              moreColor={C.muted}
              style={{ fontSize: 15, lineHeight: 1.3333 }}
            />
          </div>

          {media.length > 0 && (
            <div
              className="mt-2"
              style={{ borderRadius: 8, overflow: 'hidden' }}
            >
              {media.length === 1 ? (
                <PreviewMedia items={media} background={C.surface} />
              ) : (
                <PreviewCarousel
                  carousel={carousel}
                  items={media}
                  // Threads shows the strip at the first image's shape and
                  // scrolls sideways; square is the closest single ratio and
                  // matches what Instagram will do with the same files.
                  aspect={1}
                  background={C.surface}
                  arrowColor={C.text}
                />
              )}
            </div>
          )}

          <div
            className="flex items-center gap-4 pt-3"
            style={{ color: C.text }}
          >
            <HeartIcon className="size-5" aria-hidden />
            <ChatCircleIcon className="size-5" aria-hidden />
            <RepeatIcon className="size-5" aria-hidden />
            <PaperPlaneTiltIcon className="size-5" aria-hidden />
          </div>

          {/* Below the actions rather than over the image: Threads' own dots
              sit under the strip, and an overlay would fight the photo. The
              wrapper is conditional too — `CarouselDots` renders nothing for a
              single image, but its padding would still push the card. */}
          {media.length > 1 && (
            <div className="pt-2">
              <CarouselDots
                carousel={carousel}
                activeColor={C.dot}
                mutedColor={C.dotMuted}
              />
            </div>
          )}
        </div>
      </div>
    </PreviewSurface>
  )
}
