import type { ReactNode } from 'react'

/**
 * The document's surface, holding a message instead of a document.
 *
 * Both states that stand in for the editor — a page still being read
 * (`ScrapeState`) and an asset this screen won't open (`UnsupportedAsset`) —
 * sit on the same slab in the same column as the text they replace, so the
 * screen doesn't reshape itself around what happens to be missing. Shared
 * rather than copied because the two drift the moment the surface is restyled.
 */
export function AssetStateFrame({ children }: { children: ReactNode }) {
  return (
    <div className="flex w-content flex-col items-center gap-4 bg-primary px-10 py-16 text-center">
      {children}
    </div>
  )
}
