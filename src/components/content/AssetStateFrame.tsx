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
 * `inset` is the same message placed *inside* a slab that is already there —
 * under a title, beside a player. The slab is the column's full width plus its
 * own padding, so nesting one in another pushes it past the column's edge.
 */
export function AssetStateFrame({
  children,
  inset = false,
  className,
}: {
  children: ReactNode
  inset?: boolean
  className?: string
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center gap-4 text-center',
        inset ? 'w-full py-12' : 'w-content bg-primary px-10 py-16',
        className,
      )}
    >
      {children}
    </div>
  )
}
