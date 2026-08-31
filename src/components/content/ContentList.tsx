import { useEffect, useMemo, useState } from 'react'
import {
  ArrowsClockwiseIcon,
  FileTextIcon,
  GlobeSimpleIcon,
  TrashIcon,
  UploadSimpleIcon,
  XIcon,
} from '@phosphor-icons/react'
import { PageGridEmptyState } from '@/components/page-primitives/PageGridEmptyState'
import { AssetsTable } from '@/components/tables/docsTable'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib'
import { ZIndex } from '@/config/zIndex'
import { useUploadStore, type UploadItem } from '@/stores/uploadStore'
import type { Asset } from '@/types/content'
import {
  EMPTY_FILTER,
  filterAssets,
  isFilterActive,
  type ContentFilter as Filter,
} from '@/lib/contentFilter'
import { ContentFilter } from './ContentFilter'
import { DeleteDocumentsDialog } from './DeleteDocumentsDialog'

type Props = {
  /** The campaign whose documents these are, or null for the whole workspace. */
  campaignId: string | null
  assets: Asset[]
  /** Files still in transit to this scope, or refused on the way. */
  uploads: UploadItem[]
  onDelete: (id: string) => void
  /** Deletes a whole selection, and resolves once every one has settled. */
  onDeleteMany: (ids: string[]) => Promise<void>
  onWrite: () => void
  onUpload: () => void
  onAddWebPage: () => void
}

/**
 * What a campaign writes from — or, in the bank, everything there is — as a
 * list.
 *
 * The three-tile source picker that used to sit above this is gone (CON-210),
 * and nothing replaces it: the campaign's sources are the documents on the
 * page. There is nothing to choose, so there is nothing to misunderstand — and
 * a sentence restating what the list already shows was the same claim twice.
 * Per-document facts (how much text, whether it can be read) stay where they
 * are true, on the row.
 *
 * Only the empty state and the filter's own words change with scope. The
 * table doesn't: a document is the same object wherever it is listed, and a
 * second row design for the same rows is how this screen came to have two
 * tables that their own comments admitted were identical.
 */
export function ContentList({
  campaignId,
  assets,
  uploads,
  onDelete,
  onDeleteMany,
  onWrite,
  onUpload,
  onAddWebPage,
}: Props) {
  const [filter, setFilter] = useState<Filter>(EMPTY_FILTER)
  const [ticked, setTicked] = useState<Set<string>>(new Set())
  const [confirming, setConfirming] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const visible = useMemo(() => filterAssets(assets, filter), [assets, filter])
  const narrowed = isFilterActive(filter)

  // The selection is ids, and the documents behind them can go: deleted here,
  // deleted in another tab, or left behind by switching scope. Resolving it
  // against what is actually in this scope is what keeps "3 selected" from
  // counting rows that no longer exist — and from carrying a campaign's
  // selection into the bank.
  const selected = useMemo(
    () => assets.filter((a) => ticked.has(a.id)),
    [assets, ticked],
  )

  // Not merely cosmetic: a stale id would still be handed to the delete.
  useEffect(() => {
    setTicked((prev) => {
      if (prev.size === 0) return prev
      const live = new Set(assets.map((a) => a.id))
      const next = new Set([...prev].filter((id) => live.has(id)))
      return next.size === prev.size ? prev : next
    })
  }, [assets])

  const toggleRow = (id: string) =>
    setTicked((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  // Over the rows the filter has left on screen, matching what the header
  // checkbox claims: "select all" cannot mean documents the user filtered out.
  const toggleAll = () =>
    setTicked((prev) => {
      const next = new Set(prev)
      const all = visible.length > 0 && visible.every((a) => next.has(a.id))
      for (const asset of visible) {
        if (all) next.delete(asset.id)
        else next.add(asset.id)
      }
      return next
    })

  const handleDeleteSelected = async () => {
    setDeleting(true)
    await onDeleteMany(selected.map((a) => a.id))
    setDeleting(false)
    setConfirming(false)
    setTicked(new Set())
  }

  if (assets.length === 0 && uploads.length === 0) {
    return (
      <EmptyBank
        campaignId={campaignId}
        onWrite={onWrite}
        onUpload={onUpload}
        onAddWebPage={onAddWebPage}
      />
    )
  }

  return (
    <div className="relative flex min-h-0 flex-col gap-3 py-4">
      <ContentFilter
        assets={assets}
        value={filter}
        onChange={setFilter}
        scopeLabel={campaignId ? "this campaign's content" : 'the content bank'}
      />

      {uploads.length > 0 && <UploadingRows uploads={uploads} />}

      <div
        className={cn(
          'grid min-h-0 flex-1 overflow-hidden',
          visible.length === 0 && 'min-h-50',
        )}
      >
        <AssetsTable
          assets={visible}
          campaignId={campaignId}
          onDelete={onDelete}
          selectedIds={ticked}
          onToggleRow={toggleRow}
          onToggleAll={toggleAll}
          // The list is a real fetch, so it arrives after a loader rather
          // than with the page around it. On the table's own class rather
          // than a wrapper: it is the grid item the layout sizes, and a div
          // in between would take that role and leave it to grow past the
          // window.
          className="page-content-motion"
          // The table is only ever empty here because the filter emptied it —
          // an empty scope shows `EmptyBank` instead — so the way out is to
          // undo the filter, which is what the shared empty state offers.
          onEmptyStateAction={
            narrowed ? () => setFilter(EMPTY_FILTER) : undefined
          }
        />
      </div>

      {selected.length > 0 && (
        <SelectionBar
          count={selected.length}
          busy={deleting}
          onClear={() => setTicked(new Set())}
          onDelete={() => setConfirming(true)}
        />
      )}

      <DeleteDocumentsDialog
        count={selected.length}
        campaignId={campaignId}
        isOpen={confirming}
        onClose={() => setConfirming(false)}
        onConfirm={() => void handleDeleteSelected()}
        deleting={deleting}
      />
    </div>
  )
}

/**
 * What is ticked, and the one thing that can be done to it.
 *
 * Deleting is the only action a document row has, so it is the only action a
 * selection has: a bar offering a menu of bulk edits would be promising
 * operations — retag, move, re-read — that do not exist on a single row
 * either.
 *
 * It floats over the foot of the list rather than opening a band above it,
 * which is where the posts list puts the same idea. An inline bar would appear
 * from nowhere on the first tick and push every row down 40px — putting the
 * second row you meant to tick under the pointer aimed at the first. Floating
 * also keeps the filter in place, which is how the next document to tick gets
 * found.
 *
 * The count is in tabular figures and a fixed box, so the buttons beside it
 * hold still while rows are ticked.
 */
function SelectionBar({
  count,
  busy,
  onClear,
  onDelete,
}: {
  count: number
  busy: boolean
  onClear: () => void
  onDelete: () => void
}) {
  return (
    // The track is full width and takes no clicks, so the bar can centre on the
    // list without covering it; `bottom-4` and `h-12` are the assistant
    // trigger's own, which is what puts all three surfaces — trigger, commit
    // bar, this — on one line along the bottom of the app.
    <div
      className="pointer-events-none absolute inset-x-0 bottom-4 flex justify-center"
      style={{ zIndex: ZIndex.pageActionBar }}
    >
      <div className="pointer-events-auto flex h-12 items-center gap-3 bg-primary px-4 shadow-lg">
        <span className="shrink-0 text-[13px]/4 font-medium tabular-nums whitespace-nowrap">
          {count} selected
        </span>
        <span className="h-6 w-px shrink-0 bg-border" aria-hidden />
        {/* Ghost, like every button on the app's bottom bar, and not the
            destructive red: the dialog behind it is where the warning belongs,
            and a button that shouts on every selection teaches people to click
            past the one screen that is actually asking. Weight carries the
            hierarchy — the action at full strength, the way out dimmed. */}
        <Button
          variant="ghost"
          size="sm"
          className="text-primary-foreground"
          onClick={onDelete}
          disabled={busy}
        >
          <TrashIcon />
          <span>DELETE</span>
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="text-tertiary-foreground"
          onClick={onClear}
          disabled={busy}
        >
          CLEAR
        </Button>
      </div>
    </div>
  )
}

/**
 * The first thing an empty scope shows, and the state the whole change is
 * judged on.
 *
 * The workspace bank said "create your first asset to start building your
 * content bank", which describes a container — and a container is exactly what
 * people filled with everything and then stopped trusting. This one says what
 * adding *does*: this campaign reads it, and no other campaign does.
 *
 * Three buttons rather than one dropdown, because writing a note, uploading a
 * file and pointing at a page are different intents and the old single ADD
 * ASSET caret hid all of them. Only the first is filled: writing is the one
 * that needs nothing the user hasn't got, while the other two wait on a file or
 * a link they have to go and find.
 *
 * It does not advertise the page-wide drop target underneath them: the buttons
 * are the answer to "what do I do here", and a line explaining a further way in
 * makes the emptiest screen in the product the wordiest.
 */
function EmptyBank({
  campaignId,
  onWrite,
  onUpload,
  onAddWebPage,
}: {
  campaignId: string | null
  onWrite: () => void
  onUpload: () => void
  onAddWebPage: () => void
}) {
  return (
    <PageGridEmptyState
      title={
        campaignId
          ? 'This campaign writes from its brief alone'
          : 'Nothing is filed outside a campaign'
      }
      subtitle={
        campaignId
          ? "Add the documents it should also read — positioning, transcripts, a tone of voice, last quarter's report."
          : // The bank's job is showing what campaigns don't: a document lands
            // here when it was added here, or when the campaign that held it
            // was deleted. Nothing added here reaches a campaign by itself.
            'Documents added here belong to no campaign — a campaign reads only what is on its own Content page.'
      }
      actions={
        <div className="flex items-center gap-2">
          <Button variant="defaultInverted" onClick={onWrite}>
            <FileTextIcon />
            <span>WRITE A NOTE</span>
          </Button>
          <Button variant="outline" onClick={onUpload}>
            <UploadSimpleIcon />
            <span>UPLOAD FILES</span>
          </Button>
          <Button variant="outline" onClick={onAddWebPage}>
            <GlobeSimpleIcon />
            <span>ADD A WEB PAGE</span>
          </Button>
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
        <div
          key={file.id}
          className="flex items-center gap-3 bg-secondary px-3 py-2"
        >
          <UploadSimpleIcon className="size-4 shrink-0 text-tertiary-foreground" />
          <span className="min-w-0 flex-1 truncate text-sm">
            {file.filename}
          </span>
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
