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
import { SmartFilterBar } from '@/components/smartFilter/SmartFilterBar'
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
import { useSettingsStore } from '@/stores/settingsStore'
import { SAVED_VIEW_NAME_MAX, type SavedView } from '@/services/api/savedViews'
import { cn } from '@/lib'
import { viewerTimeZone } from '@/lib/assetFilter'
import {
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
  IdeaViewsPanel,
  SaveGroupDialog,
  ViewsButton,
} from './IdeaViewsPanel'
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
  const writer = useIdeaListWriter({
    campaignId,
    capturesShow: pile === 'waiting',
  })
  // Smart groups are the workspace page's (§5); a campaign's has none yet.
  const groupsOn = campaignId === null
  const views = useIdeaViews({ enabled: groupsOn })
  const viewWriter = useIdeaViewWriter()
  const allCount = useUndecidedIdeaCount()
  const chosenFold = useSettingsStore((st) => st.ideaViewsFolded)
  const setFolded = useSettingsStore((st) => st.setIdeaViewsFolded)
  // Not chosen yet: folded on a narrow window, open on a wide one.
  const [narrowWindow] = useState(
    () => typeof window !== 'undefined' && window.innerWidth < 1280,
  )
  const folded = chosenFold ?? narrowWindow
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
      className="mr-2"
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

  if (query.isPending) return <PageLoader />
  if (query.isError && rows.length === 0)
    return <PageError header={t('ideas.loadFailed')} />

  const firstRun = totalUnfiltered === 0 && !narrowed
  const selecting = ticked.size > 0

  const panelOpen = groupsOn && !folded && !firstRun

  return (
    <div className="relative flex grow flex-col px-3 pb-10 lg:px-6">
      <div
        className={cn(
          'mx-auto flex w-full grow flex-col gap-4',
          // The panel takes its own width beside the column, never the column's.
          panelOpen
            ? 'max-w-[calc(var(--container-content)+236px)]'
            : 'max-w-content',
        )}
      >
        <IdeaCapture onCapture={(title) => void writer.capture(title)} />

        {firstRun ? (
          <div className="pt-6">
            <p className="text-sm text-secondary-foreground">
              {t('ideas.empty.title')}
            </p>
            <p className="pt-1 text-sm text-tertiary-foreground">
              {t('ideas.empty.subtitle')}
            </p>
          </div>
        ) : (
          <div
            className={cn(
              panelOpen
                ? 'grid grid-cols-[220px_minmax(0,1fr)] items-start gap-4'
                : 'flex flex-col',
            )}
          >
            {panelOpen && (
              <IdeaViewsPanel
                views={views.data ?? []}
                activeId={active?.id ?? null}
                allCount={allCount}
                onOpen={openView}
                onFold={() => setFolded(true)}
                onRename={(view) => setSaving({ mode: 'rename', view })}
                onShare={(view, shared) =>
                  viewWriter.update.mutate({ id: view.id, shared })
                }
                onDuplicate={(view) =>
                  viewWriter.create.mutate({
                    name: t('ideas.views.copyName', { name: view.name }).slice(
                      0,
                      SAVED_VIEW_NAME_MAX,
                    ),
                    query: view.query,
                    shared: false,
                  })
                }
                onDelete={setRemoving}
              />
            )}
            <div className="flex min-w-0 flex-col gap-4">
              {groupsOn && (folded || active) && (
                <GroupLine
                  active={active}
                  edited={edited}
                  folded={folded}
                  count={views.data?.length ?? 0}
                  busy={viewWriter.update.isPending}
                  onUnfold={() => setFolded(false)}
                  onDelete={() => active && setRemoving(active)}
                  onSaveChanges={saveChanges}
                  onSaveAs={() => setSaving({ mode: 'new' })}
                  onRevert={() => active && openView(active)}
                />
              )}
              <SmartFilterBar
                filter={filter}
                onChange={onFilterChange}
                model={IDEA_FILTER_MODEL}
                vocabulary={vocabulary}
                total={total}
                totalUnfiltered={totalUnfiltered}
                countQuery={(f) => ideaCountQuery(contextFor(f))}
                leading={selectAll}
                trailing={saveAsGroup}
              />

              <ViewRow
                piles={piles}
                pile={pile}
                onPile={(next) =>
                  change({ pile: next === 'waiting' ? undefined : next })
                }
                group={group}
                onGroup={(next) =>
                  change({ group: next === 'none' ? undefined : next })
                }
                scoped={!!campaignId}
                sort={sort}
                onSort={(next) =>
                  change({ sort: next === 'waiting' ? undefined : next })
                }
              />

              {visibleRows.length === 0 ? (
                narrowed ? (
                  <NoMatches
                    title={t('ideas.filter.nothingMatches')}
                    filter={filter}
                    model={IDEA_FILTER_MODEL}
                    vocabulary={vocabulary}
                    countQuery={(f) => ideaCountQuery(contextFor(f))}
                    onChange={onFilterChange}
                  />
                ) : (
                  <p className="py-8 text-center text-sm text-tertiary-foreground">
                    {t(`ideas.pileEmpty.${pile}`)}
                  </p>
                )
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
                    if (query.hasNextPage && !query.isFetchingNextPage)
                      void query.fetchNextPage()
                  }}
                  loadingMore={query.isFetchingNextPage}
                />
              )}
            </div>
          </div>
        )}
      </div>

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
  piles,
  pile,
  onPile,
  group,
  onGroup,
  scoped,
  sort,
  onSort,
}: {
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
    <div className="flex flex-wrap items-end gap-x-5 border-b border-quaternary">
      <div className="flex items-center gap-1">
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
}) {
  const { t, i18n } = useTranslation()
  const footRef = useRef<HTMLDivElement>(null)
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
    const foot = footRef.current
    if (!foot || typeof IntersectionObserver === 'undefined') return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) endReached.current()
      },
      { rootMargin: '400px 0px' },
    )
    observer.observe(foot)
    return () => observer.disconnect()
  }, [])

  return (
    <div>
      <ul aria-label={t('ideas.list.label')} className="-mx-3 flex flex-col">
        {rows.map((idea, i) => {
          const key = idea.groupKey ?? ''
          const opensBand =
            banded && (i === 0 || rows[i - 1].groupKey !== idea.groupKey)
          return (
            <Fragment key={idea.id}>
              {opensBand && (
                <Band
                  group={group}
                  groupKey={key}
                  first={idea}
                  vocabulary={vocabulary}
                  count={formatNumber(counts.get(key) ?? 0, {}, i18n.language)}
                />
              )}
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
}: {
  group: IdeaGrouping
  groupKey: string
  /** The band's first row — it carries the author's name the key does not. */
  first: Idea
  vocabulary: IdeaVocabulary
  count: string
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
    <li
      className="sticky top-0 mx-3 flex h-9.5 items-center gap-2 border-b border-quaternary bg-primary text-xs"
      style={{ zIndex: ZIndex.stickyTableHeader }}
    >
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
      <h2 className="truncate font-semibold text-foreground">{label}</h2>
      <span className="tabular-nums text-secondary-foreground">{count}</span>
      {source && first.sourceAsset && (
        // What the document is, beside how many ideas it gave.
        <span className="truncate text-secondary-foreground">
          {sourceFacts(t, first.sourceAsset)}
        </span>
      )}
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
      className="pointer-events-none sticky bottom-4 flex justify-center"
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
 * The open group, named above the bar — "Beekeeping, last 30 days · smart
 * group · only you" — and, when the panel is folded, the button that brings
 * it back. Changed, the group is marked edited and offers Save changes (when
 * the viewer may), Save as new… and Revert; nothing is stored until one is
 * chosen. A group whose filter no longer works says so here.
 */
function GroupLine({
  active,
  edited,
  folded,
  count,
  busy,
  onUnfold,
  onDelete,
  onSaveChanges,
  onSaveAs,
  onRevert,
}: {
  active: SavedView | null
  edited: boolean
  folded: boolean
  count: number
  busy: boolean
  onUnfold: () => void
  onDelete: () => void
  onSaveChanges: () => void
  onSaveAs: () => void
  onRevert: () => void
}) {
  const { t } = useTranslation()
  return (
    <div className="flex min-h-8 flex-wrap items-center gap-x-3 gap-y-1">
      {folded && <ViewsButton count={count} onUnfold={onUnfold} />}
      {active && (
        <p className="min-w-0 text-sm text-secondary-foreground">
          <span className="font-medium text-foreground">{active.name}</span>
          {' · '}
          {t('ideas.views.smartGroup')}
          {' · '}
          {active.shared
            ? t('ideas.views.sharedMeta')
            : t('ideas.views.onlyYou')}
          {edited && (
            <span className="ml-2 text-accent">{t('ideas.views.edited')}</span>
          )}
        </p>
      )}
      {active && edited && (
        <span className="ml-auto flex items-center gap-1">
          {active.canEdit && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onSaveChanges}
              disabled={busy}
            >
              {t('ideas.views.saveChanges')}
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={onSaveAs}>
            {t('ideas.views.saveAsNew')}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-secondary-foreground"
            onClick={onRevert}
          >
            {t('ideas.views.revert')}
          </Button>
        </span>
      )}
      {active && !active.valid && (
        <p className="flex items-center gap-2 text-sm text-destructive">
          {t('ideas.views.invalid')}
          {active.canEdit && (
            <Button variant="ghost" size="sm" onClick={onDelete}>
              {t('ideas.views.remove.confirm')}
            </Button>
          )}
        </p>
      )}
    </div>
  )
}
