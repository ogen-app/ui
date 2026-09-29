import type { TFunction } from 'i18next'
import type { Icon } from '@phosphor-icons/react'
import {
  FileAudioIcon,
  FilePdfIcon,
  FileTextIcon,
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
  document: FileTextIcon,
  image: ImageSquareIcon,
  audio: FileAudioIcon,
}

/**
 * What to call a kind, in the reader's language — singular or plural by
 * `count` (`content.kinds.*`).
 */
export function assetKindNoun(
  t: TFunction,
  kind: AssetKind,
  count: number,
): string {
  return t(`content.kinds.${kind}`, { count })
}
