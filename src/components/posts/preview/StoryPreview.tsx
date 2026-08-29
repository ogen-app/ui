import { useState } from 'react'
import { HeartIcon, PaperPlaneTiltIcon } from '@phosphor-icons/react'
import { PreviewAvatar, PreviewSurface, VideoChrome } from './previewParts.tsx'
import type { PreviewProps, StoryNetwork } from './types.ts'

/**
 * An Instagram or Facebook story.
 *
 * The only preview here that is not a feed card, because a story is not a feed
 * post: it is a fullscreen 9:16 frame that plays for a few seconds and takes no
 * caption at all. Drawing it as a feed card — square crop, text underneath —
 * was wrong in the two ways that matter most: it showed copy that never
 * publishes, and it showed a crop the reader will never see.
 *
 * Both networks render stories near-identically, so one card covers them; the
 * reply bar is the only place they differ enough to name.
 *
 * The frame is capped narrow on purpose. At the rail's full width a 9:16 card
 * runs past the fold of the panel itself, and the point of the shape is to see
 * it whole.
 */
export function StoryPreview({
  media,
  author,
  timeLabel,
  network,
}: PreviewProps & { network: StoryNetwork }) {
  const [failed, setFailed] = useState(false)
  const handle = author.username ?? author.name ?? 'your.account'
  const item = media[0]
  const url = item?.url
  // Most stories are video, so this is the common case rather than the edge
  // one: without the play mark the card reads as a photo story, which is a
  // different post.
  const isVideo = item?.kind === 'video'

  return (
    <PreviewSurface
      className="mx-auto"
      style={{
        borderRadius: 12,
        background: '#000000',
        maxWidth: 260,
        width: '100%',
      }}
    >
      <div className="relative" style={{ aspectRatio: 9 / 16 }}>
        {url && !failed ? (
          // Cropped to fill, which is what the network does — a portrait photo
          // survives this and a landscape one loses its sides. Seeing which is
          // the whole reason to preview a story.
          <img
            src={url}
            alt=""
            onError={() => setFailed(true)}
            className="h-full w-full object-cover"
            style={{ display: 'block' }}
          />
        ) : (
          <div
            className="flex h-full w-full items-center justify-center px-6 text-center"
            style={{
              background: '#1c1c1e',
              color: '#a8a8a8',
              fontSize: 13,
              lineHeight: 1.4,
            }}
          >
            {url
              ? isVideo
                ? 'No poster frame'
                : 'Image unavailable'
              : 'A story is one photo or video, full screen. This post has none.'}
          </div>
        )}

        {/* Scrims, not decoration: white chrome over an unknown photo is
            unreadable without them, and the networks do the same. */}
        <div
          className="pointer-events-none absolute inset-x-0 top-0"
          style={{
            height: 96,
            background: 'linear-gradient(rgba(0,0,0,0.45), rgba(0,0,0,0))',
          }}
        />
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0"
          style={{
            height: 96,
            background: 'linear-gradient(rgba(0,0,0,0), rgba(0,0,0,0.45))',
          }}
        />

        {/* After the scrims so the bottom gradient does not wash the badge out,
            and lifted clear of the reply bar so the running time never lands on
            "Send message". A story's length is worth seeing: the networks cap a
            single segment, and a file past that gets cut in two. */}
        {isVideo && (
          <VideoChrome
            durationMs={item.durationMs}
            size={44}
            badgeBottom={48}
          />
        )}

        {/* One segment: the server takes exactly one attachment for a story
            (`platforms.postTypeRules`), so there is never a second bar. */}
        <div
          className="absolute inset-x-2 top-2 rounded-full"
          style={{ height: 2, background: 'rgba(255,255,255,0.85)' }}
        />

        <div className="absolute inset-x-2 top-5 flex items-center gap-2">
          <PreviewAvatar
            src={author.avatarUrl}
            name={handle}
            size={28}
            background="rgba(255,255,255,0.25)"
          />
          <span
            className="min-w-0 truncate font-semibold text-white"
            style={{ fontSize: 13, textShadow: '0 1px 2px rgba(0,0,0,0.4)' }}
          >
            {handle}
          </span>
          <span
            className="shrink-0"
            style={{ color: 'rgba(255,255,255,0.75)', fontSize: 12 }}
          >
            {timeLabel}
          </span>
        </div>

        <div className="absolute inset-x-3 bottom-3 flex items-center gap-2">
          <div
            className="min-w-0 flex-1 truncate rounded-full px-3 py-1.5"
            style={{
              border: '1px solid rgba(255,255,255,0.6)',
              color: 'rgba(255,255,255,0.85)',
              fontSize: 12,
            }}
          >
            {network === 'instagram' ? 'Send message' : 'Reply to story'}
          </div>
          <HeartIcon className="size-5 shrink-0 text-white" aria-hidden />
          <PaperPlaneTiltIcon
            className="size-5 shrink-0 text-white"
            aria-hidden
          />
        </div>
      </div>
    </PreviewSurface>
  )
}
