import { useState } from 'react'
import type { ReactNode } from 'react'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { assetPreviewUrl } from '@/lib/assetPreview'
import type { Asset } from '@/types/content'

/**
 * What an image looks like, in the list's kind slot (CON-370) — and larger
 * while the pointer rests on it. `fallback` (the kind's mark) when there is
 * nothing to show.
 *
 * The enlargement reuses the same URL as the thumbnail, so it is already in
 * the browser's cache and appears at once — no second fetch, no flash of an
 * empty frame. A PDF page is portrait and the cell is square, so the small one
 * crops from the top, where the title of a document is.
 *
 * Not focusable, and so hover-only: the preview repeats what the row already
 * says in words, and a tab stop per row would be a real cost for it.
 */
export function AssetPreview({
  asset,
  fallback = null,
}: {
  asset: Asset
  fallback?: ReactNode
}) {
  const url = assetPreviewUrl(asset)
  // A stored thumbnail whose object has gone. Rare, and the honest answer is
  // the same as having none — never the browser's broken-image glyph.
  const [broken, setBroken] = useState(false)

  if (!url || broken) return fallback

  return (
    <Tooltip delayDuration={200}>
      <TooltipTrigger asChild>
        <span className="size-8 shrink-0 overflow-hidden border border-quaternary bg-secondary">
          <img
            src={url}
            alt=""
            loading="lazy"
            onError={() => setBroken(true)}
            className="size-full object-cover object-top"
          />
        </span>
      </TooltipTrigger>
      {/* Right of the row, so it never covers the title it belongs to. `p-1`
          makes the tooltip's own surface a frame around the picture; 400px is
          the cap on both sides, which keeps a portrait page and a wide hero
          image the same weight on screen.

          No arrow: this tooltip is the picture, and there is no ambiguity about
          which row it belongs to — it opens against the cell the pointer is
          already resting on. */}
      <TooltipContent
        side="right"
        sideOffset={8}
        showArrow={false}
        className="max-w-none p-1"
      >
        <img src={url} alt="" className="max-h-100 max-w-100 object-contain" />
      </TooltipContent>
    </Tooltip>
  )
}
