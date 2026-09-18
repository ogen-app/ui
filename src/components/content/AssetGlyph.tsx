import { assetKind } from '@/lib/assetKind'
import { cn } from '@/lib'
import type { Asset } from '@/types/content'
import { ASSET_KIND_ICON } from './assetKindIcons'

/**
 * What kind of document this is, before its title.
 *
 * A scraped page is text as far as reading it goes, but where it came from is
 * the one thing about it a reader can't infer from the title, so it gets its
 * own glyph rather than the note's (CON-222).
 *
 * Shared by every list that names documents — the content table, and a post's
 * Sources card — because the kind of a thing should not depend on which screen
 * is asking. The glyph itself comes from the same table the Foundation cards
 * count with (`assetKindIcons`), so a kind looks the same whether it is drawn
 * once beside a title or summed into "12 PDFs".
 */
export function AssetGlyph({
  asset,
  className,
}: {
  asset: Pick<Asset, 'type'>
  className?: string
}) {
  const Icon = ASSET_KIND_ICON[assetKind(asset)]
  return (
    <span
      className={cn(
        'flex size-8 shrink-0 items-center justify-center border border-quaternary',
        className,
      )}
    >
      <Icon className="size-6 text-tertiary-foreground" />
    </span>
  )
}
