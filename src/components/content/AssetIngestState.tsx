import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { WarningIcon } from '@phosphor-icons/react'
import { Spinner } from '@/components/ui/spinner'
import { AssetStateFrame } from '@/components/content/AssetStateFrame'
import { ingestFailureMessage } from '@/lib/uploadError'
import type { Asset } from '@/types/content'

/**
 * What an uploaded file shows in place of itself while an ingestion service
 * is still reading it, and once it has given up.
 *
 * Shared by the screens whose body comes out of a service — extracted text, a
 * transcript, an image's description — so "still reading" and "couldn't read"
 * look the same wherever they happen, and every one of them says why a
 * failure failed. The reason is the asset's own `failure_code` (CON-312),
 * worded by the same table as an upload refusal, because it is the same
 * vocabulary: a failed document and a refused upload are one `invalid_file`.
 *
 * `children` is the retry, when the screen has one to offer — only recordings
 * and images do, since nothing re-runs a PDF or an office document.
 */
export function AssetIngestState({
  asset,
  children,
}: {
  asset: Pick<Asset, 'status' | 'failure_code' | 'failure_reason'>
  children?: ReactNode
}) {
  const { t } = useTranslation()

  if (asset.status === 'failed') {
    return (
      <AssetStateFrame>
        <WarningIcon className="size-8 text-destructive" />
        <h2 className="font-display text-2xl/8 font-medium text-foreground">
          {t('content.ingest.failedTitle')}
        </h2>
        <p className="text-sm text-tertiary-foreground">
          {ingestFailureMessage(t, asset)}
        </p>
        {children}
      </AssetStateFrame>
    )
  }

  return (
    <AssetStateFrame>
      <Spinner tone="onSurface" className="w-32" />
      <h2 className="font-display text-2xl/8 font-medium text-foreground">
        {t('content.ingest.readingTitle')}
      </h2>
      {/* The wait is a worker's, not this tab's — worth saying, because the
          instinct with a spinner is to sit and watch it. */}
      <p className="text-sm text-tertiary-foreground">
        {t('content.ingest.readingBody')}
      </p>
    </AssetStateFrame>
  )
}
