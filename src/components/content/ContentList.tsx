import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { useTranslation } from 'react-i18next'
import {
  FileTextIcon,
  GlobeSimpleIcon,
  UploadSimpleIcon,
} from '@phosphor-icons/react'
import { PageGridEmptyState } from '@/components/page-primitives/PageGridEmptyState'
import { CardHead } from '@/components/page-primitives/listCards'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { FilterPills } from '@/components/smartFilter/FilterPills'
import { FilterButton } from '@/components/smartFilter/ListStrip'
import {
  assetCountQuery,
  useBulkTagAssets,
  type useAssetList,
} from '@/hooks/useContent'
import {
  isFilterActive,
  NONE,
  type AssetFilter,
  type AssetGrouping,
  type AssetSort,
} from '@/lib/assetFilter'
import { formatNumber } from '@/lib/intl'
import { queryAssetIds } from '@/services/api/content'
import {
  useAssistantRequest,
  useListAssistantPage,
} from '@/hooks/useAssistantContext'
import type { UploadItem } from '@/stores/uploadStore'
import { toast } from '@/stores/toastStore'
import type { Tag } from '@/types/content'
import type { AssetQueryParams } from '@/types/assetList'
import { ASSET_MODEL } from './smartFilter/assetModel'
import { NoMatches } from './smartFilter/NoMatches'
import type { FilterVocabulary } from './smartFilter/useFilterVocabulary'
import { AssetList } from './AssetList'
import { AssetViewBar } from './AssetViewBar'
import { DeleteDocumentsDialog } from './DeleteDocumentsDialog'
import { TagDocumentsDialog } from './TagDocumentsDialog'

type Props = {
  /** The campaign whose documents these are, or null for the whole workspace. */
  campaignId: string | null
  /** The Assets query for this page's filter (`useAssetList`). */
  list: ReturnType<typeof useAssetList>
  /** The filter's words — the sentence's, the bands' and the empty state's. */
  vocabulary: FilterVocabulary
  /** The smart groups' menu, at the head line's end (the workspace page). */
  views?: ReactNode
  /** The open smart group, leading the pills. */
  openView?: ReactNode
  /** After the pills: Save as group, or an edited group's actions. */
  pillsTrailing?: ReactNode
  /** Over the list: an open group whose filter no longer works. */
  groupNotice?: ReactNode
  /** Whether the pills offer Clear filters — not while a group is open. */
  clearable: boolean
  /** The request behind it — what "select all matching" asks again for ids. */
  params: AssetQueryParams
  filter: AssetFilter
  onFilterChange: (next: AssetFilter) => void
  sort: AssetSort
  onSortChange: (next: AssetSort) => void
  grouping: AssetGrouping
  onGroupingChange: (next: AssetGrouping) => void
  /** The request another filter would make, for counts the bar shows. */
  paramsFor: (filter: AssetFilter) => AssetQueryParams
  /** Files still in transit to this scope, or refused on the way. */
  uploads: UploadItem[]
  /**
   * Deletes documents, and resolves once every one has settled — after the
   * same confirmation, whichever way in (the selection here, the document's
   * own screen).
   */
  onDeleteMany: (ids: string[]) => Promise<void>
  onWrite: () => void
  onUpload: () => void
  onAddWebPage: () => void
}

/** The date-added grouping's disjoint bands. */
type CreatedBand = '1d' | '7d' | '30d' | 'earlier'

/** What the delete dialog is asking about. */
type Confirming = {
  ids: string[]
  /** Named in the title when it is one document. */
  title: string | null
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
 * ids, and has two sizes — the rows ticked, and every match, which asks the
 * server for every id the same filter matches. That is what bulk tagging and
 * delete act on, and the delete confirmation names the count. A changed
 * filter clears the selection: a set picked under one question must not be
 * deleted under another.
 *
 * **One line over the list** (design/ideas-cards, as on Ideas; the documents'
 * tab and count are the page header's): the list's head, pinned — the box
 * over the boxes, then Filter and the filters as pills, Views, Group and Sort
 * at its end; or the selection and its actions in their place.
 * **Selection is the mail-client pattern**: the head box takes the cards
 * loaded and a half-ticked one clears; a group's box fills its group; Shift
 * extends a range; widening to every match is its own named step.
 */
export function ContentList({
  campaignId,
  list,
  vocabulary,
  views,
  openView,
  pillsTrailing,
  groupNotice,
  clearable,
  params,
  filter,
  onFilterChange,
  sort,
  onSortChange,
  grouping,
  onGroupingChange,
  paramsFor,
  uploads,
  onDeleteMany,
  onWrite,
  onUpload,
  onAddWebPage,
}: Props) {
  const { t } = useTranslation()
  const { rows, total, totalUnfiltered, facets, groups, query } = list
  const [ticked, setTicked] = useState<Set<string>>(new Set())
  /** The selection is every id the filter matches, not only loaded rows. */
  const [allMatching, setAllMatching] = useState(false)
  const [resolving, setResolving] = useState(false)
  const [confirming, setConfirming] = useState<Confirming | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [tagging, setTagging] = useState(false)
  // The pills' add field, which Filter opens.
  const [adding, setAdding] = useState(false)

  // Held here rather than passed down from the page, unlike the delete: filing
  // a tag is the same act in both scopes, with nothing for a campaign to also
  // do about it.
  const bulkTag = useBulkTagAssets()

  // A new question empties the selection. Sort, grouping and time zone change
  // the order and nothing about which documents match, so they leave it alone.
  const question = useMemo(() => {
    const { sort: _sort, tz: _tz, group: _group, ...rest } = params
    return JSON.stringify(rest)
  }, [params])
  /** The question on screen, for a request that answers after it changed. */
  const asked = useRef(question)
  useEffect(() => {
    asked.current = question
    setTicked(new Set())
    setAllMatching(false)
  }, [question])

  // The assistant sees what is ticked, the filter it is under and the rows on
  // screen (CON-451) — a whole match as the filter, never as the ids.
  const visibleIds = useMemo(() => rows.slice(0, 50).map((r) => r.id), [rows])
  useListAssistantPage({
    kind: 'asset',
    params,
    ticked,
    allMatching,
    total,
    rowIds: visibleIds,
  })

  // The assistant can tick rows here.
  useAssistantRequest((action) => {
    if (action.type !== 'select' || action.selection?.kind !== 'asset')
      return false
    setTicked(new Set(action.selection.ids))
    setAllMatching(false)
    return true
  })

  const narrowed = isFilterActive(filter)

  /** The last box pressed, which Shift extends a range from. */
  const anchor = useRef<string | null>(null)
  const toggleRow = (id: string, shift = false) => {
    setAllMatching(false)
    setTicked((prev) => {
      const next = new Set(prev)
      const on = !prev.has(id)
      const from = shift && anchor.current
      const a = from ? rows.findIndex((r) => r.id === from) : -1
      const b = rows.findIndex((r) => r.id === id)
      const range =
        a >= 0 && b >= 0
          ? rows.slice(Math.min(a, b), Math.max(a, b) + 1)
          : [{ id }]
      for (const r of range)
        if (on) next.add(r.id)
        else next.delete(r.id)
      return next
    })
    anchor.current = id
  }
  /**
   * A group's box takes the group's loaded cards: half-ticked, it fills the
   * group rather than clearing it — clearing everything is the head box's job.
   */
  const toggleBand = (ids: string[]) => {
    setAllMatching(false)
    setTicked((prev) => {
      const next = new Set(prev)
      const all = ids.every((id) => next.has(id))
      for (const id of ids)
        if (all) next.delete(id)
        else next.add(id)
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

  const clearSelection = () => {
    setTicked(new Set())
    setAllMatching(false)
  }

  // The head box takes the page — the cards loaded — and widening to every
  // match is a separate, named step; a half-ticked head box clears.
  const loadedIds = useMemo(() => [...new Set(rows.map((r) => r.id))], [rows])
  const onPage = loadedIds.filter((id) => ticked.has(id)).length
  const pageAll = loadedIds.length > 0 && onPage === loadedIds.length
  const elsewhere = allMatching ? 0 : ticked.size - onPage
  const headState: boolean | 'indeterminate' =
    allMatching || pageAll ? true : ticked.size > 0 ? 'indeterminate' : false
  const toggleHead = () =>
    ticked.size > 0 ? clearSelection() : setTicked(new Set(loadedIds))
  const selecting = ticked.size > 0 || allMatching

  const groupLabel = useCallback(
    (key: string): string => {
      switch (grouping) {
        case 'created':
          return t(`content.list.band.created.${key as CreatedBand}`, {
            defaultValue: key,
          })
        case 'kind':
        case 'campaign':
        case 'tag':
          return vocabulary.valueLabel(grouping, key)
        case 'none':
          return ''
      }
    },
    [grouping, t, vocabulary],
  )

  const handleDeleteConfirmed = async () => {
    if (!confirming) return
    setDeleting(true)
    await onDeleteMany(confirming.ids)
    setDeleting(false)
    clearSelection()
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

  const busy = deleting || bulkTag.isPending || resolving

  return (
    // In the page's one scroller (CON-392), under its sticky header.
    <div className="flex flex-col">
      {groupNotice}

      <AssetList
        head={
          <CardHead
            wide
            box={
              <Checkbox
                checked={headState}
                disabled={resolving || loadedIds.length === 0}
                onCheckedChange={toggleHead}
                aria-label={
                  ticked.size > 0
                    ? t('content.selection.clearAll')
                    : t('content.selection.selectPage')
                }
              />
            }
          >
            {selecting ? (
              <SelectionLine
                count={ticked.size}
                allMatching={allMatching}
                elsewhere={elsewhere}
                canWiden={pageAll && !allMatching && total > onPage}
                total={total}
                resolving={resolving}
                onWiden={() => void selectAllMatching()}
                onClear={clearSelection}
              >
                {/* Tag first: it is the reversible one, and a line whose
                    first action deletes is one people learn to approach
                    carefully rather than use. Ghost, not the destructive red:
                    the dialog behind DELETE is where the warning belongs. */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setTagging(true)}
                  disabled={busy}
                >
                  {t('content.tagging.action')}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={busy}
                  onClick={() => {
                    const ids = [...ticked]
                    const only =
                      ids.length === 1
                        ? rows.find((r) => r.id === ids[0])
                        : undefined
                    setConfirming({ ids, title: only?.title.trim() || null })
                  }}
                >
                  {t('content.selection.delete')}
                </Button>
              </SelectionLine>
            ) : (
              <>
                <div className="flex min-w-0 flex-1 items-start gap-x-4">
                  <FilterButton
                    count={ASSET_MODEL.tokensOf(filter).length}
                    onClick={() => setAdding(true)}
                  />
                  <FilterPills
                    inline
                    filter={filter}
                    onChange={onFilterChange}
                    model={ASSET_MODEL}
                    vocabulary={vocabulary}
                    countQuery={(f) => assetCountQuery(paramsFor(f))}
                    adding={adding}
                    onAddingChange={setAdding}
                    clearable={clearable}
                    leading={openView}
                    trailing={pillsTrailing}
                  />
                </div>
                <AssetViewBar
                  views={views}
                  grouping={grouping}
                  onGroupingChange={onGroupingChange}
                  scoped={!!campaignId}
                  sort={sort}
                  onSortChange={onSortChange}
                  searching={!!filter.text}
                />
              </>
            )}
          </CardHead>
        }
        rows={rows}
        groups={groups}
        grouping={grouping}
        groupLabel={groupLabel}
        campaignId={campaignId}
        uploads={uploads}
        selectedIds={ticked}
        selecting={selecting}
        onToggleRow={toggleRow}
        onToggleBand={toggleBand}
        asOf={query.dataUpdatedAt}
        onEndReached={() => {
          if (query.hasNextPage && !query.isFetchingNextPage)
            void query.fetchNextPage()
        }}
        loadingMore={query.isFetchingNextPage}
        emptyState={
          query.isError ? (
            <p className="px-6 py-12 text-center text-sm/5 text-destructive">
              {t('content.filter.loadFailed')}
            </p>
          ) : narrowed ? (
            <div className="pt-4">
              <NoMatches
                filter={filter}
                vocabulary={vocabulary}
                paramsFor={paramsFor}
                onChange={onFilterChange}
              />
            </div>
          ) : undefined
        }
        // The list is a real fetch, so it arrives after a loader rather than
        // with the page around it.
        className="page-content-motion"
      />

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
 * The list's head while something is ticked: how many, then — the
 * mail-client way — how many are ticked out of sight, or the named step that
 * widens a ticked page to every match, or the way out of every match; then
 * what can be done to them (`children`). The count is in tabular figures, so
 * the actions hold still while cards are ticked.
 *
 * Two actions, each a real operation rather than a menu of bulk edits
 * standing in for features: tagging (CON-279's bulk endpoint) and DELETE,
 * which asks first. In the head, pinned, rather than floating over the list's
 * foot: the head is where the selection is counted and widened, and it stays
 * in reach however far the list is scrolled.
 */
function SelectionLine({
  count,
  allMatching,
  elsewhere,
  canWiden,
  total,
  resolving,
  onWiden,
  onClear,
  children,
}: {
  count: number
  allMatching: boolean
  /** Ticked but not loaded — the assistant's choice, say. */
  elsewhere: number
  /** The whole page is ticked and the match holds more. */
  canWiden: boolean
  total: number
  resolving: boolean
  onWiden: () => void
  onClear: () => void
  children: ReactNode
}) {
  const { t, i18n } = useTranslation()
  const n = (value: number) => formatNumber(value, {}, i18n.language)
  return (
    // One pill's height, like the line it stands in for; the actions' 32px
    // buttons lean 2px past it either side rather than heighten the line.
    <div className="flex h-7 min-w-0 flex-1 items-center gap-3">
      <span
        role="status"
        aria-live="polite"
        className="shrink-0 text-sm/5 font-medium whitespace-nowrap tabular-nums"
      >
        {allMatching
          ? t('content.selection.allSelected', {
              count: total,
              formatted: n(total),
            })
          : t('content.selection.count', { count })}
      </span>
      {allMatching ? (
        <button
          type="button"
          onClick={onClear}
          className="cursor-pointer truncate text-sm/5 text-secondary-foreground outline-none hover:text-foreground hover:underline focus-visible:underline"
        >
          {t('content.selection.clearAll')}
        </button>
      ) : canWiden ? (
        <button
          type="button"
          onClick={onWiden}
          disabled={resolving}
          className="cursor-pointer truncate text-sm/5 font-medium text-accent outline-none hover:underline focus-visible:underline disabled:opacity-60"
        >
          {t('content.selection.selectAll', {
            count: total,
            formatted: n(total),
          })}
        </button>
      ) : (
        elsewhere > 0 && (
          <span className="truncate text-sm/5 text-secondary-foreground">
            {t('content.selection.elsewhere', {
              count: elsewhere,
              formatted: n(elsewhere),
            })}
          </span>
        )
      )}
      <div className="-my-0.5 ml-auto flex shrink-0 items-center gap-1">
        {children}
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
