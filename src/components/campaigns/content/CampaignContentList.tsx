import { useMemo, useState } from 'react'
import {
  ArrowsClockwiseIcon,
  FileTextIcon,
  MagnifyingGlassIcon,
  UploadSimpleIcon,
  XIcon,
} from '@phosphor-icons/react'
import { PageGridEmptyState } from '@/components/page-primitives/PageGridEmptyState'
import { AssetsTable } from '@/components/tables/docsTable'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { UPLOAD_LIMITS_LABEL } from '@/lib/assetStatus'
import { poolStats } from '@/lib/campaignSources'
import { cn } from '@/lib'
import { useUploadStore, type UploadItem } from '@/stores/uploadStore'
import type { Asset } from '@/types/content'

/** Below this the list is short enough to read, and a search field is furniture. */
const SEARCH_THRESHOLD = 8

type Props = {
  campaignId: string
  /** The campaign's own documents — never the workspace's. */
  assets: Asset[]
  /** Files still in transit to this campaign, or refused on the way. */
  uploads: UploadItem[]
  onDelete: (id: string) => void
  onWrite: () => void
  onUpload: () => void
}

/**
 * What a campaign writes from, as a list.
 *
 * The three-tile source picker that used to sit above this is gone (CON-210).
 * What replaces it is the first line below: the campaign's sources are a fact
 * about what is on the page, not a mode you set. There is nothing to choose,
 * so there is nothing to misunderstand.
 */
export function CampaignContentList({
  campaignId,
  assets,
  uploads,
  onDelete,
  onWrite,
  onUpload,
}: Props) {
  const [query, setQuery] = useState('')

  const stats = useMemo(() => poolStats(assets), [assets])
  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    return q === '' ? assets : assets.filter((a) => a.title.toLowerCase().includes(q))
  }, [assets, query])

  if (assets.length === 0 && uploads.length === 0) {
    return <EmptyBank onWrite={onWrite} onUpload={onUpload} />
  }

  return (
    <div className="flex min-h-0 flex-col gap-3 py-4">
      {/*
       * The count is of the campaign, not of what search has left on screen:
       * it describes what the campaign writes from, and narrowing what you are
       * looking at does not change that. A number that fell to 3 while you
       * typed would be saying the campaign had forgotten twenty-one documents.
       */}
      <p className="shrink-0 text-sm text-secondary-foreground">
        Written from this campaign's brief and the {stats.total}{' '}
        {stats.total === 1 ? 'document' : 'documents'} below.
        {stats.waiting > 0 && (
          <span className="text-tertiary-foreground"> {stats.waiting} still processing.</span>
        )}
        {/* `partial` and `failed` are permanently inert — the server skips
            both (CON-118 §10). The sentence above has just claimed the
            campaign writes from every document here, so the page contradicts
            itself out loud rather than leaving the user to notice. */}
        {stats.inert > 0 && (
          <span className="text-destructive">
            {' '}
            {stats.inert} couldn't be read.
          </span>
        )}
      </p>

      {assets.length > SEARCH_THRESHOLD && (
        <div className="flex h-10 shrink-0 items-center gap-2 border-b-2 border-quaternary bg-input-secondary px-3 sm:max-w-80">
          <MagnifyingGlassIcon className="size-4 shrink-0 text-secondary-foreground" />
          <Input
            variant="search"
            inputSize="default"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={`Search ${assets.length} documents`}
            aria-label="Search this campaign's content"
            className="px-0"
          />
          {query !== '' && (
            <Button
              variant="ghost"
              size="xsIcon"
              aria-label="Clear search"
              onClick={() => setQuery('')}
            >
              <XIcon />
            </Button>
          )}
        </div>
      )}

      {uploads.length > 0 && <UploadingRows uploads={uploads} />}

      <div className={cn('grid min-h-0 flex-1 overflow-hidden', visible.length === 0 && 'min-h-50')}>
        <AssetsTable
          assets={visible}
          campaignId={campaignId}
          onDelete={onDelete}
          emptyStateMessage={
            query === '' ? 'Nothing in this campaign yet' : 'No documents match that'
          }
        />
      </div>
    </div>
  )
}

/**
 * The first thing a new campaign shows, and the state the whole change is
 * judged on.
 *
 * The workspace bank said "create your first asset to start building your
 * content bank", which describes a container — and a container is exactly what
 * people filled with everything and then stopped trusting. This one says what
 * adding *does*: this campaign reads it, and no other campaign does.
 *
 * Two actions rather than one dropdown, because writing a note and uploading a
 * file are different intents and the old single ADD ASSET caret hid both.
 */
function EmptyBank({ onWrite, onUpload }: { onWrite: () => void; onUpload: () => void }) {
  return (
    <PageGridEmptyState
      title="This campaign writes from its brief alone"
      subtitle="Add the documents it should also read — positioning, transcripts, a tone of voice, last quarter's report."
      actions={
        <div className="flex flex-col items-center gap-3">
          <div className="flex items-center gap-2">
            <Button variant="defaultInverted" onClick={onWrite}>
              <FileTextIcon />
              <span>WRITE A NOTE</span>
            </Button>
            <Button variant="outline" onClick={onUpload}>
              <UploadSimpleIcon />
              <span>UPLOAD FILES</span>
            </Button>
          </div>
          <p className="text-xs text-tertiary-foreground">
            …or drop files anywhere on this page. {UPLOAD_LIMITS_LABEL}
          </p>
        </div>
      }
    />
  )
}

/**
 * Files in flight, above the list.
 *
 * They sit outside the table on purpose: an upload has no extracted text and
 * no status worth a badge, so it would be a mostly-blank asset row pretending
 * to be a full one. The moment the server has it, it leaves this band and
 * joins the list as a `processing` row.
 *
 * Refusals stay here rather than in the app-level tracker, because this is
 * where the file was dropped and where the user is looking.
 */
function UploadingRows({ uploads }: { uploads: UploadItem[] }) {
  const retry = useUploadStore((s) => s.retry)
  const remove = useUploadStore((s) => s.remove)

  return (
    <div className="flex shrink-0 flex-col gap-1.5">
      {uploads.map((file) => (
        <div key={file.id} className="flex items-center gap-3 bg-secondary px-3 py-2">
          <UploadSimpleIcon className="size-4 shrink-0 text-tertiary-foreground" />
          <span className="min-w-0 flex-1 truncate text-sm">{file.filename}</span>
          {file.phase === 'failed' ? (
            <>
              <span className="shrink-0 text-xs text-destructive">
                {file.error ?? 'Upload failed'}
              </span>
              <Button
                variant="ghost"
                size="xsIcon"
                aria-label={`Retry ${file.filename}`}
                onClick={() => retry(file.id)}
              >
                <ArrowsClockwiseIcon className="size-4" />
              </Button>
              <Button
                variant="ghost"
                size="xsIcon"
                aria-label={`Dismiss ${file.filename}`}
                onClick={() => remove(file.id)}
              >
                <XIcon className="size-4" />
              </Button>
            </>
          ) : (
            <>
              <div className="h-1 w-24 shrink-0 bg-background">
                <div
                  className="h-full bg-info transition-[width]"
                  style={{ width: `${file.progress}%` }}
                />
              </div>
              <span className="w-9 shrink-0 text-right text-xs tabular-nums text-tertiary-foreground">
                {file.progress}%
              </span>
            </>
          )}
        </div>
      ))}
    </div>
  )
}
