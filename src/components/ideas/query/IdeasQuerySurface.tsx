import {
  Fragment,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { useTranslation } from 'react-i18next'
import { HugeiconsIcon } from '@hugeicons/react'
import {
  ArrowDown01Icon,
  ArrowUpDownIcon,
  Layers01Icon,
  Note01Icon,
} from '@hugeicons/core-free-icons'
import { TrashIcon } from '@phosphor-icons/react'
import { KIND_ICON } from '@/components/content/AssetKindMark'
import { KIND_TONE } from '@/components/content/kindTone'
import { NoMatches } from '@/components/smartFilter/NoMatches'
import { PageLoader } from '@/components/page-primitives/PageLoader'
import { PageError } from '@/components/page-primitives/PageError'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ZIndex } from '@/config/zIndex'
import {
  ideaCountQuery,
  useIdeaList,
  useIdeaListWriter,
  useUndecidedIdeaCount,
} from '@/hooks/useIdeaList'
import { useIdeaViewWriter, useIdeaViews } from '@/hooks/useIdeaViews'
import { SAVED_VIEW_NAME_MAX, type SavedView } from '@/services/api/savedViews'
import { cn } from '@/lib'
import { viewerTimeZone } from '@/lib/assetFilter'
import {
  DEFAULT_IDEA_GROUP,
  IDEA_FILTER_MODEL,
  IDEA_GROUPS,
  IDEA_PILES,
  IDEA_SORTS,
  NONE,
  ideaFacetsFor,
  ideaFilterFromSearch,
  ideaViewQuery,
  matchesView,
  searchFromViewQuery,
  ideaViewFromSearch,
  isIdeaFilterActive,
  searchFromIdeaFilter,
  toIdeaRequestParams,
  type IdeaFilter,
  type IdeaGrouping,
  type IdeaListSearch,
  type IdeaPile,
  type IdeaSort,
} from '@/lib/ideaFilter'
import type { Idea } from '@/lib/ideas'
import { formatNumber } from '@/lib/intl'
import { queryIdeaIds } from '@/services/api/ideas'
import { toast } from '@/stores/toastStore'
import { sourceFacts } from '../card/sourceFacts'
import { DeleteIdeasDialog } from '../DeleteIdeasDialog'
import { IdeaCapture } from '../IdeaCapture'
import { IdeaRow } from '../IdeaRow'
import {
  DeleteGroupDialog,
  IdeaViewsMenu,
  SaveGroupDialog,
} from './IdeaViewsMenu'
import { IdeaSentence } from './IdeaSentence'
import { useIdeaVocabulary, type IdeaVocabulary } from './useIdeaVocabulary'

/** What the delete dialog is asking about. */
type Confirming = {
  ids: string[]
  title: string | null
  fromSelection: boolean
}

/**
 * The Ideas list as the server's answer to the address (CON-388 §4, §6),
 * behind `ideas-smart-filter`: the Assets list's way of narrowing, for ideas.
 *
 * Down the column: the capture field, the smart filter, then the piles with
 * Group by and Sort on one line, then the rows — the CON-387 card, under
 * sticky bands when grouped. The piles stay tabs, counted within the filter:
 * the verdict is where you are, not a filter. Everything is in the address
 * (`lib/ideaFilter`), so a link reopens the same list and a smart group is
 * that address saved.
 *
 * **The selection is ids, of two sizes** — the rows ticked, and every match,
 * which asks the server for every id the filter and pile match. Changing the
 * filter, the pile or the scope clears it; the sort and the grouping only
 * reorder it, so they leave it alone. Deleting always asks, through the same
 * dialog a written idea's own DELETE IDEA uses.
 */
export function IdeasQuerySurface({
  campaignId,
  search,
  onSearchChange,
}: {
  campaignId: string | null
  search: IdeaListSearch
  onSearchChange: (next: IdeaListSearch) => void
}) {
  const { t, i18n } = useTranslation()
  // The clock and the zone the presets are read in, once a visit.
  const [now] = useState(() => new Date())
  const [timeZone] = useState(viewerTimeZone)
  const filter = useMemo(() => ideaFilterFromSearch(search), [search])
  const { pile, sort, group } = ideaViewFromSearch(search)
  const narrowed = isIdeaFilterActive(filter)

  const contextFor = useCallback(
    (f: IdeaFilter) =>
      toIdeaRequestParams(f, {
        scopeCampaign: campaignId,
        pile,
        sort,
        group,
        now,
        timeZone,
      }),
    [campaignId, pile, sort, group, now, timeZone],
  )
  const params = useMemo(() => contextFor(filter), [contextFor, filter])
  const facets = useMemo(() => ideaFacetsFor(campaignId), [campaignId])
  const list = useIdeaList(params, facets)
  const { rows, total, totalUnfiltered, piles, groups, query } = list
  const writer = useIdeaListWriter({ campaignId })
  // Smart groups are the workspace page's (§5); a campaign's has none yet.
  const groupsOn = campaignId === null
  const views = useIdeaViews({ enabled: groupsOn })
  const viewWriter = useIdeaViewWriter()
  const allCount = useUndecidedIdeaCount()
  const active = views.data?.find((v) => v.id === search.view) ?? null
  const edited = !!active && active.valid && !matchesView(search, active.query)
  const [saving, setSaving] = useState<
    { mode: 'new' } | { mode: 'rename'; view: SavedView } | null
  >(null)
  const [removing, setRemoving] = useState<SavedView | null>(null)

  const vocabulary = useIdeaVocabulary({
    facets: list.facets,
    sourceLabels: list.sourceLabels,
    scoped: !!campaignId,
  })

  const [expandedId, setExpandedId] = useState<string | null>(null)
  /**
   * The rows on screen: the server's, plus the open idea if an answer just
   * moved it out of this pile. It leaves when it is closed, never from under
   * the reader — the asset page's rule (CON-387).
   */
  const [shown, setShown] = useState({ rows, expandedId, list: rows })
  if (shown.rows !== rows || shown.expandedId !== expandedId) {
    const gone =
      expandedId !== null && !rows.some((r) => r.id === expandedId)
        ? shown.list.findIndex((r) => r.id === expandedId)
        : -1
    setShown({
      rows,
      expandedId,
      list:
        gone >= 0
          ? [...rows.slice(0, gone), shown.list[gone], ...rows.slice(gone)]
          : rows,
    })
  }
  const visibleRows =
    shown.rows === rows && shown.expandedId === expandedId ? shown.list : rows
  const [ticked, setTicked] = useState<Set<string>>(new Set())
  const [allMatching, setAllMatching] = useState(false)
  const [resolving, setResolving] = useState(false)
  const [confirming, setConfirming] = useState<Confirming | null>(null)
  const [deleting, setDeleting] = useState(false)

  // A new question empties the selection; a new order does not.
  const question = useMemo(() => {
    const { sort: _sort, group: _group, tz: _tz, ...rest } = params
    return JSON.stringify(rest)
  }, [params])
  const [selectionFor, setSelectionFor] = useState(question)
  if (selectionFor !== question) {
    setSelectionFor(question)
    setTicked(new Set())
    setAllMatching(false)
  }
  /** The question on screen, for a request that answers after it changed. */
  const asked = useRef(question)
  useEffect(() => {
    asked.current = question
  }, [question])

  const change = (next: Partial<IdeaListSearch>) =>
    onSearchChange(
      Object.fromEntries(
        Object.entries({ ...search, ...next }).filter(([, v]) => !!v),
      ) as IdeaListSearch,
    )
  const onFilterChange = (next: IdeaFilter) => {
    const { pile: p, sort: s, group: g, view: v } = search
    onSearchChange({
      ...searchFromIdeaFilter(next),
      ...(p ? { pile: p } : {}),
      ...(s ? { sort: s } : {}),
      ...(g ? { group: g } : {}),
      // The group stays open, marked edited, until it is saved or left.
      ...(v ? { view: v } : {}),
    })
  }

  /** A group's filter, grouping and sort into the address; the pile stays. */
  const openView = (view: SavedView | null) =>
    onSearchChange({
      ...(view && view.valid ? searchFromViewQuery(view.query) : {}),
      ...(view ? { view: view.id } : {}),
      ...(search.pile ? { pile: search.pile } : {}),
    })
  /** The name a new group is offered: what its tokens say. */
  const suggestedName = IDEA_FILTER_MODEL.tokensOf(filter)
    .map((token) => vocabulary.tokenText(token))
    .join(', ')
  const saveGroup = (name: string, shared: boolean) => {
    if (saving?.mode === 'rename') {
      viewWriter.update.mutate(
        { id: saving.view.id, name },
        { onSuccess: () => setSaving(null) },
      )
      return
    }
    viewWriter.create.mutate(
      { name, shared, query: ideaViewQuery(search) },
      {
        onSuccess: (view) => {
          setSaving(null)
          onSearchChange({ ...search, view: view.id })
          toast.success(t('ideas.views.saved', { name: view.name }))
        },
      },
    )
  }
  const saveChanges = () =>
    active &&
    viewWriter.update.mutate({ id: active.id, query: ideaViewQuery(search) })
  // Saving is on demand: with filters on and no group open, the bar offers it.
  const saveAsGroup = groupsOn && !active && narrowed && (
    <Button
      variant="outline"
      size="sm"
      onClick={() => setSaving({ mode: 'new' })}
    >
      {t('ideas.views.saveAs')}
    </Button>
  )

  const toggleRow = (id: string) => {
    setAllMatching(false)
    setTicked((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }
  const clearSelection = () => {
    setTicked(new Set())
    setAllMatching(false)
  }
  const selectAllMatching = async () => {
    const question = asked.current
    setResolving(true)
    try {
      const answer = await queryIdeaIds(params)
      // The filter moved while this was in flight: these ids answer the
      // previous question, and a delete must never act on that one.
      if (asked.current !== question) return
      if (!answer) {
        toast.error(t('ideas.bulk.tooMany'))
        return
      }
      setTicked(new Set(answer.ids))
      setAllMatching(true)
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : t('ideas.bulk.failed'),
      )
    } finally {
      setResolving(false)
    }
  }
  const everything = total > 0 && (allMatching || ticked.size >= total)
  const selectAll = (
    <Checkbox
      checked={everything ? true : ticked.size > 0 ? 'indeterminate' : false}
      disabled={total === 0 || resolving}
      onCheckedChange={() =>
        everything ? clearSelection() : void selectAllMatching()
      }
      aria-label={
        everything
          ? t('ideas.bulk.clearAll')
          : t('ideas.bulk.selectAll', {
              count: total,
              formatted: formatNumber(total, {}, i18n.language),
            })
      }
    />
  )

  const handleDeleteConfirmed = async () => {
    if (!confirming) return
    // An open idea being deleted closes first, or the open row would be kept
    // on screen after it is gone (see `shown`).
    if (expandedId && confirming.ids.includes(expandedId)) setExpandedId(null)
    setDeleting(true)
    const result = await writer.removeMany(confirming.ids)
    setDeleting(false)
    if (result) {
      if (result.failed > 0)
        toast.error(
          t('ideas.bulk.partial', {
            count: result.deleted,
            failed: result.failed,
          }),
        )
      else toast.success(t('ideas.bulk.done', { count: result.deleted }))
    }
    if (confirming.fromSelection) clearSelection()
    else
      setTicked((prev) => {
        const next = new Set(prev)
        for (const id of confirming.ids) next.delete(id)
        return next
      })
    setConfirming(null)
  }

  // The frame is drawn from the first render, loader and all: it is what the
  // panel's room is measured on, and the measure is taken once it mounts.
  if (query.isPending) return <PageLoader />
  if (query.isError && rows.length === 0)
    return <PageError header={t('ideas.loadFailed')} />

  const firstRun = totalUnfiltered === 0 && !narrowed
  const selecting = ticked.size > 0

  return (
    // The Assets page's frame (CON-388): full width, the list on white in its
    // own scroller, so its group bands stay pinned while the rows pass under
    // them. Nothing above the list scrolls.
    <div className="relative flex h-full min-h-0 flex-col gap-4 pt-1 pb-4">
      <IdeaCapture
        onCapture={(title, note, by) => writer.capture(title, note, by)}
      />

      {firstRun ? (
        <div className="pt-2">
          <p className="text-sm text-secondary-foreground">
            {t('ideas.empty.title')}
          </p>
          <p className="pt-1 text-sm text-tertiary-foreground">
            {t('ideas.empty.subtitle')}
          </p>
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col">
          {/* Which view this is, then what it shows, as one sentence. */}
          <IdeaSentence
            filter={filter}
            onChange={onFilterChange}
            vocabulary={vocabulary}
            total={total}
            totalUnfiltered={totalUnfiltered}
            countQuery={(f) => ideaCountQuery(contextFor(f))}
            clearable={!active}
            leading={
              groupsOn && (
                <IdeaViewsMenu
                  views={views.data ?? []}
                  active={active}
                  edited={edited}
                  allCount={allCount}
                  canSave={narrowed}
                  onOpen={openView}
                  onSaveCurrent={() => setSaving({ mode: 'new' })}
                  onRename={(view) => setSaving({ mode: 'rename', view })}
                  onShare={(view, shared) =>
                    viewWriter.update.mutate({ id: view.id, shared })
                  }
                  onDuplicate={(view) =>
                    viewWriter.create.mutate({
                      name: t('ideas.views.copyName', {
                        name: view.name,
                      }).slice(0, SAVED_VIEW_NAME_MAX),
                      query: view.query,
                      shared: false,
                    })
                  }
                  onDelete={setRemoving}
                />
              )
            }
            trailing={
              groupsOn && active
                ? edited && (
                    <GroupActions
                      canEdit={active.canEdit}
                      busy={viewWriter.update.isPending}
                      onSaveChanges={saveChanges}
                      onSaveAs={() => setSaving({ mode: 'new' })}
                      onRevert={() => openView(active)}
                    />
                  )
                : saveAsGroup
            }
          />
          {groupsOn && active && !active.valid && (
            <p className="mt-1 flex items-center gap-2 pl-5 text-sm text-destructive">
              {t('ideas.views.invalid')}
              {active.canEdit && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setRemoving(active)}
                >
                  {t('ideas.views.remove.confirm')}
                </Button>
              )}
            </p>
          )}

          <ViewRow
            selectAll={selectAll}
            piles={piles}
            pile={pile}
            onPile={(next) =>
              change({ pile: next === 'waiting' ? undefined : next })
            }
            group={group}
            onGroup={(next) =>
              change({ group: next === DEFAULT_IDEA_GROUP ? undefined : next })
            }
            scoped={!!campaignId}
            sort={sort}
            onSort={(next) =>
              change({ sort: next === 'waiting' ? undefined : next })
            }
          />

          {visibleRows.length === 0 ? (
            <div className="min-h-0 flex-1 overflow-y-auto bg-primary">
              {narrowed ? (
                <NoMatches
                  title={t('ideas.filter.nothingMatches')}
                  filter={filter}
                  model={IDEA_FILTER_MODEL}
                  vocabulary={vocabulary}
                  countQuery={(f) => ideaCountQuery(contextFor(f))}
                  onChange={onFilterChange}
                />
              ) : (
                <p className="py-12 text-center text-sm text-tertiary-foreground">
                  {t(`ideas.pileEmpty.${pile}`)}
                </p>
              )}
            </div>
          ) : (
            <IdeaRows
              rows={visibleRows}
              groups={groups ?? []}
              group={group}
              vocabulary={vocabulary}
              now={now}
              showCampaign={campaignId === null}
              expandedId={expandedId}
              onToggleExpanded={(id) =>
                setExpandedId((open) => (open === id ? null : id))
              }
              ticked={ticked}
              selecting={selecting}
              onToggleRow={toggleRow}
              writer={writer}
              onDelete={(idea) =>
                setConfirming({
                  ids: [idea.id],
                  title: idea.title,
                  fromSelection: false,
                })
              }
              onEndReached={() => {
                // Not after a page failed: re-observing the foot would ask
                // again at once, and again. The retry below is the way on.
                if (
                  query.hasNextPage &&
                  !query.isFetchingNextPage &&
                  !query.isFetchNextPageError
                )
                  void query.fetchNextPage()
              }}
              loadingMore={query.isFetchingNextPage}
              moreFailed={query.isFetchNextPageError}
              onRetryMore={() => void query.fetchNextPage()}
            />
          )}
        </div>
      )}

      {selecting && (
        <SelectionBar
          count={ticked.size}
          busy={deleting || resolving}
          onClear={clearSelection}
          onDelete={() => {
            const ids = [...ticked]
            const only =
              ids.length === 1 ? rows.find((r) => r.id === ids[0]) : undefined
            setConfirming({
              ids,
              title: only?.title ?? null,
              fromSelection: true,
            })
          }}
        />
      )}

      <SaveGroupDialog
        isOpen={saving !== null}
        suggested={saving?.mode === 'rename' ? saving.view.name : suggestedName}
        title={
          saving?.mode === 'rename'
            ? t('ideas.views.save.renameTitle')
            : t('ideas.views.save.title')
        }
        confirm={
          saving?.mode === 'rename'
            ? t('ideas.views.save.renameConfirm')
            : t('ideas.views.save.confirm')
        }
        withShare={saving?.mode !== 'rename'}
        saving={viewWriter.create.isPending || viewWriter.update.isPending}
        onClose={() => setSaving(null)}
        onSave={saveGroup}
      />

      <DeleteGroupDialog
        view={removing}
        deleting={viewWriter.remove.isPending}
        onClose={() => setRemoving(null)}
        onConfirm={() => {
          if (!removing) return
          const wasOpen = removing.id === active?.id
          viewWriter.remove.mutate(removing.id, {
            onSuccess: () => {
              if (wasOpen) openView(null)
            },
          })
          setRemoving(null)
        }}
      />

      <DeleteIdeasDialog
        count={confirming?.ids.length ?? 0}
        title={confirming?.title ?? null}
        isOpen={confirming !== null}
        onClose={() => setConfirming(null)}
        onConfirm={() => void handleDeleteConfirmed()}
        deleting={deleting}
      />
    </div>
  )
}

/** The key each pile's tab label is read from. */
const PILE_LABEL = {
  waiting: 'ideas.pile.waiting',
  yes: 'ideas.verdict.yes',
  later: 'ideas.verdict.later',
  no: 'ideas.verdict.no',
} as const satisfies Record<IdeaPile, string>

/**
 * The piles as tabs, counted within the filter — the four always add up to
 * the match — and on the same line, how to read them: Group by and Sort.
 */
function ViewRow({
  selectAll,
  piles,
  pile,
  onPile,
  group,
  onGroup,
  scoped,
  sort,
  onSort,
}: {
  /** Select all, at the line's start over the rows' boxes. */
  selectAll: React.ReactNode
  piles: Record<IdeaPile, number>
  pile: IdeaPile
  onPile: (pile: IdeaPile) => void
  group: IdeaGrouping
  onGroup: (group: IdeaGrouping) => void
  scoped: boolean
  sort: IdeaSort
  onSort: (sort: IdeaSort) => void
}) {
  const { t, i18n } = useTranslation()
  const groupings = IDEA_GROUPS.filter((g) => !(scoped && g === 'campaign'))
  return (
    <div className="mt-2 flex flex-wrap items-end gap-x-5 border-b border-quaternary">
      <div className="flex items-center gap-1">
        {/* In the rows' 20px inset, with the same 20px after it that the
            rows leave before their score: the tabs start where the scores do. */}
        <span className="flex h-10 items-center pr-1 pl-5">{selectAll}</span>
        {IDEA_PILES.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => onPile(p)}
            aria-current={p === pile}
            className={cn(
              '-mb-px cursor-pointer border-b-2 px-3 py-2 text-sm transition-colors',
              p === pile
                ? 'border-primary-foreground font-medium text-primary-foreground'
                : 'border-transparent text-tertiary-foreground hover:text-primary-foreground',
            )}
          >
            {t(PILE_LABEL[p])}
            <span className="ml-1.5 text-tertiary-foreground tabular-nums">
              {formatNumber(piles[p], {}, i18n.language)}
            </span>
          </button>
        ))}
      </div>

      <div className="ml-auto flex items-center gap-5 pb-2 text-[13px]">
        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center gap-1.5 text-secondary-foreground outline-none focus-visible:underline">
            <HugeiconsIcon icon={Layers01Icon} size={16} aria-hidden />
            {t('content.view.groupBy')}
            <span className="flex items-center gap-1 font-medium text-foreground">
              {t(`ideas.view.group.${group}`)}
              <HugeiconsIcon icon={ArrowDown01Icon} size={14} aria-hidden />
            </span>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" sideOffset={6} className="w-56">
            <DropdownMenuRadioGroup
              value={group}
              onValueChange={(v) => onGroup(v as IdeaGrouping)}
            >
              {groupings.map((g) => (
                <DropdownMenuRadioItem key={g} value={g}>
                  {t(`ideas.view.group.${g}`)}
                </DropdownMenuRadioItem>
              ))}
              <DropdownMenuSeparator className="mx-2" />
              <DropdownMenuRadioItem value="none">
                {t('ideas.view.group.none')}
              </DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center gap-1.5 text-secondary-foreground outline-none focus-visible:underline">
            <HugeiconsIcon icon={ArrowUpDownIcon} size={16} aria-hidden />
            {t('content.view.sortBy')}
            <span className="flex items-center gap-1 font-medium text-foreground">
              {t(`ideas.view.sort.${sort}`)}
              <HugeiconsIcon icon={ArrowDown01Icon} size={14} aria-hidden />
            </span>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" sideOffset={6} className="w-56">
            <DropdownMenuRadioGroup
              value={sort}
              onValueChange={(v) => onSort(v as IdeaSort)}
            >
              {IDEA_SORTS.map((s) => (
                <DropdownMenuRadioItem key={s} value={s}>
                  {t(`ideas.view.sort.${s}`)}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}

/**
 * The rows, under a sticky band wherever the group changes. The rows arrive
 * ordered by group, and a band's count is the server's for the whole match —
 * a band whose rows run onto the next page still says how many it holds.
 */
function IdeaRows({
  rows,
  groups,
  group,
  vocabulary,
  now,
  showCampaign,
  expandedId,
  onToggleExpanded,
  ticked,
  selecting,
  onToggleRow,
  writer,
  onDelete,
  onEndReached,
  loadingMore,
  moreFailed,
  onRetryMore,
}: {
  rows: Idea[]
  groups: { key: string; count: number }[]
  group: IdeaGrouping
  vocabulary: IdeaVocabulary
  now: Date
  showCampaign: boolean
  expandedId: string | null
  onToggleExpanded: (id: string) => void
  ticked: Set<string>
  selecting: boolean
  onToggleRow: (id: string) => void
  writer: ReturnType<typeof useIdeaListWriter>
  onDelete: (idea: Idea) => void
  onEndReached: () => void
  loadingMore: boolean
  /** The next page failed; paging waits for the retry. */
  moreFailed: boolean
  onRetryMore: () => void
}) {
  const { t, i18n } = useTranslation()
  const scrollRef = useRef<HTMLDivElement>(null)
  const footRef = useRef<HTMLDivElement>(null)
  /** Bands folded this visit, as `grouping:key`. */
  const [folded, setFolded] = useState<Set<string>>(new Set())
  const toggleBand = (id: string) =>
    setFolded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  const counts = useMemo(
    () => new Map(groups.map((g) => [g.key, g.count])),
    [groups],
  )
  const banded = group !== 'none' && groups.length > 0

  // The foot coming into view asks for the next page; a ref to the callback
  // so a new one each render doesn't re-observe.
  const endReached = useRef(onEndReached)
  useLayoutEffect(() => {
    endReached.current = onEndReached
  })
  useEffect(() => {
    const root = scrollRef.current
    const foot = footRef.current
    if (!root || !foot || typeof IntersectionObserver === 'undefined') return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) endReached.current()
      },
      { root, rootMargin: '400px 0px' },
    )
    observer.observe(foot)
    return () => observer.disconnect()
    // Observed afresh once a page has landed: an observer reports only
    // changes, and with bands folded the foot can stay in view while the new
    // rows go into them, so no change would ever ask for the next page.
  }, [rows.length, loadingMore])

  return (
    // The list scrolls itself, as the Assets list does, so a band stays
    // pinned while its rows pass under it and is pushed off by the next.
    <div
      ref={scrollRef}
      className="@container min-h-0 flex-1 overflow-y-auto bg-primary"
    >
      <ul aria-label={t('ideas.list.label')} className="flex flex-col">
        {rows.map((idea, i) => {
          const key = idea.groupKey ?? ''
          const opensBand =
            banded && (i === 0 || rows[i - 1].groupKey !== idea.groupKey)
          const bandId = `${group}:${key}`
          const isFolded = banded && folded.has(bandId)
          return (
            <Fragment key={idea.id}>
              {opensBand && (
                <Band
                  group={group}
                  groupKey={key}
                  first={idea}
                  vocabulary={vocabulary}
                  count={formatNumber(counts.get(key) ?? 0, {}, i18n.language)}
                  folded={isFolded}
                  onToggle={() => toggleBand(bandId)}
                  firstBand={i === 0}
                />
              )}
              {!isFolded && (
                <IdeaRow
                  idea={idea}
                  now={now}
                  showCampaign={showCampaign}
                  compactSource={group === 'source'}
                  expanded={idea.id === expandedId}
                  onToggle={() => onToggleExpanded(idea.id)}
                  onDecide={(verdict, remindAt) =>
                    void writer.decide(idea.id, verdict, remindAt)
                  }
                  onUndecide={() => void writer.undecide(idea.id)}
                  onEdit={(edit) => void writer.edit(idea.id, edit)}
                  onDelete={() => onDelete(idea)}
                  selection={{
                    selected: ticked.has(idea.id),
                    selecting,
                    onToggle: () => onToggleRow(idea.id),
                  }}
                />
              )}
            </Fragment>
          )
        })}
      </ul>
      <div ref={footRef} aria-hidden className="h-px" />
      {loadingMore && (
        <p className="py-3 text-center text-xs text-secondary-foreground">
          {t('content.filter.loadingMore')}
        </p>
      )}
      {moreFailed && !loadingMore && (
        <p className="flex justify-center gap-2 py-3 text-xs text-destructive">
          {t('ideas.list.moreFailed')}
          <button
            type="button"
            onClick={onRetryMore}
            className="cursor-pointer font-medium text-foreground underline underline-offset-3"
          >
            {t('ideas.capture.retry')}
          </button>
        </p>
      )}
      {/* Room for the floating selection bar, so it never sits on the last row. */}
      {selecting && <div aria-hidden className="h-20" />}
    </div>
  )
}

/** A group's band: its name and how many it holds. */
function Band({
  group,
  groupKey,
  first,
  vocabulary,
  count,
  folded,
  onToggle,
  firstBand,
}: {
  group: IdeaGrouping
  groupKey: string
  /** The band's first row — it carries the author's name the key does not. */
  first: Idea
  vocabulary: IdeaVocabulary
  count: string
  folded: boolean
  onToggle: () => void
  firstBand: boolean
}) {
  const { t } = useTranslation()
  const source = group === 'source' && groupKey !== NONE
  const kind = source ? first.sourceAsset?.kind : null
  const label = (() => {
    switch (group) {
      case 'source':
        return groupKey === NONE
          ? t('ideas.filter.noDocument')
          : (first.sourceAsset?.title ??
              vocabulary.valueLabel('source_asset', groupKey))
      case 'campaign':
        return vocabulary.valueLabel(
          'campaign_id',
          groupKey === '' ? NONE : groupKey,
        )
      case 'fit':
        return vocabulary.valueLabel('fit', groupKey)
      case 'origin':
        return vocabulary.valueLabel(
          'origin',
          groupKey === '' ? 'manual' : groupKey,
        )
      case 'author':
        return groupKey === NONE
          ? t('ideas.list.band.noAuthor')
          : first.authorName || vocabulary.valueLabel('author', groupKey)
      case 'created':
        return t(`content.list.band.created.${groupKey as '1d'}`, {
          defaultValue: groupKey,
        })
      default:
        return ''
    }
  })()
  return (
    // The Assets list's band: pinned at the top of the list while its rows
    // pass under it, and folded by its whole width. Its chevron sits over the
    // rows' boxes and its name level with the filter's words.
    <li
      className={cn(
        'sticky top-0 border-b border-quaternary bg-secondary',
        !firstBand && 'border-t',
      )}
      style={{ zIndex: ZIndex.stickyTableHeader }}
    >
      <h2>
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={!folded}
          aria-label={t(folded ? 'content.list.unfold' : 'content.list.fold', {
            group: label,
          })}
          className="flex h-9.5 w-full cursor-pointer items-center gap-1.5 px-5 text-left text-xs outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-inset"
        >
          <HugeiconsIcon
            icon={ArrowDown01Icon}
            size={16}
            strokeWidth={1.8}
            aria-hidden
            className={cn(
              'shrink-0 text-secondary-foreground transition-transform',
              folded && '-rotate-90',
            )}
          />
          {source && (
            <HugeiconsIcon
              icon={(kind && KIND_ICON[kind]) || Note01Icon}
              size={16}
              strokeWidth={1.5}
              aria-hidden
              className={cn(
                'shrink-0',
                (kind && KIND_TONE[kind]) ?? 'text-kind-neutral',
              )}
            />
          )}
          <span className="truncate font-semibold text-foreground">
            {label}
          </span>
          <span className="tabular-nums text-secondary-foreground">
            {count}
          </span>
          {source && first.sourceAsset && (
            // What the document is, beside how many ideas it gave.
            <span className="truncate text-secondary-foreground">
              {sourceFacts(t, first.sourceAsset)}
            </span>
          )}
        </button>
      </h2>
    </li>
  )
}

/**
 * What is ticked, and what can be done to it — Assets' bar, with one action
 * (§6). It floats at the foot of the column on the app's bottom line, and its
 * count is in tabular figures so the buttons hold still.
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
  const { t } = useTranslation()
  return (
    <div
      className="pointer-events-none absolute inset-x-0 bottom-4 flex justify-center"
      style={{ zIndex: ZIndex.pageActionBar }}
    >
      <div className="pointer-events-auto flex h-12 items-center gap-3 bg-primary px-4 shadow-lg">
        <span
          role="status"
          aria-live="polite"
          className="shrink-0 text-[13px]/4 font-medium tabular-nums whitespace-nowrap"
        >
          {t('ideas.bulk.count', { count })}
        </span>
        <span className="h-6 w-px shrink-0 bg-border" aria-hidden />
        <Button
          variant="ghost"
          size="sm"
          className="text-primary-foreground"
          onClick={onDelete}
          disabled={busy}
        >
          <TrashIcon />
          <span>{t('ideas.bulk.delete')}</span>
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="text-tertiary-foreground"
          onClick={onClear}
          disabled={busy}
        >
          {t('ideas.bulk.clear')}
        </Button>
      </div>
    </div>
  )
}

/**
 * An edited group's actions, at the end of the sentence (CON-391): Save
 * changes for whoever may change it, Save as new… and Revert. Nothing is
 * stored until one is chosen.
 */
function GroupActions({
  canEdit,
  busy,
  onSaveChanges,
  onSaveAs,
  onRevert,
}: {
  canEdit: boolean
  busy: boolean
  onSaveChanges: () => void
  onSaveAs: () => void
  onRevert: () => void
}) {
  const { t } = useTranslation()
  const action =
    'cursor-pointer text-[13px] font-medium whitespace-nowrap text-foreground outline-none hover:underline focus-visible:underline disabled:opacity-50'
  return (
    <span className="inline-flex items-center gap-3.5">
      {canEdit && (
        <button
          type="button"
          className={action}
          onClick={onSaveChanges}
          disabled={busy}
        >
          {t('ideas.views.saveChanges')}
        </button>
      )}
      <button type="button" className={action} onClick={onSaveAs}>
        {t('ideas.views.saveAsNew')}
      </button>
      <button
        type="button"
        className={cn(action, 'font-normal text-secondary-foreground')}
        onClick={onRevert}
      >
        {t('ideas.views.revert')}
      </button>
    </span>
  )
}
