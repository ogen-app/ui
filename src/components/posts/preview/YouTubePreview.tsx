import {
  ArrowBendUpRightIcon,
  ThumbsDownIcon,
  ThumbsUpIcon,
  VideoCameraIcon,
} from '@phosphor-icons/react'
import type { ReactNode } from 'react'
import { effectiveVideoTitle } from '@/lib/platformLimits.ts'
import { PLATFORM_FOLDS } from '@/lib/socialText.ts'
import { frameAspect } from './frames.ts'
import { FoldedText, Frame, PreviewAvatar, PreviewSurface } from './previewParts.tsx'
import { YOUTUBE as C } from './previewTheme.ts'
import type { PreviewProps } from './types.ts'

/**
 * A YouTube watch page.
 *
 * Deliberately not a variant of the three feed cards. YouTube inverts what the
 * feeds do with a post: the title is the headline (the feeds have no title at
 * all, and the panel's notes say so), the copy becomes a description folded
 * into a box *below* the player, and the media is the page rather than an
 * attachment to it. Reusing a feed card here would misrepresent all three.
 */
export function YouTubePreview({
  text,
  title,
  media,
  postType,
  author,
  timeLabel,
}: PreviewProps) {
  const channel = author.name ?? 'Your channel'
  // Whatever leads the post. Normally a video — but a Community post carries
  // a picture, and stamping a play mark on one would claim something the
  // published post does not do.
  const lead = media[0]
  // What YouTube will actually title the video — a post with no title still
  // publishes, just not under a name anyone chose.
  const heading = effectiveVideoTitle(title, text)
  // A Short is the same page in a vertical frame. The rest of the layout
  // survives the difference well enough to be worth keeping.
  const aspect = frameAspect(postType, 16 / 9)

  return (
    <PreviewSurface style={{ borderRadius: 12 }}>
      <div className="relative" style={{ aspectRatio: aspect, background: '#000000' }}>
        {lead ? (
          /* `fill`: the player div above already fixes the aspect, and Frame
             brings the broken-URL fallback the raw <img> here used to lack. */
          <Frame item={lead} fill chromeSize={64} />
        ) : (
          <div
            className="flex h-full w-full flex-col items-center justify-center gap-2 px-6 text-center"
            style={{ color: '#aaaaaa' }}
          >
            <VideoCameraIcon className="size-8" aria-hidden />
            <span style={{ fontSize: 13 }}>No video attached yet.</span>
          </div>
        )}
      </div>

      <div className="px-3 pt-3">
        <h4
          className="line-clamp-2 font-semibold"
          style={{ color: C.text, fontSize: 18, lineHeight: 1.4 }}
        >
          {heading}
        </h4>
      </div>

      <div className="flex items-center gap-2 px-3 pt-3">
        <PreviewAvatar src={author.avatarUrl} name={channel} size={36} background={C.brand} />
        <div
          className="min-w-0 flex-1 truncate font-semibold"
          style={{ color: C.text, fontSize: 14 }}
        >
          {channel}
        </div>
        <span
          className="shrink-0 rounded-full px-3 py-1.5 font-semibold text-white"
          style={{ background: C.subscribe, fontSize: 13 }}
          aria-hidden
        >
          Subscribe
        </span>
      </div>

      <div className="flex gap-2 px-3 pt-3">
        <Chip>
          <ThumbsUpIcon className="size-4" aria-hidden />
          <span
            style={{ borderLeft: `1px solid #d9d9d9`, paddingLeft: 8, marginLeft: 2 }}
          >
            <ThumbsDownIcon className="size-4" aria-hidden />
          </span>
        </Chip>
        <Chip>
          <ArrowBendUpRightIcon className="size-4" aria-hidden />
          Share
        </Chip>
      </div>

      <div className="px-3 pt-3 pb-3">
        {/* The description box: everything the copy becomes on YouTube. It
            folds after roughly two lines behind "...more", which is the whole
            reason the first sentence matters here. */}
        <div style={{ background: C.chip, borderRadius: 12, padding: 12 }}>
          <div className="font-semibold" style={{ color: C.text, fontSize: 14 }}>
            {timeLabel}
          </div>
          {text.trim() ? (
            <FoldedText
              text={text}
              fold={PLATFORM_FOLDS.youtube}
              /* YouTube writes this as "...more"; `FoldedText` already emits
                 the ellipsis, so the label is just the word. */
              moreLabel="more"
              color={C.text}
              moreColor={C.text}
              style={{ fontSize: 14, lineHeight: 1.4286, marginTop: 4 }}
            />
          ) : (
            <div style={{ color: C.muted, fontSize: 14, marginTop: 4 }}>
              No description yet.
            </div>
          )}
        </div>
      </div>
    </PreviewSurface>
  )
}

/** One of the rounded grey pills along the top of the watch page's actions. */
function Chip({ children }: { children: ReactNode }) {
  return (
    <span
      className="flex items-center gap-2 rounded-full px-3 py-1.5 font-semibold"
      style={{ background: C.chip, color: C.text, fontSize: 13 }}
      aria-hidden
    >
      {children}
    </span>
  )
}