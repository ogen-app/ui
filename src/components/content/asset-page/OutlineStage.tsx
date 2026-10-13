import { useTranslation } from 'react-i18next'
import { ASSET_KIND_ICON } from '@/components/content/assetKindIcons'
import { cn } from '@/lib'
import type { DocumentOutline } from '@/lib/documentOutline'

/**
 * A Word file's or a deck's picture (CON-366): its outline, since there is no
 * thumbnail to show. A deck lists its slides by title and number; a document
 * its headings, indented. The format and file name sit above it, as on the
 * plain tile this replaces once the chunks are in.
 */
export function OutlineStage({
  outline,
  format,
  fileName,
}: {
  outline: DocumentOutline
  format: string | null
  fileName: string | null
}) {
  const { t } = useTranslation()
  const Icon = ASSET_KIND_ICON.document
  return (
    <div className="relative flex aspect-[16/10] max-h-56 w-full flex-col gap-4 overflow-hidden border-b border-quaternary bg-secondary px-7 py-6 lg:max-h-none">
      <div className="flex min-w-0 items-center gap-2 text-xs text-secondary-foreground">
        <Icon className="size-4 shrink-0" aria-hidden />
        {format && <span className="shrink-0 font-medium">{format}</span>}
        {fileName && <span className="truncate">{fileName}</span>}
      </div>
      <div className="flex flex-col gap-1">
        <p className="text-[11px] font-medium text-secondary-foreground">
          {outline.kind === 'slides'
            ? t('assetInsights.outline.slides')
            : t('assetInsights.outline.contents')}
        </p>
        <ol className="flex flex-col gap-1.5">
          {outline.items.map((item, i) => (
            <li
              key={i}
              className={cn(
                'flex min-w-0 items-baseline gap-2 text-[13px]',
                item.depth === 0
                  ? 'font-medium text-foreground'
                  : 'text-secondary-foreground',
              )}
              style={{ paddingLeft: `${Math.min(item.depth, 3) * 14}px` }}
            >
              {item.number !== undefined && (
                <span className="w-5 shrink-0 text-right text-xs tabular-nums text-secondary-foreground">
                  {item.number}
                </span>
              )}
              <span className="truncate">
                {item.text ||
                  t('assetInsights.outline.untitled', { number: item.number })}
              </span>
            </li>
          ))}
        </ol>
      </div>
      {/* There is more to the document than the first few headings. */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-14 bg-linear-to-b from-transparent to-secondary" />
    </div>
  )
}
