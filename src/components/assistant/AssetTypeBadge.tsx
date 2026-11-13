import { useTranslation } from 'react-i18next'
import { HugeiconsIcon } from '@hugeicons/react'
import { Note01Icon } from '@hugeicons/core-free-icons'
import { cn } from '@/lib/styles'
import { KIND_ICON } from '@/components/content/AssetKindMark'
import { KIND_TONE } from '@/components/content/kindTone'
import type { AssetListKind } from '@/types/assetList'

/**
 * The assistant's results name an asset by its stored type (`PDF`, `DOC`,
 * `IMG`, `AUDIO`, `URL`, `MD`); the list names it by kind. One step between
 * them, so a citation and a list row draw the same mark.
 */
const TYPE_KIND: Record<string, AssetListKind> = {
  PDF: 'pdf',
  DOC: 'document',
  IMG: 'image',
  AUDIO: 'audio',
  URL: 'web',
  MD: 'note',
}

/**
 * An asset's kind as a small mark in its own ink — the coloured PDF beside a
 * cited page, the badge on an offer's source row (CON-476). A type this build
 * doesn't know draws the note's mark rather than nothing.
 */
export function AssetTypeBadge({
  type,
  size = 14,
  className,
}: {
  type: string | undefined
  size?: number
  className?: string
}) {
  const { t } = useTranslation()
  const kind = (type && TYPE_KIND[type.toUpperCase()]) || 'note'
  return (
    <HugeiconsIcon
      icon={KIND_ICON[kind] ?? Note01Icon}
      size={size}
      strokeWidth={1.5}
      role="img"
      aria-label={t(`content.list.kind.${kind}`)}
      className={cn(
        'shrink-0',
        KIND_TONE[kind] ?? 'text-kind-neutral',
        className,
      )}
    />
  )
}
