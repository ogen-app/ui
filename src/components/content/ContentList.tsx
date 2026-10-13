import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  ArrowsClockwiseIcon,
  FileTextIcon,
  GlobeSimpleIcon,
  TagIcon,
  TrashIcon,
  UploadSimpleIcon,
  XIcon,
} from '@phosphor-icons/react'
import { PageGridEmptyState } from '@/components/page-primitives/PageGridEmptyState'
import { AssetsTable } from '@/components/tables/docsTable'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib'
import { ZIndex } from '@/config/zIndex'
import { useBulkTagAssets, type useAssetList } from '@/hooks/useContent'
import {
  isFilterActive,
  NONE,
  type AssetFilter,
  type AssetSort,
} from '@/lib/assetFilter'
import { formatNumber } from '@/lib/intl'
import { uploadErrorMessage } from '@/lib/uploadError'
import { queryAssetIds } from '@/services/api/content'
import { useUploadStore, type UploadItem } from '@/stores/uploadStore'
import { toast } from '@/stores/toastStore'
import type { Tag } from '@/types/content'
import type { AssetListItem, AssetQueryParams } from '@/types/assetList'
import { AssetFilterBar } from './smartFilter/AssetFilterBar'
import { NoMatches } from './smartFilter/NoMatches'
import { useFilterVocabulary } from './smartFilter/useFilterVocabulary'
import { DeleteDocumentsDialog } from './DeleteDocumentsDialog'
import { TagDocumentsDialog } from './TagDocumentsDialog'

type Props = {
  /** The campaign whose documents these are, or null for the whole workspace. */
  campaignId: string | null
  /** The Assets query for this page's filter (`useAssetList`). */
  list: ReturnType<typeof useAssetList>
  /** The request behind it — what "select all matching" asks again for ids. */
  params: AssetQueryParams
  filter: AssetFilter
  onFilterChange: (next: AssetFilter) => void
  sort: AssetSort
  onSortChange: (next: AssetSort) => void
  /** The request another filter would make, for counts the bar shows. */
  paramsFor: (filter: AssetFilter) => AssetQueryParams
  /** Files still in transit to this scope, or refused on the way. */
  uploads: UploadItem[]
  /**
   * Deletes documents, and resolves once every one has settled. One path for
   * every way in: the row's bin confirms the same dialog the selection does,
   * so a single row is a selection of one rather than a second code path that
   * skips the asking.
   */
  onDeleteMany: (ids: string[]) => Promise<void>
  onWrite: () => void
  onUpload: () => void
  onAddWebPage: () => void
}

/** What the delete dialog is asking about, and which gesture asked. */
type Confirming = {
  ids: string[]
  /** Named in the title when it is one document. */
  title: string | null
  fromSelection: boolean
}

/**
 * What a campaign writes from — or, in the bank, everything there is — as a
 * list.
 *
 * The three-tile source picker that used to sit above this is gone (CON-210),
 * and nothing replaces it: the campaign's sources are the documents on the
 * page. Per-document facts (how much there is, whether it can be read) stay
 * where they are true, on the row.
 *
 * Only the empty state and the filter's own words change with scope. The
 * table doesn't: a document is the same object wherever it is listed.
 *
 * **The list is a window onto the server's answer** (CON-371/374): fifty rows
 * at a time, the next fifty as the end comes into view. So the selection is
 * ids, and has two sizes — the rows ticked, and "all N matching", which asks
 * the server for every id the same filter matches. That is what bulk tagging
 * and delete act on, and the delete confirmation names the count. A changed
 * filter clears the selection: a set picked under one question must not be
 * deleted under another.
 */
export function ContentList({
  campaignId,
  list,
  params,
  filter,
  onFilterChange,
  sort,
  onSortChange,
  paramsFor,
  uploads,
  onDeleteMany,
  onWrite,
  onUpload,
  onAddWebPage,
}: Props) {
  const { t, i18n } = useTranslation()
  const { rows, total, totalUnfiltered, facets, query } = list
  const vocabulary = useFilterVocabulary({ facets, scoped: !!campaignId })
  const [ticked, setTicked] = useState<Set<string>>(new Set())
  /** The selection is every id the filter matches, not only loaded rows. */
  const [allMatching, setAllMatching] = useState(false)
  const [resolving, setResolving] = useState(false)
  const [confirming, setConfirming] = useState<Confirming | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [tagging, setTagging] = useState(false)

  // Held here rather than passed down from the page, unlike the delete: filing
  // a tag is the same act in both scopes, with nothing for a campaign to also
  // do about it.
  const bulkTag = useBulkTagAssets()

  // A new question empties the selection. Sort and time zone change the order
  // and nothing about which documents match, so they leave it alone.
  const question = useMemo(() => {
    const { sort: _sort, tz: _tz, ...rest } = params
    return JSON.stringify(rest)
  }, [params])
  /** The question on screen, for a request that answers after it changed. */
  const asked = useRef(question)
  useEffect(() => {
    asked.current = question
    setTicked(new Set())
    setAllMatching(false)
  }, [question])

  const narrowed = isFilterActive(filter)

  const toggleRow = (id: string) => {
    setAllMatching(false)
    setTicked((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  // Over the loaded rows, matching what the header checkbox claims; "all N
  // matching" is offered separately, on the bar, once these are ticked.
  const toggleAll = () => {
    setAllMatching(false)
    setTicked((prev) => {
      const next = new Set(prev)
      const all = rows.length > 0 && rows.every((a) => next.has(a.id))
      for (const asset of rows) {
        if (all) next.delete(asset.id)
        else next.add(asset.id)
      }
      return next
    })
  }

  const selectAllMatching = async () => {
    const question = asked.current
    setResolving(true)
    try {
      const ids = await queryAssetIds(params)
      // The filter moved while this was in flight, so these ids answer the
      // previous question — and a delete must never act on that one.
      if (asked.current !== question) return
      setTicked(new Set(ids))
      setAllMatching(true)
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : t('content.selection.failed'),
      )
    } finally {
      setResolving(false)
    }
  }

  const loadedTicked = rows.length > 0 && rows.every((a) => ticked.has(a.id))
  const canSelectMatching = !allMatching && loadedTicked && total > ticked.size

  const handleDeleteConfirmed = async () => {
    if (!confirming) return
    setDeleting(true)
    await onDeleteMany(confirming.ids)
    setDeleting(false)
    if (confirming.fromSelection) {
      setTicked(new Set())
      setAllMatching(false)
    } else {
      const [gone] = confirming.ids
      setTicked((prev) => {
        if (!prev.has(gone)) return prev
        const next = new Set(prev)
        next.delete(gone)
        return next
      })
    }
    setConfirming(null)
  }

  /**
   * The tags the selection carries, and on how many of its documents — read
   * off the rows when every ticked document is loaded. "All N matching" can
   * reach past what is loaded, so then the list is the tags the match carries
   * (the tag facet) without a per-tag count it cannot know.
   */
  const present = useMemo(() => {
    const loaded = rows.filter((row) => ticked.has(row.id))
    if (loaded.length === ticked.size) {
      const counts = new Map<string, { tag: Tag; count: number | null }>()
      for (const row of loaded) {
        for (const tag of row.tags) {
          const seen = counts.get(tag.id)
          if (seen) seen.count = (seen.count ?? 0) + 1
          else counts.set(tag.id, { tag, count: 1 })
        }
      }
      return [...counts.values()]
    }
    const names = new Map(rows.flatMap((row) => row.tags).map((g) => [g.id, g]))
    return (facets.tag ?? [])
      .filter((f) => f.value !== NONE && f.count > 0)
      .map((f) => ({
        tag: names.get(f.value) ?? {
          id: f.value,
          name: vocabulary.valueLabel('tag', f.value),
          color: '',
        },
        count: null,
      }))
  }, [rows, ticked, facets.tag, vocabulary])

  /**
   * One request for the whole selection, and the selection survives it — the
   * documents are all still there afterwards, and the usual next move is
   * another tag on the same set. The toast's count is what the server says
   * it touched: an asset another tab deleted a moment ago is skipped.
   */
  const handleTagSelected = (change: { add: string[]; remove: string[] }) => {
    bulkTag.mutate(
      { asset_ids: [...ticked], ...change },
      {
        onSuccess: (assets) => {
          setTagging(false)
          toast.success(t('content.tagging.done', { count: assets.length }))
        },
      },
    )
  }

  if (totalUnfiltered === 0 && !narrowed && uploads.length === 0) {
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
      <AssetFilterBar
        filter={filter}
        onChange={onFilterChange}
        vocabulary={vocabulary}
        total={total}
        totalUnfiltered={totalUnfiltered}
        paramsFor={paramsFor}
      />

      {uploads.length > 0 && <UploadingRows uploads={uploads} />}

      <div
        className={cn(
          'grid min-h-0 flex-1 overflow-hidden',
          rows.length === 0 && 'min-h-50',
        )}
      >
        <AssetsTable
          assets={rows}
          campaignId={campaignId}
          onDelete={(asset: AssetListItem) =>
            setConfirming({
              ids: [asset.id],
              title: asset.title.trim() || null,
              fromSelection: false,
            })
          }
          sort={sort}
          onSortChange={onSortChange}
          onEndReached={() => {
            if (query.hasNextPage && !query.isFetchingNextPage)
              void query.fetchNextPage()
          }}
          emptyState={
            query.isError ? (
              <p className="px-6 py-12 text-center text-sm text-destructive">
                {t('content.filter.loadFailed')}
              </p>
            ) : narrowed ? (
              <NoMatches
                filter={filter}
                vocabulary={vocabulary}
                paramsFor={paramsFor}
                onChange={onFilterChange}
              />
            ) : undefined
          }
          selectedIds={ticked}
          onToggleRow={toggleRow}
          onToggleAll={toggleAll}
          // The list is a real fetch, so it arrives after a loader rather
          // than with the page around it. On the table's own class rather
          // than a wrapper: it is the grid item the layout sizes, and a div
          // in between would take that role and leave it to grow past the
          // window.
          className="page-content-motion"
        />
      </div>

      {query.isFetchingNextPage && (
        <p className="shrink-0 text-center text-xs text-tertiary-foreground">
          {t('content.filter.loadingMore')}
        </p>
      )}

      {ticked.size > 0 && (
        <SelectionBar
          count={ticked.size}
          busy={deleting || bulkTag.isPending || resolving}
          matching={
            canSelectMatching
              ? {
                  label: t('content.selection.selectAllMatching', {
                    count: total,
                    formatted: formatNumber(total, {}, i18n.language),
                  }),
                  onSelect: () => void selectAllMatching(),
                }
              : null
          }
          onClear={() => {
            setTicked(new Set())
            setAllMatching(false)
          }}
          onTag={() => setTagging(true)}
          onDelete={() => {
            const ids = [...ticked]
            const only =
              ids.length === 1 ? rows.find((r) => r.id === ids[0]) : undefined
            setConfirming({
              ids,
              title: only?.title.trim() || null,
              fromSelection: true,
            })
          }}
        />
      )}

      <TagDocumentsDialog
        count={ticked.size}
        present={present}
        isOpen={tagging}
        onClose={() => setTagging(false)}
        onConfirm={handleTagSelected}
        saving={bulkTag.isPending}
      />

      <DeleteDocumentsDialog
        count={confirming?.ids.length ?? 0}
        title={confirming?.title ?? null}
        campaignId={campaignId}
        isOpen={confirming !== null}
        onClose={() => setConfirming(null)}
        onConfirm={() => void handleDeleteConfirmed()}
        deleting={deleting}
      />
    </div>
  )
}

/**
 * What is ticked, and what can be done to it.
 *
 * Two actions, and the bar takes an action only when there is a real operation
 * behind it — it is not a menu of bulk edits standing in for features. Tagging
 * earned its place when the API grew a bulk endpoint (CON-279): before that,
 * nothing in the product could put a tag on a document at all, and the filter
 * above the list sorted by a field only the image screen could set.
 *
 * Tag comes first because it is the reversible one, and because a bar whose
 * leftmost button deletes is a bar people learn to approach carefully rather
 * than use.
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
  matching,
  onClear,
  onTag,
  onDelete,
}: {
  count: number
  busy: boolean
  /** Offered once every loaded row is ticked and the match is larger. */
  matching: { label: string; onSelect: () => void } | null
  onClear: () => void
  onTag: () => void
  onDelete: () => void
}) {
  const { t } = useTranslation()
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
          {t('content.selection.count', { count })}
        </span>
        {matching && (
          <Button
            variant="ghost"
            size="sm"
            className="text-accent"
            onClick={matching.onSelect}
            disabled={busy}
          >
            {matching.label}
          </Button>
        )}
        <span className="h-6 w-px shrink-0 bg-border" aria-hidden />
        <Button
          variant="ghost"
          size="sm"
          className="text-primary-foreground"
          onClick={onTag}
          disabled={busy}
        >
          <TagIcon />
          <span>{t('content.tagging.action')}</span>
        </Button>
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
          <span>{t('content.selection.delete')}</span>
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="text-tertiary-foreground"
          onClick={onClear}
          disabled={busy}
        >
          {t('content.selection.clear')}
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
  const { t } = useTranslation()
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
          {/* The reason sits under the name rather than beside it. Worded
              refusals are sentences now (`lib/uploadError`), and a sentence on
              the same line squeezed the filename — which is the half that says
              *which* file is being talked about. */}
          <div className="flex min-w-0 flex-1 flex-col">
            <span className="truncate text-sm">{file.filename}</span>
            {file.phase === 'failed' && (
              <span className="truncate text-xs text-destructive">
                {file.error
                  ? uploadErrorMessage(t, file.error)
                  : t('uploads.failed')}
              </span>
            )}
          </div>
          {file.phase === 'failed' ? (
            <>
              {/* Not for a file this client refused before sending it — the
                  same file fails the same check again. */}
              {file.kind !== null && (
                <Button
                  variant="ghost"
                  size="xsIcon"
                  aria-label={`Retry ${file.filename}`}
                  onClick={() => retry(file.id)}
                >
                  <ArrowsClockwiseIcon className="size-4" />
                </Button>
              )}
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
