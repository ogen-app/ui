import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'
import { FileDashedIcon } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { AssetIngestState } from '@/components/content/AssetIngestState'
import { AssetStateFrame } from '@/components/content/AssetStateFrame'
import { AssetTitle } from '@/components/content/AssetTitle'
import { useAssetChunks } from '@/hooks/useContent'
import { isTerminalStatus } from '@/lib/assetStatus'
import { formatNumber } from '@/lib/intl'
import type { Asset, AssetChunk } from '@/types/content'

type Props = {
  asset: Asset
  onTitleChange: (title: string) => void
  onDirty: () => void
}

/**
 * A PDF or an office document: the text its ingestion service pulled out, to
 * read and not to edit.
 *
 * **Read-only because the server says so** (CON-312): a changed `content` on
 * either type is a 409 `content_locked`, since saving would re-chunk the text
 * and throw away the anchors — "Slide 4", "Sheet 'Q3' rows 10–24" — that let
 * the assistant cite where it read something. The title stays the user's;
 * renaming never re-chunks.
 *
 * **The text comes from the chunks, not from `content`.** On both types
 * `content` is a placeholder the upload writes and nothing replaces; the
 * extraction's output *is* the chunk list. So the body is those chunks in
 * order, each under the label it is cited by — which is also the most honest
 * account of what the assistant can read here, in the pieces it reads it in.
 */
export function AssetExtractedView({ asset, onTitleChange, onDirty }: Props) {
  const { t, i18n } = useTranslation()
  const settled = isTerminalStatus(asset.status) && asset.status !== 'failed'
  const chunks = useAssetChunks(asset.id, { enabled: settled })

  const pages = chunks.data?.pages ?? []
  const loaded = pages.flatMap((page) => page.chunks)
  const total = pages[pages.length - 1]?.total ?? 0

  return (
    <div className="flex w-content flex-col gap-8 bg-primary px-10 py-8">
      <AssetTitle
        initialTitle={asset.title}
        onChange={onTitleChange}
        onDirty={onDirty}
      />

      {!settled ? (
        <AssetIngestState asset={asset} />
      ) : chunks.isPending ? (
        <div className="flex justify-center py-8">
          <Spinner tone="onSurface" className="w-24" />
        </div>
      ) : chunks.isError ? (
        <p className="text-sm text-destructive">
          {t('content.extracted.loadFailed')}
        </p>
      ) : loaded.length === 0 ? (
        // Ready with nothing in it — an image-only PDF, a blank sheet. Not a
        // failure, and worded so it doesn't read as one.
        <AssetStateFrame>
          <FileDashedIcon className="size-8 text-tertiary-foreground" />
          <p className="text-sm text-tertiary-foreground">
            {t('content.extracted.empty')}
          </p>
        </AssetStateFrame>
      ) : (
        <>
          {asset.status === 'partial' && (
            <p className="text-sm text-warning">
              {t('content.extracted.partial')}
            </p>
          )}
          <p className="text-xs text-tertiary-foreground">
            {t('content.extracted.readOnly')}
          </p>
          <ol className="flex flex-col gap-6">
            {loaded.map((chunk) => (
              <ChunkSection key={chunk.id} chunk={chunk} />
            ))}
          </ol>
          {chunks.hasNextPage && (
            <div className="flex items-center justify-between gap-4">
              <p className="text-xs text-tertiary-foreground">
                {t('content.extracted.shown', {
                  shown: formatNumber(loaded.length, {}, i18n.language),
                  total: formatNumber(total, {}, i18n.language),
                })}
              </p>
              <Button
                variant="outline"
                onClick={() => void chunks.fetchNextPage()}
                loading={chunks.isFetchingNextPage}
              >
                {t('content.extracted.more')}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  )
}

function ChunkSection({ chunk }: { chunk: AssetChunk }) {
  const { t } = useTranslation()
  const label = chunkLabel(t, chunk)
  return (
    <li className="flex flex-col gap-2">
      {label && (
        <h3 className="text-xs font-medium uppercase tracking-wide text-tertiary-foreground">
          {label}
        </h3>
      )}
      {/* Plain text, as extracted. Whitespace is kept because a sheet's rows
          and an email's quoting are carried by it. */}
      <p className="whitespace-pre-wrap text-sm leading-6 text-foreground">
        {chunk.content}
      </p>
    </li>
  )
}

/**
 * What a chunk is cited as: the service's own label ("Slide 4", "Sheet 'Q3'
 * rows 10–24"), else the pages a PDF chunk spans, else nothing.
 *
 * The label is the server's words and arrives untranslated — it is a citation
 * the assistant also uses, and two spellings of one citation would be worse
 * than an English one. The page range is ours, so it is catalogued.
 */
export function chunkLabel(t: TFunction, chunk: AssetChunk): string | null {
  const label = chunk.source_label?.trim()
  if (label) return label
  if (chunk.page_start > 0) {
    return chunk.page_end > chunk.page_start
      ? t('content.extracted.pages', {
          from: chunk.page_start,
          to: chunk.page_end,
        })
      : t('content.extracted.page', { page: chunk.page_start })
  }
  return null
}
