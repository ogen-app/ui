import { useTranslation } from 'react-i18next'
import { HugeiconsIcon, type IconSvgElement } from '@hugeicons/react'
import {
  AiTranscribeAudioIcon,
  Csv02Icon,
  Doc02Icon,
  Image01Icon,
  Link02Icon,
  Note01Icon,
  Pdf02Icon,
  Ppt02Icon,
  Xls02Icon,
} from '@hugeicons/core-free-icons'
import { cn } from '@/lib'
import type { AssetListItem, AssetListKind } from '@/types/assetList'
import { AssetPreview } from './AssetPreview'

/** Each kind's mark — the list's rows and the filter's Type values alike. */
export const KIND_ICON: Record<AssetListKind, IconSvgElement> = {
  pdf: Pdf02Icon,
  document: Doc02Icon,
  spreadsheet: Xls02Icon,
  csv: Csv02Icon,
  presentation: Ppt02Icon,
  web: Link02Icon,
  audio: AiTranscribeAudioIcon,
  image: Image01Icon,
  note: Note01Icon,
}

/**
 * What kind of thing a row is, once (CON-370): a bare mark, no box around
 * it — the box and a second thumbnail column said the same thing twice. An
 * image is the one kind whose picture says more than its mark, so it puts
 * its thumbnail in the slot, and the mark only when there is none to show.
 *
 * The kind is the server's (CON-374), which classifies from the type and the
 * file's MIME type so this never has to.
 *
 * 28px, in the kind's own colour (CON-378): it leads the title, so it reads
 * as part of the heading, and the colour sorts a long list by type at a
 * glance.
 */
/**
 * Each kind's colour, as the file type's conventional one (`--kind-*` in
 * `index.css`). A CSV is a spreadsheet; an image shows its own thumbnail, and
 * only falls back to the neutral mark.
 */
const KIND_TONE: Record<AssetListKind, string> = {
  pdf: 'text-kind-pdf',
  document: 'text-kind-doc',
  spreadsheet: 'text-kind-sheet',
  csv: 'text-kind-sheet',
  presentation: 'text-kind-slides',
  note: 'text-kind-note',
  web: 'text-kind-web',
  audio: 'text-kind-audio',
  image: 'text-kind-other',
}

export function AssetKindMark({
  asset,
}: {
  asset: Pick<AssetListItem, 'kind' | 'file'>
}) {
  const { t } = useTranslation()
  const mark = (
    <HugeiconsIcon
      icon={KIND_ICON[asset.kind] ?? Note01Icon}
      size={28}
      strokeWidth={1.5}
      role="img"
      aria-label={t(`content.list.kind.${asset.kind}`)}
      className={cn('shrink-0', KIND_TONE[asset.kind] ?? 'text-kind-other')}
    />
  )
  return asset.kind === 'image' ? (
    <AssetPreview asset={asset} fallback={mark} />
  ) : (
    mark
  )
}
