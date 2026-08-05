import { PlayIcon } from '@phosphor-icons/react'
import { useState, type CSSProperties, type ReactNode } from 'react'
import { CaretLeftIcon, CaretRightIcon } from '@phosphor-icons/react'
import { cn } from '@/lib'
import { formatTimecode } from '@/lib/platformVideo.ts'
import { foldText } from '@/lib/socialText.ts'
import { PREVIEW_BORDER, PREVIEW_FONT, PREVIEW_SHADOW } from './previewTheme.ts'
import type { PreviewMediaItem } from './types.ts'

/**
 * Pieces shared by the platform previews. Everything here is styled with
 * inline `style` and raw colours on purpose — see `previewTheme.ts` for why
 * these components sit outside the token system.
 */

/**
 * The card the whole preview sits in. Fixes the font so our UI font never
 * leaks in, and carries the shared border and shadow — `style` can override
 * anything platform-specific (the corner radius does).
 */
export function PreviewSurface({
  children,
  style,
  className,
}: {
  children: ReactNode
  style?: CSSProperties
  className?: string
}) {
  return (
    <div
      className={cn('overflow-hidden text-left', className)}
      style={{
        fontFamily: PREVIEW_FONT,
        background: '#ffffff',
        border: `1px solid ${PREVIEW_BORDER}`,
        boxShadow: PREVIEW_SHADOW,
        ...style,
      }}
    >
      {children}
    </div>
  )
}

/**
 * Round profile picture, falling back to the account's initial. Social feeds
 * always show *something* here, so an empty circle would misrepresent the post
 * more than a placeholder does.
 */
export function PreviewAvatar({
  src,
  name,
  size,
  rounded = true,
  background,
}: {
  src?: string | null
  name: string
  size: number
  rounded?: boolean
  background: string
}) {
  const [failed, setFailed] = useState(false)
  const initial = name.trim().charAt(0).toUpperCase() || '?'

  if (!src || failed) {
    return (
      <div
        aria-hidden
        className="flex shrink-0 items-center justify-center font-semibold text-white"
        style={{
          width: size,
          height: size,
          borderRadius: rounded ? '50%' : 4,
          background,
          fontSize: size * 0.45,
        }}
      >
        {initial}
      </div>
    )
  }

  return (
    <img
      src={src}
      alt=""
      onError={() => setFailed(true)}
      className="shrink-0 object-cover"
      style={{ width: size, height: size, borderRadius: rounded ? '50%' : 4 }}
    />
  )
}

/**
 * Post copy with the platform's own truncation. The fold is the single most
 * useful thing a preview can show — it is where the reader decides whether to
 * keep reading, and it is invisible in the editor.
 *
 * Expanding is local and one-way: the point is to see where the cut lands, and
 * a collapse control would just add a second thing to click.
 */
export function FoldedText({
  text,
  fold,
  moreLabel,
  color,
  moreColor,
  style,
  prefix,
}: {
  text: string
  fold: number
  moreLabel: string
  color: string
  moreColor: string
  style?: CSSProperties
  /**
   * Rendered inline immediately before the text — Instagram's handle, which
   * runs into the caption as one paragraph rather than sitting above it.
   */
  prefix?: ReactNode
}) {
  const [expanded, setExpanded] = useState(false)
  const { head, rest } = foldText(text, fold)

  return (
    <div
      className="whitespace-pre-wrap break-words"
      style={{ color, fontSize: 14, lineHeight: 1.4286, ...style }}
    >
      {prefix}
      {expanded ? text : head}
      {rest && !expanded && (
        <>
          {'… '}
          <button
            type="button"
            onClick={() => setExpanded(true)}
            className="cursor-pointer hover:underline"
            style={{ color: moreColor }}
          >
            {moreLabel}
          </button>
        </>
      )}
    </div>
  )
}

/** The hairline the feeds leave between tiles in a multi-image post. */
const TILE_GAP = 2

/**
 * The image block. Layouts follow what the feeds actually do with 1–4+ images:
 * one fills the width, two split it, three give the first the left half, and
 * past four the rest collapse into a "+N" tile. Getting this roughly right
 * matters because it decides which image the reader sees first.
 */
export function PreviewMedia({
  items,
  aspect,
  background,
}: {
  items: PreviewMediaItem[]
  /** CSS aspect-ratio for the block as a whole. */
  aspect?: number
  background: string
}) {
  if (items.length === 0) return null

  const shown = items.slice(0, 4)
  const overflow = items.length - shown.length

  if (shown.length === 1) {
    return (
      <div style={{ background, overflow: 'hidden' }}>
        <Frame item={shown[0]} aspect={aspect} />
      </div>
    )
  }

  // Three images read best as one large plus a stacked pair; two and four are
  // even splits.
  const featured = shown.length === 3

  return (
    <div
      className="grid"
      style={{
        gap: TILE_GAP,
        background,
        overflow: 'hidden',
        gridTemplateColumns: '1fr 1fr',
        aspectRatio: aspect ?? (shown.length === 2 ? 2 : 1.2),
      }}
    >
      {featured ? (
        <>
          <Frame item={shown[0]} fill />
          {/* h-full + min-h-0: without them the nested rows size to the
              images' intrinsic height instead of splitting the column, and
              the lower one comes out shorter than the upper. */}
          <div
            className="grid h-full min-h-0"
            style={{ gap: TILE_GAP, gridTemplateRows: '1fr 1fr' }}
          >
            <Frame item={shown[1]} fill />
            <Frame item={shown[2]} fill />
          </div>
        </>
      ) : (
        shown.map((item, i) => (
          <Frame
            key={`${item.url}-${i}`}
            item={item}
            fill
            overlay={overflow > 0 && i === shown.length - 1 ? `+${overflow}` : undefined}
          />
        ))
      )}
    </div>
  )
}

/**
 * A carousel's position, held by the platform card rather than by the media
 * block. Instagram puts its dots in the action row, two elements below the
 * image, so the index has to be reachable from both.
 */
export type Carousel = {
  index: number
  count: number
  go: (index: number) => void
  next: () => void
  prev: () => void
}

export function useCarousel(count: number): Carousel {
  const [raw, setRaw] = useState(0)
  // Clamped on read: deleting an attachment can shrink the list under a
  // stored index, and a blank frame would look like a broken image.
  const index = count === 0 ? 0 : Math.min(raw, count - 1)
  return {
    index,
    count,
    go: setRaw,
    next: () => setRaw(Math.min(index + 1, Math.max(0, count - 1))),
    prev: () => setRaw(Math.max(index - 1, 0)),
  }
}

/**
 * A swipeable multi-image post — Instagram's carousel and Threads' image
 * strip.
 *
 * The grid in `PreviewMedia` is the wrong shape for these networks: they show
 * one slide at a time and the reader moves through them, so what the preview
 * has to answer is "which image leads, and what does slide 3 look like in
 * this crop" — not "how do four tiles pack". Every slide is drawn at the same
 * aspect ratio, which is also what Instagram does to them.
 */
export function PreviewCarousel({
  carousel,
  items,
  aspect,
  background,
  arrowColor = '#262626',
}: {
  carousel: Carousel
  items: PreviewMediaItem[]
  aspect: number
  background: string
  /** Arrow glyph colour; the chip behind it is always white. */
  arrowColor?: string
}) {
  const { index, count } = carousel

  return (
    <div className="relative" style={{ background, overflow: 'hidden' }}>
      <Frame item={items[index]} aspect={aspect} />

      {count > 1 && (
        <>
          {/* Position, in the platform's own words. The dots below say the
              same thing, but stop being countable past five or six slides —
              which is exactly when a carousel needs a counter. */}
          <div
            className="absolute right-2 top-2 rounded-full px-2 py-0.5 font-semibold text-white"
            style={{ background: 'rgba(0,0,0,0.6)', fontSize: 12 }}
          >
            {index + 1}/{count}
          </div>
          {index > 0 && (
            <CarouselArrow side="left" color={arrowColor} onClick={carousel.prev} />
          )}
          {index < count - 1 && (
            <CarouselArrow side="right" color={arrowColor} onClick={carousel.next} />
          )}
        </>
      )}
    </div>
  )
}

function CarouselArrow({
  side,
  color,
  onClick,
}: {
  side: 'left' | 'right'
  color: string
  onClick: () => void
}) {
  const Icon = side === 'left' ? CaretLeftIcon : CaretRightIcon
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={side === 'left' ? 'Previous image' : 'Next image'}
      className={cn(
        'absolute top-1/2 flex size-6 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full',
        'opacity-80 transition-opacity hover:opacity-100',
        side === 'left' ? 'left-2' : 'right-2',
      )}
      style={{ background: 'rgba(255,255,255,0.9)', color }}
    >
      <Icon className="size-4" weight="bold" aria-hidden />
    </button>
  )
}

/** The slide indicator. Rendered by the card, wherever that network puts it. */
export function CarouselDots({
  carousel,
  activeColor,
  mutedColor,
}: {
  carousel: Carousel
  activeColor: string
  mutedColor: string
}) {
  if (carousel.count < 2) return null

  return (
    <div className="flex items-center justify-center gap-1">
      {Array.from({ length: carousel.count }, (_, i) => (
        <button
          key={i}
          type="button"
          onClick={() => carousel.go(i)}
          aria-label={`Image ${i + 1}`}
          className="size-1.5 shrink-0 cursor-pointer rounded-full"
          style={{ background: i === carousel.index ? activeColor : mutedColor }}
        />
      ))}
    </div>
  )
}

/**
 * One media tile: the image (or a video's poster) with the failure fallback
 * and the video chrome. Every card that shows media renders it through this,
 * so a broken URL degrades the same way everywhere.
 */
export function Frame({
  item,
  aspect,
  fill,
  overlay,
  chromeSize,
}: {
  item: PreviewMediaItem
  aspect?: number
  fill?: boolean
  overlay?: string
  /** Play-mark diameter override — the watch page wants a bigger one. */
  chromeSize?: number
}) {
  const [failed, setFailed] = useState(false)
  const isVideo = item.kind === 'video'

  return (
    <div
      /* `h-full` with `fill`: a grid cell stretches the tile anyway, but a
         block parent (the watch page's player) needs it said explicitly. */
      className={cn('relative min-h-0 overflow-hidden', fill && 'h-full')}
      style={{ aspectRatio: fill ? undefined : aspect }}
    >
      {failed ? (
        <div
          className="flex h-full w-full items-center justify-center text-xs"
          style={{ background: '#e4e6eb', color: '#65676b', minHeight: 80 }}
        >
          {isVideo ? 'No poster frame' : 'Image unavailable'}
        </div>
      ) : (
        <img
          src={item.url}
          alt=""
          onError={() => setFailed(true)}
          /* Cropped to fill only when something gives this frame a height — a
             grid cell or an aspect ratio. Facebook shows a lone image at its
             natural shape, and `h-full` against an auto-height parent would
             collapse it. */
          className={cn('w-full', fill || aspect ? 'h-full object-cover' : 'h-auto')}
          style={{ display: 'block' }}
        />
      )}
      {/* Outside the failed branch on purpose: a video with no poster is still
          a video, and the play mark is what says so. */}
      {isVideo && !overlay && <VideoChrome durationMs={item.durationMs} size={chromeSize} />}
      {overlay && (
        <div
          className="absolute inset-0 flex items-center justify-center text-2xl font-semibold text-white"
          style={{ background: 'rgba(0,0,0,0.45)' }}
        >
          {overlay}
        </div>
      )}
    </div>
  )
}

/**
 * The circular play mark laid over a poster frame.
 *
 * Split out from `VideoChrome` because a Short wants the mark without the
 * corner badge: its right rail already owns that corner, so the running time
 * has to go somewhere else.
 */
export function PlayMark({ size = 48 }: { size?: number }) {
  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
      <div
        className="flex items-center justify-center rounded-full"
        style={{ width: size, height: size, background: 'rgba(0,0,0,0.55)' }}
      >
        <PlayIcon
          weight="fill"
          color="#ffffff"
          size={size * 0.42}
          /* The glyph's bounding box is wider than the triangle, so it reads
             left-of-centre in a circle unless it is nudged back. */
          style={{ marginLeft: size * 0.04 }}
          aria-hidden
        />
      </div>
    </div>
  )
}

/**
 * What turns a poster frame back into a video: the play mark every feed puts
 * over one, and the running time in the corner.
 *
 * The duration is omitted at `0` rather than drawn as "0:00" — zero means the
 * probe never ran, and a card claiming a zero-second video would be a lie
 * about the file rather than about the platform.
 */
export function VideoChrome({
  durationMs,
  size = 48,
  badgeBottom = 8,
}: {
  durationMs: number
  /** Diameter of the play mark; the watch page wants a bigger one. */
  size?: number
  /**
   * How far the running time sits off the bottom of the frame. A story keeps
   * its own chrome down there — the reply bar — and the badge has to clear it.
   */
  badgeBottom?: number
}) {
  return (
    <>
      <PlayMark size={size} />
      {durationMs > 0 && (
        <span
          className="absolute font-semibold text-white"
          style={{
            right: 8,
            bottom: badgeBottom,
            background: 'rgba(0,0,0,0.8)',
            borderRadius: 4,
            padding: '1px 4px',
            fontSize: 12,
            lineHeight: 1.3333,
          }}
        >
          {formatTimecode(durationMs)}
        </span>
      )}
    </>
  )
}

/** One of the Like / Comment / Share style buttons along the card's foot. */
export function ActionRow({ children, color }: { children: ReactNode; color: string }) {
  return (
    <div
      className="flex items-center justify-around"
      style={{ borderTop: `1px solid ${PREVIEW_BORDER}`, color, padding: '4px 8px' }}
    >
      {children}
    </div>
  )
}

export function Action({ icon, label }: { icon: ReactNode; label?: string }) {
  return (
    <span
      className="flex items-center justify-center gap-1.5 rounded px-3 py-2 text-[13px] font-semibold"
      aria-hidden
    >
      {icon}
      {label}
    </span>
  )
}
