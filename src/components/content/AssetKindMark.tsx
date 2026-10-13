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
  Xls02Icon,
} from '@hugeicons/core-free-icons'
import { listKind, type ListKind } from '@/lib/assetList'
import type { Asset } from '@/types/content'
import { AssetPreview } from './AssetPreview'

const KIND_ICON: Record<ListKind, IconSvgElement> = {
  pdf: Pdf02Icon,
  document: Doc02Icon,
  spreadsheet: Xls02Icon,
  csv: Csv02Icon,
  page: Link02Icon,
  audio: AiTranscribeAudioIcon,
  image: Image01Icon,
  note: Note01Icon,
}

/**
 * What kind of thing a row is, once (CON-370): a bare mark, no box around
 * it — the box and a second thumbnail column said the same thing twice. An
 * image is the one kind whose picture says more than its mark, so it puts
 * its thumbnail in the slot, and the mark only when there is none to show.
 */
export function AssetKindMark({ asset }: { asset: Asset }) {
  const { t } = useTranslation()
  const kind = listKind(asset)
  const mark = (
    <HugeiconsIcon
      icon={KIND_ICON[kind]}
      size={22}
      strokeWidth={1.5}
      role="img"
      aria-label={t(`content.list.kind.${kind}`)}
      className="shrink-0 text-secondary-foreground"
    />
  )
  return kind === 'image' ? (
    <AssetPreview asset={asset} fallback={mark} />
  ) : (
    mark
  )
}
