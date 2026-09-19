import type { Icon } from '@phosphor-icons/react'
import {
  FilePdfIcon,
  GlobeSimpleIcon,
  ImageSquareIcon,
  NoteIcon,
} from '@phosphor-icons/react'
import type { AssetKind } from '@/lib/assetKind'

/** The mark for each kind of document, drawn wherever a kind is named. */
export const ASSET_KIND_ICON: Record<AssetKind, Icon> = {
  text: NoteIcon,
  page: GlobeSimpleIcon,
  pdf: FilePdfIcon,
  image: ImageSquareIcon,
}

/**
 * What to call a kind, singular and plural.
 *
 * "Text files" rather than "notes" for the first: it holds both the notes
 * written here and the markdown files uploaded, and calling an upload a note
 * would be the summary quietly disagreeing with the row it stands for.
 */
export const ASSET_KIND_NOUN: Record<AssetKind, [one: string, many: string]> = {
  text: ['text file', 'text files'],
  page: ['web page', 'web pages'],
  pdf: ['PDF', 'PDFs'],
  image: ['image', 'images'],
}

export function assetKindNoun(kind: AssetKind, count: number): string {
  const [one, many] = ASSET_KIND_NOUN[kind]
  return count === 1 ? one : many
}
