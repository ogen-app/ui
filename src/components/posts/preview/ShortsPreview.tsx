import { useState } from 'react'
import {
  ChatCircleIcon,
  DotsThreeOutlineIcon,
  MusicNotesIcon,
  ShareFatIcon,
  ThumbsDownIcon,
  ThumbsUpIcon,
} from '@phosphor-icons/react'
import { effectiveVideoTitle } from '@/lib/platformLimits.ts'
import { formatTimecode } from '@/lib/platformVideo.ts'
import { FoldedText, PlayMark, PreviewAvatar, PreviewSurface } from './previewParts.tsx'
import type { PreviewProps } from './types.ts'

/**
 * Where a Short folds its caption behind "more" — about two lines over the
 * video, far earlier than the watch page's 157.
 *
 * Local rather than in `PLATFORM_FOLDS`: that map is keyed by zernioId, and a
 * Short is a post type on YouTube rather than a network of its own.
 */
const SHORTS_FOLD = 60

/**
 * A YouTube Short.
 *
 * Not the watch page in a narrow frame, which is what it was until CON-169.
 * A Short is the same shape as a story: the video is the whole surface and
 * every piece of chrome sits *on* it — the actions run up the right edge, the
 * channel and title overlay the bottom. Drawing it as a watch page put the
 * title in a block that does not exist, the copy in a description box that
 * does not exist either, and sized the player like a landscape video.
 *
 * What the preview is for here is the overlay collision: the right rail and
 * the title block eat the bottom third of the frame, so a Short composed with
 * anything important down there loses it. That is invisible in the editor.
 *
 * Capped narrow for the same reason `StoryPreview` is — at the rail's full
 * width a 9:16 card runs past the fold of the panel itself.
 */
export function ShortsPreview({ text, title, media, author, timeLabel }: PreviewProps) {
  const [failed, setFailed] = useState(false)
  const channel = author.username ?? author.name ?? 'yourchannel'
  const item = media[0]
  const isVideo = item?.kind === 'video'
  // A Short's caption is its title — the same field the watch page previews,
  // through the same fallback chain.
  const caption = effectiveVideoTitle(title, text)

  return (
    <PreviewSurface
      className="mx-auto"
      /* Wider than a story's 260: the rail takes a strip off the right that a
         story does not have, and at 260 the channel handle truncated to
         nothing. */
      style={{ borderRadius: 12, background: '#000000', maxWidth: 300, width: '100%' }}
    >
      <div className="relative" style={{ aspectRatio: 9 / 16 }}>
        {item && !failed ? (
          <img
            src={item.url}
            alt=""
            onError={() => setFailed(true)}
            className="h-full w-full object-cover"
            style={{ display: 'block' }}
          />
        ) : (
          <div
            className="flex h-full w-full items-center justify-center px-6 text-center"
            style={{ background: '#1c1c1e', color: '#a8a8a8', fontSize: 13, lineHeight: 1.4 }}
          >
            {item
              ? isVideo
                ? 'No poster frame'
                : 'Image unavailable'
              : 'A Short is one vertical video, full screen. This post has none.'}
          </div>
        )}

        {/* Bottom scrim: white chrome over an unknown frame is unreadable
            without it, and YouTube does the same. */}
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0"
          style={{ height: 200, background: 'linear-gradient(rgba(0,0,0,0), rgba(0,0,0,0.65))' }}
        />

        {isVideo && <PlayMark size={44} />}

        {/* Top-right, not bottom-right: the rail owns that corner. YouTube
            shows no duration on a Short at all, but a Short is capped at three
            minutes and the length is the one thing that decides whether this
            publishes as a Short or as a plain video. */}
        {isVideo && item.durationMs > 0 && (
          <span
            className="absolute font-semibold text-white"
            style={{
              right: 8,
              top: 8,
              background: 'rgba(0,0,0,0.6)',
              borderRadius: 4,
              padding: '1px 4px',
              fontSize: 11,
              lineHeight: 1.3333,
            }}
          >
            {formatTimecode(item.durationMs)}
          </span>
        )}

        {/* The action rail. No counts: this post has never been published, and
            a card showing "12K" would be inventing an audience. */}
        <div
          className="absolute right-2 bottom-3 flex flex-col items-center gap-4 text-white"
          style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.5))' }}
          aria-hidden
        >
          <ThumbsUpIcon className="size-6" weight="fill" />
          <ThumbsDownIcon className="size-6" weight="fill" />
          <ChatCircleIcon className="size-6" weight="fill" />
          <ShareFatIcon className="size-6" weight="fill" />
          <DotsThreeOutlineIcon className="size-5" weight="fill" />
        </div>

        {/* Right padding clears the rail — text running under those buttons is
            exactly the mistake this preview exists to show. */}
        <div className="absolute inset-x-0 bottom-0 flex flex-col gap-2 px-3 pb-3" style={{ paddingRight: 52 }}>
          <div className="flex items-center gap-2">
            <PreviewAvatar
              src={author.avatarUrl}
              name={channel}
              size={24}
              background="rgba(255,255,255,0.25)"
            />
            <span
              className="min-w-0 truncate font-semibold text-white"
              style={{ fontSize: 13, textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}
            >
              @{channel}
            </span>
            <span
              className="shrink-0 rounded-full px-2 py-0.5 font-semibold"
              style={{ background: '#ffffff', color: '#0f0f0f', fontSize: 11 }}
              aria-hidden
            >
              Subscribe
            </span>
          </div>

          <FoldedText
            text={caption}
            fold={SHORTS_FOLD}
            moreLabel="more"
            color="#ffffff"
            moreColor="rgba(255,255,255,0.7)"
            style={{ fontSize: 13, lineHeight: 1.3846, textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}
          />

          {/* The sound row. Every Short has one, and on an upload it is the
              video's own audio — there is no track to name. */}
          <div className="flex items-center gap-1.5" style={{ color: '#ffffff' }}>
            <MusicNotesIcon className="size-3 shrink-0" weight="fill" aria-hidden />
            <span
              className="min-w-0 truncate"
              style={{ fontSize: 11, textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}
            >
              original audio · {timeLabel}
            </span>
          </div>
        </div>
      </div>
    </PreviewSurface>
  )
}
