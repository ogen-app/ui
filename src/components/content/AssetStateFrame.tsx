import type { ReactNode } from 'react'
import { cn } from '@/lib'

/**
 * The document's surface, holding a message instead of a document.
 *
 * Both states that stand in for the editor — a page still being read
 * (`ScrapeState`) and an asset this screen won't open (`UnsupportedAsset`) —
 * sit on the same slab in the same column as the text they replace, so the
 * screen doesn't reshape itself around what happens to be missing. Shared
 * rather than copied because the two drift the moment the surface is restyled.
 *
 * Always inside a surface that is already there — the asset page's Source tab
 * (CON-366) — so it takes the width it is given and brings no slab of its own.
 */
export function AssetStateFrame({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center gap-4 text-center',
        'w-full py-12',
        className,
      )}
    >
      {children}
    </div>
  )
}
