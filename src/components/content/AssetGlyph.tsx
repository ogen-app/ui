import {
  FilePdfIcon,
  GlobeSimpleIcon,
  ImageSquareIcon,
  NoteIcon,
} from '@phosphor-icons/react'
import { assetCategory } from '@/lib/assetCategory'
import { cn } from '@/lib'
import type { Asset } from '@/types/content'

/**
 * What kind of document this is, before its title.
 *
 * A scraped page is text as far as the categories go, but where it came from
 * is the one thing about it a reader can't infer from the title, so it gets
 * its own glyph rather than the note's (CON-222).
 *
 * Shared by every list that names documents — the content table, and a post's
 * Sources card — because the kind of a thing should not depend on which screen
 * is asking.
 */
export function AssetGlyph({
  asset,
  className,
}: {
  asset: Pick<Asset, 'type'>
  className?: string
}) {
  const category = assetCategory(asset)
  const Icon =
    asset.type === 'URL'
      ? GlobeSimpleIcon
      : category === 'files'
        ? FilePdfIcon
        : category === 'imagery'
          ? ImageSquareIcon
          : NoteIcon
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
