import {
  ChatCircleIcon,
  DotsThreeIcon,
  HeartIcon,
  PaperPlaneTiltIcon,
  RepeatIcon,
} from '@phosphor-icons/react'
import { PLATFORM_FOLDS, charCount } from '@/lib/socialText.ts'
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
import type { PreviewAuthor, PreviewMediaItem, PreviewProps } from './types.ts'

/**
 * A Threads post, or a thread of them.
 *
 * Threads reads like X and behaves like Instagram: a 500-character cap that
 * is also the fold, and multi-image posts that swipe rather than tile. It
 * inherits the Instagram account, so the handle in the header is the same one
 * the Instagram card shows — worth seeing side by side, because that is the
 * account the post actually goes out as.
 *
 * A sequence is drawn as the chain it is (CON-196): one card per post, each
 * with the media that post carries. Unlike the X card there is no
 * blank-line fallback — `thread` only reaches this network with the feature
 * on, so either the editor hands over the posts or there is no chain.
 */
export function ThreadsPreview({
  text,
  media,
  author,
  timeLabel,
  charLimit,
  sequence,
}: PreviewProps) {
  const handle = author.username ?? author.name ?? 'your.account'
  const posts = sequence ?? [{ text, media }]

  return (
    <PreviewSurface style={{ borderRadius: 8 }}>
      {posts.map((post, i) => (
        <ThreadsPost
          key={i}
          text={post.text}
          media={post.media}
          handle={handle}
          author={author}
          timeLabel={timeLabel}
          charLimit={charLimit ?? null}
          // Within a chain the whole post is shown: hiding its tail behind
          // "more" would hide exactly the part that puts it over the limit.
          folded={!sequence}
          connector={i < posts.length - 1}
        />
      ))}
    </PreviewSurface>
  )
}

function ThreadsPost({
  text,
  media,
  handle,
  author,
  timeLabel,
  charLimit,
  folded,
  connector,
}: {
  text: string
  media: PreviewMediaItem[]
  handle: string
  author: PreviewAuthor
  timeLabel: string
  charLimit: number | null
  /** Draw the "more" fold, as a single post does. */
  folded: boolean
  /** Draw the line down to the next post of the chain. */
  connector: boolean
}) {
  const carousel = useCarousel(media.length)
  const count = charCount(text)
  const over = charLimit !== null && count > charLimit

  return (
    <div className="flex gap-2 p-3" style={{ paddingBottom: connector ? 0 : 12 }}>
      <div className="flex shrink-0 flex-col items-center">
        <PreviewAvatar src={author.avatarUrl} name={handle} size={36} background={C.muted} />
        {/* Threads' own thread line: what makes several cards read as one post
            rather than as unrelated ones in a feed. */}
        {connector && (
          <div className="mt-1 min-h-2 w-0.5 flex-1" style={{ background: C.dotMuted }} />
        )}
      </div>

      <div className={`min-w-0 flex-1 ${connector ? 'pb-3' : ''}`}>
        <div className="flex items-center gap-1.5" style={{ fontSize: 15 }}>
          <span className="min-w-0 truncate font-semibold" style={{ color: C.text }}>
            {handle}
          </span>
          <span className="ml-auto shrink-0" style={{ color: C.muted, fontSize: 14 }}>
            {timeLabel}
          </span>
          <DotsThreeIcon className="size-5 shrink-0" style={{ color: C.muted }} aria-hidden />
        </div>

        <div className="pt-0.5">
          {folded ? (
            <FoldedText
              text={text}
              fold={PLATFORM_FOLDS.threads}
              moreLabel="more"
              color={C.text}
              moreColor={C.muted}
              style={{ fontSize: 15, lineHeight: 1.3333 }}
            />
          ) : (
            <div
              className="whitespace-pre-wrap break-words"
              style={{ color: C.text, fontSize: 15, lineHeight: 1.3333 }}
            >
              {text}
            </div>
          )}
        </div>

        {/* An annotation rather than Threads chrome — the network simply
            refuses the post at 501 characters, so there is nothing authentic
            to reproduce, and "which post is too long" is unanswerable from the
            notes alone once a chain runs past a few posts. */}
        {!folded && over && (
          <div className="pt-1 font-semibold" style={{ color: C.danger, fontSize: 12 }}>
            {count}/{charLimit} characters — this post is too long
          </div>
        )}

        {media.length > 0 && (
          <div className="mt-2" style={{ borderRadius: 8, overflow: 'hidden' }}>
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

        <div className="flex items-center gap-4 pt-3" style={{ color: C.text }}>
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
            <CarouselDots carousel={carousel} activeColor={C.dot} mutedColor={C.dotMuted} />
          </div>
        )}
      </div>
    </div>
  )
}
