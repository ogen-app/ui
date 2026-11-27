import {
  Fragment,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { useTranslation } from 'react-i18next'
import {
  useAssistantRequest,
  useListAssistantPage,
} from '@/hooks/useAssistantContext'
import { useCompileIdeas, useDraftIdeas } from '@/hooks/useIdeaPosts'
import {
  IdeaPostForm,
  type IdeaPostAnswer,
} from '@/components/ideas/IdeaPostForm'
import { HugeiconsIcon } from '@hugeicons/react'
import { Note01Icon } from '@hugeicons/core-free-icons'
import { CaretDownIcon, PlusIcon, TrashIcon } from '@phosphor-icons/react'
import { KIND_ICON } from '@/components/content/AssetKindMark'
import { KIND_TONE } from '@/components/content/kindTone'
import { NoMatches } from '@/components/smartFilter/NoMatches'
import { PageHeader } from '@/components/page-primitives/PageHeader'
import { PageLoader } from '@/components/page-primitives/PageLoader'
import { PageError } from '@/components/page-primitives/PageError'
import { SelectionLine } from '@/components/page-primitives/SelectionLine'
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
import {
  scrollerOf,
  usePinnedBands,
} from '@/components/page-primitives/pinnedBands'
import {
  CARD_LIST,
  CardBand,
  CardHead,
  HeaderTabs,
} from '@/components/page-primitives/listCards'
import {
  ideaCountQuery,
  useIdeaList,
  useIdeaListWriter,
  useUndecidedIdeaCount,
} from '@/hooks/useIdeaList'
import { useSavedViewWriter, useSavedViews } from '@/hooks/useSavedViews'
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
import type { Idea, IdeaPlan } from '@/lib/ideas'
import { formatNumber } from '@/lib/intl'
import { queryIdeaIds } from '@/services/api/ideas'
import { toast } from '@/stores/toastStore'
import { sourceFacts } from '../card/sourceFacts'
import { DeleteIdeasDialog } from '../DeleteIdeasDialog'
import { IdeaCapture } from '../IdeaCapture'
import { IdeaRow } from '../IdeaRow'
import {
  DeleteGroupDialog,
  SavedViewsMenu,
  GroupActions,
  SaveGroupDialog,
} from '@/components/smartFilter/SavedViewsMenu'
import { FilterPills } from '@/components/smartFilter/FilterPills'
import {
  FilterButton,
  LINE_CONTROL,
  OpenView,
} from '@/components/smartFilter/ListStrip'
import { useIdeaVocabulary, type IdeaVocabulary } from './useIdeaVocabulary'

/** What the delete dialog is asking about. */
type Confirming = {
  ids: string[]
  title: string | null
  fromSelection: boolean
}

/** Pages the list reads on to reach an idea a link names (`?idea=`). */
const ARRIVAL_PAGES = 5

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
  heading,
  campaignId,
  search,
  onSearchChange,
}: {
  /** The page header's title: "Ideas", or the campaign's. */
  heading: string
  campaignId: string | null
  search: IdeaListSearch
  onSearchChange: (next: IdeaListSearch) => void
}) {
  const { t, i18n } = useTranslation()
  const n = (value: number) => formatNumber(value, {}, i18n.language)
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
  const views = useSavedViews('ideas', { enabled: groupsOn })
  const viewWriter = useSavedViewWriter('ideas')
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
  // A different set of exact ideas (`ids`, CON-510) is a different list: an
  // idea left open from the last one would be kept on screen below, so it
  // closes. A verdict within the same set keeps it, as before.
  const [idsShown, setIdsShown] = useState(search.ids)
  if (idsShown !== search.ids) {
    setIdsShown(search.ids)
    if (expandedId !== null && expandedId !== search.idea) setExpandedId(null)
  }
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

  // An idea the address names (`?idea=`, CON-481) — a result card's row —
  // opens once it is on the page, its band unfolded; the address then lets
  // it go, because what is open is the reader's from there on. A card's row
  // sends `ids=` with it (CON-510), so the list holds just that idea and it
  // is on the first page. A link from before that may name one further down:
  // the list reads on, a page at a time, up to `ARRIVAL_PAGES`, and past
  // that, or once the list has no more, it is let go closed.
  const named = search.idea
  const [opened, setOpened] = useState<string | undefined>(undefined)
  // Each arrival is its own: following the same link again opens it again.
  if (!named && opened) setOpened(undefined)
  if (named && named !== opened && rows.some((r) => r.id === named)) {
    setOpened(named)
    setExpandedId(named)
  }
  const pagesRead = query.data?.pages.length ?? 0
  useEffect(() => {
    if (!named) return
    if (opened === named) {
      document
        .querySelector(`[data-idea-id="${CSS.escape(named)}"]`)
        ?.scrollIntoView({ block: 'center' })
    } else {
      if (query.isFetching || !query.isSuccess) return
      if (query.hasNextPage && pagesRead < ARRIVAL_PAGES) {
        void query.fetchNextPage()
        return
      }
    }
    const { idea: _idea, ...rest } = search
    onSearchChange(rest)
  }, [named, opened, query, pagesRead, search, onSearchChange])
  const [ticked, setTicked] = useState<Set<string>>(new Set())
  const [allMatching, setAllMatching] = useState(false)
  const [resolving, setResolving] = useState(false)
  const [confirming, setConfirming] = useState<Confirming | null>(null)
  const [deleting, setDeleting] = useState(false)

  // A new question empties the selection; a new order does not, and nor
  // does another pile — ticks survive a tab switch, the way a mail client's
  // do, and the head says how many are ticked elsewhere.
  const question = useMemo(() => {
    const { sort: _sort, group: _group, tz: _tz, pile: _pile, ...rest } = params
    return JSON.stringify(rest)
  }, [params])
  const [selectionFor, setSelectionFor] = useState(question)
  if (selectionFor !== question) {
    setSelectionFor(question)
    setTicked(new Set())
    setAllMatching(false)
  }
  // "Every match" is the pile's, so it is let go with the pile; the ids stay.
  const [pileFor, setPileFor] = useState(pile)
  if (pileFor !== pile) {
    setPileFor(pile)
    setAllMatching(false)
  }
  /** The asked-for pile and question, for an answer that arrives after either changed. */
  const askedPile = useRef(pile)
  useEffect(() => {
    askedPile.current = pile
  }, [pile])
  // The add field of the pills, which Filter in the list's head opens.
  const [adding, setAdding] = useState(false)
  // Whether ADD IDEA has opened the capture field across the header.
  const [capturing, setCapturing] = useState(false)
  const filterCount = IDEA_FILTER_MODEL.tokensOf(filter).length
  /** The question on screen, for a request that answers after it changed. */
  const asked = useRef(question)
  useEffect(() => {
    asked.current = question
  }, [question])

  // The assistant sees what is ticked, the filter it is under and the rows on
  // screen (CON-451) — a whole match as the filter, never as five thousand ids.
  const visibleIds = useMemo(
    () => visibleRows.slice(0, 50).map((r) => r.id),
    [visibleRows],
  )
  useListAssistantPage({
    kind: 'idea',
    params,
    ticked,
    allMatching,
    total,
    rowIds: visibleIds,
    savedViewId: search.view,
    openId: expandedId,
  })

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
  // Ideas into posts (CON-449): a planned post, or finished drafts.
  const compile = useCompileIdeas()
  const draft = useDraftIdeas()
  // The campaign whose platforms the form offers: the page's, or the one
  // every ticked idea is filed under (CON-470).
  const tickedCampaign = campaignId ?? sharedCampaign(rows, ticked)
  // What the ticked ideas' plans name, for the form to preset (CON-485) —
  // in the order the ids are sent, which is the order the server reads them.
  const tickedPlans = useMemo(() => {
    const byId = new Map(rows.map((r) => [r.id, r]))
    return [...ticked].flatMap((id) => {
      const row = byId.get(id)
      return row ? [row.plan ?? {}] : []
    })
  }, [rows, ticked])

  // The assistant can tick rows here, or open one of the smart groups.
  useAssistantRequest((action) => {
    if (action.type === 'select' && action.selection?.kind === 'idea') {
      setTicked(new Set(action.selection.ids))
      setAllMatching(false)
      return true
    }
    if (action.type === 'open_saved_view' && action.savedViewId) {
      const view = views.data?.find((v) => v.id === action.savedViewId)
      if (!view) return false
      openView(view)
      return true
    }
    return false
  }, views.data)

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
          toast.success(t('savedViews.saved', { name: view.name }))
        },
      },
    )
  }
  const saveChanges = () =>
    active &&
    viewWriter.update.mutate({ id: active.id, query: ideaViewQuery(search) })
  // Saving is on demand: with filters on and no group open, the bar offers it.
  const saveAsGroup = groupsOn && !active && narrowed && (
    <button
      type="button"
      onClick={() => setSaving({ mode: 'new' })}
      className="cursor-pointer font-medium text-accent outline-none hover:underline focus-visible:underline"
    >
      {t('savedViews.saveAs')}
    </button>
  )

  /** The last box pressed, which Shift extends a range from. */
  const anchor = useRef<string | null>(null)
  const toggleRow = (id: string, shift = false) => {
    setAllMatching(false)
    setTicked((prev) => {
      const next = new Set(prev)
      const on = !prev.has(id)
      const from = shift && anchor.current
      const a = from ? visibleRows.findIndex((r) => r.id === from) : -1
      const b = visibleRows.findIndex((r) => r.id === id)
      const range =
        a >= 0 && b >= 0
          ? visibleRows.slice(Math.min(a, b), Math.max(a, b) + 1)
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
  const clearSelection = () => {
    setTicked(new Set())
    setAllMatching(false)
  }
  const selectAllMatching = async () => {
    const question = asked.current
    const forPile = askedPile.current
    setResolving(true)
    try {
      const answer = await queryIdeaIds(params)
      // The filter or the pile moved while this was in flight: these ids
      // answer the previous question, and a delete must never act on that one.
      if (asked.current !== question || askedPile.current !== forPile) return
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
  // The head box takes the page — the cards loaded — and widening to every
  // match is a separate, named step; a half-ticked head box clears.
  const onPage = visibleRows.filter((r) => ticked.has(r.id)).length
  const pageAll = visibleRows.length > 0 && onPage === visibleRows.length
  const elsewhere = allMatching ? 0 : ticked.size - onPage
  const headState: boolean | 'indeterminate' =
    allMatching || pageAll ? true : ticked.size > 0 ? 'indeterminate' : false
  const toggleHead = () =>
    ticked.size > 0
      ? clearSelection()
      : setTicked(new Set(visibleRows.map((r) => r.id)))

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
  if (query.isPending)
    return (
      <>
        <PageHeader title={heading} />
        <div className="h-[60vh]">
          <PageLoader />
        </div>
      </>
    )
  if (query.isError && rows.length === 0)
    return (
      <>
        <PageHeader title={heading} />
        <PageError header={t('ideas.loadFailed')} />
      </>
    )

  const firstRun = totalUnfiltered === 0 && !narrowed
  const selecting = ticked.size > 0 || allMatching
  // With no ideas yet, writing one is all there is to do.
  const writing = capturing || firstRun

  /**
   * The list's one line, pinned: the box over the boxes, then Views, Filter
   * and the pills, Group and Sort at its end — or the selection and its
   * actions in their place.
   */
  const listHead = (
    <CardHead
      wide={campaignId === null}
      box={
        <Checkbox
          checked={headState}
          disabled={resolving}
          onCheckedChange={toggleHead}
          aria-label={
            ticked.size > 0
              ? t('ideas.bulk.clearAll')
              : t('ideas.bulk.selectPage')
          }
        />
      }
    >
      {selecting ? (
        <SelectionLine
          status={
            allMatching
              ? t('ideas.bulk.allIn', {
                  count: total,
                  formatted: n(total),
                  pile: t(PILE_LABEL[pile]),
                })
              : t('ideas.bulk.count', { count: ticked.size })
          }
          clear={
            allMatching
              ? { label: t('ideas.bulk.clearAll'), onClick: clearSelection }
              : undefined
          }
          widen={
            pageAll && total > onPage
              ? {
                  label: t('ideas.bulk.selectAllIn', {
                    count: total,
                    formatted: n(total),
                    pile: t(PILE_LABEL[pile]),
                  }),
                  onClick: () => void selectAllMatching(),
                  disabled: resolving,
                }
              : undefined
          }
          note={
            elsewhere > 0
              ? t('ideas.bulk.elsewhere', {
                  count: elsewhere,
                  formatted: n(elsewhere),
                })
              : undefined
          }
        >
          <SelectionActions
            count={ticked.size}
            busy={deleting || resolving || compile.isPending || draft.isPending}
            campaignId={tickedCampaign}
            plans={tickedPlans}
            onCompile={({ platformIds }) =>
              compile.mutate(
                {
                  ids: [...ticked],
                  campaignId: tickedCampaign ?? undefined,
                  platformIds,
                },
                { onSuccess: clearSelection },
              )
            }
            onDraft={({ platformIds, together }) =>
              draft.mutate(
                {
                  ids: [...ticked],
                  campaignId: tickedCampaign ?? undefined,
                  platformIds,
                  together,
                },
                { onSuccess: clearSelection },
              )
            }
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
        </SelectionLine>
      ) : (
        <>
          <div className="flex min-w-0 flex-1 items-start gap-x-4">
            <FilterButton count={filterCount} onClick={() => setAdding(true)} />
            <FilterPills
              inline
              filter={filter}
              model={IDEA_FILTER_MODEL}
              onChange={onFilterChange}
              vocabulary={vocabulary}
              countQuery={(f) => ideaCountQuery(contextFor(f))}
              adding={adding}
              onAddingChange={setAdding}
              clearable={!active}
              leading={
                groupsOn &&
                active && (
                  <OpenView
                    view={active}
                    edited={edited}
                    onClose={() => openView(null)}
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
          </div>
          <Arrangement
            views={
              groupsOn && (
                <SavedViewsMenu
                  trigger="tab"
                  views={views.data ?? []}
                  allLabel={t('savedViews.all.ideas')}
                  countName="undecided"
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
                      name: t('savedViews.copyName', {
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
            group={group}
            onGroup={(next) =>
              change({
                group: next === DEFAULT_IDEA_GROUP ? undefined : next,
              })
            }
            scoped={!!campaignId}
            sort={sort}
            onSort={(next) =>
              change({ sort: next === 'waiting' ? undefined : next })
            }
          />
        </>
      )}
    </CardHead>
  )

  return (
    <>
      {/* The page header carries the piles — the only counts on the page,
          counted within the filter so the four add up to the match — and
          ADD IDEA, which lays the capture field over the whole row. */}
      <PageHeader
        title={heading}
        actions={
          <Button size="lg" onClick={() => setCapturing(true)}>
            <PlusIcon />
            <span>{t('ideas.capture.open')}</span>
          </Button>
        }
        overlay={
          writing && (
            <IdeaCapture
              onCapture={(title, note, by) => writer.capture(title, note, by)}
              onClose={firstRun ? undefined : () => setCapturing(false)}
            />
          )
        }
      >
        <PileTabs
          piles={piles}
          pile={pile}
          onPile={(next) =>
            change({ pile: next === 'waiting' ? undefined : next })
          }
        />
      </PageHeader>

      <div className="flex flex-col px-3 pb-4 lg:px-6">
        {firstRun ? (
          <div>
            <p className="text-sm text-secondary-foreground">
              {t('ideas.empty.title')}
            </p>
            <p className="pt-1 text-sm text-tertiary-foreground">
              {t('ideas.empty.subtitle')}
            </p>
          </div>
        ) : (
          <>
            {groupsOn && active && !active.valid && (
              <p className="flex items-center gap-2 pb-3 text-xs/4 text-destructive">
                {t('savedViews.invalid')}
                {active.canEdit && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setRemoving(active)}
                  >
                    {t('savedViews.remove.confirm')}
                  </Button>
                )}
              </p>
            )}

            {visibleRows.length === 0 ? (
              <>
                {/* The line stays, so the filter that emptied the list can be
                  changed where it was set. */}
                <ul className={CARD_LIST}>{listHead}</ul>
                <div className="pt-4">
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
                    <p className="py-12 text-center text-sm/5 text-secondary-foreground">
                      {t(`ideas.pileEmpty.${pile}`)}
                    </p>
                  )}
                </div>
              </>
            ) : (
              <IdeaRows
                head={listHead}
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
                onToggleBand={toggleBand}
                writer={writer}
                onDelete={(idea) =>
                  setConfirming({
                    ids: [idea.id],
                    title: idea.title,
                    fromSelection: false,
                  })
                }
                revealId={opened === named ? named : undefined}
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
          </>
        )}
      </div>

      <SaveGroupDialog
        isOpen={saving !== null}
        suggested={saving?.mode === 'rename' ? saving.view.name : suggestedName}
        title={
          saving?.mode === 'rename'
            ? t('savedViews.save.renameTitle')
            : t('savedViews.save.title')
        }
        confirm={
          saving?.mode === 'rename'
            ? t('savedViews.save.renameConfirm')
            : t('savedViews.save.confirm')
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
    </>
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
 * The piles as tabs in the page header, after the title, with the only
 * counts on the page — counted within the filter, so the four always add up
 * to the match. The pile shown is a white tab with a hairline, as a card is.
 */
function PileTabs({
  piles,
  pile,
  onPile,
}: {
  piles: Record<IdeaPile, number>
  pile: IdeaPile
  onPile: (pile: IdeaPile) => void
}) {
  const { t, i18n } = useTranslation()
  return (
    <HeaderTabs
      tabs={IDEA_PILES.map((p) => ({
        id: p,
        label: t(PILE_LABEL[p]),
        count: formatNumber(piles[p], {}, i18n.language),
      }))}
      current={pile}
      onPick={(p) => onPile(p as IdeaPile)}
    />
  )
}

/** Views, Group and Sort, at the head's end. */
function Arrangement({
  views,
  group,
  onGroup,
  scoped,
  sort,
  onSort,
}: {
  /** Views, first at the end: what is saved beside how it is arranged. */
  views: ReactNode
  group: IdeaGrouping
  onGroup: (group: IdeaGrouping) => void
  scoped: boolean
  sort: IdeaSort
  onSort: (sort: IdeaSort) => void
}) {
  const { t } = useTranslation()
  const groupings = IDEA_GROUPS.filter((g) => !(scoped && g === 'campaign'))
  const trigger = LINE_CONTROL
  return (
    <div className="ml-auto flex shrink-0 items-center gap-5">
      {views}
      <DropdownMenu>
        <DropdownMenuTrigger className={trigger}>
          {t('content.view.groupBy')}
          <span className="font-medium text-foreground">
            {t(`ideas.view.group.${group}`)}
          </span>
          <CaretDownIcon className="size-3" aria-hidden />
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
        <DropdownMenuTrigger className={trigger}>
          {t('content.view.sortBy')}
          <span className="font-medium text-foreground">
            {t(`ideas.view.sort.${sort}`)}
          </span>
          <CaretDownIcon className="size-3" aria-hidden />
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
  )
}

/**
 * The cards, under the list's head and, grouped, under a group head wherever
 * the group changes. The rows arrive ordered by group, and a group's count is
 * the server's for the whole match — a group whose cards run onto the next
 * page still says how many it holds. Its box ticks the cards loaded.
 */
function IdeaRows({
  head,
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
  onToggleBand,
  writer,
  onDelete,
  revealId,
  onEndReached,
  loadingMore,
  moreFailed,
  onRetryMore,
}: {
  /** The list's head (`CardHead`), the list's first item. */
  head: React.ReactNode
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
  onToggleRow: (id: string, shift: boolean) => void
  onToggleBand: (ids: string[]) => void
  writer: ReturnType<typeof useIdeaListWriter>
  onDelete: (idea: Idea) => void
  /** An idea a link opened (CON-481): its group unfolds to show it. */
  revealId?: string
  onEndReached: () => void
  loadingMore: boolean
  /** The next page failed; paging waits for the retry. */
  moreFailed: boolean
  onRetryMore: () => void
}) {
  const { t, i18n } = useTranslation()
  const listRef = useRef<HTMLUListElement>(null)
  const footRef = useRef<HTMLDivElement>(null)
  /** Groups folded this visit, as `grouping:key`. */
  const [folded, setFolded] = useState<Set<string>>(new Set())
  const toggleFold = (id: string) =>
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
  const grouped = group !== 'none' && groups.length > 0
  // The head is the list's first band, so it always has an edge to pin under
  // the page header (CON-392).
  usePinnedBands(listRef, rows.length > 0, [rows, folded, group])

  /** Each group's loaded cards, for its box. */
  const members = useMemo(() => {
    const map = new Map<string, string[]>()
    if (!grouped) return map
    for (const r of rows) {
      const key = r.groupKey ?? ''
      map.set(key, [...(map.get(key) ?? []), r.id])
    }
    return map
  }, [rows, grouped])

  // A linked idea in a folded group unfolds it, before the page scrolls to it.
  const revealed = revealId ? rows.find((r) => r.id === revealId) : undefined
  const revealBand =
    revealed && grouped ? `${group}:${revealed.groupKey ?? ''}` : undefined
  if (revealBand && folded.has(revealBand)) {
    const next = new Set(folded)
    next.delete(revealBand)
    setFolded(next)
  }

  // The foot coming into view asks for the next page; a ref to the callback
  // so a new one each render doesn't re-observe.
  const endReached = useRef(onEndReached)
  useLayoutEffect(() => {
    endReached.current = onEndReached
  })
  useEffect(() => {
    const foot = footRef.current
    const root = scrollerOf(foot)
    if (!foot || typeof IntersectionObserver === 'undefined') return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) endReached.current()
      },
      { root, rootMargin: '400px 0px' },
    )
    observer.observe(foot)
    return () => observer.disconnect()
    // Observed afresh once a page has landed: an observer reports only
    // changes, and with groups folded the foot can stay in view while the new
    // rows go into them, so no change would ever ask for the next page.
  }, [rows.length, loadingMore])

  return (
    // The list scrolls with the page, as the Assets list does (CON-392): its
    // head and group heads pin under the page header while the cards pass
    // under them. `@container`: the campaign's column needs the room.
    <div className="@container pb-4">
      <ul
        ref={listRef}
        aria-label={t('ideas.list.label')}
        className={CARD_LIST}
      >
        {head}
        {rows.map((idea, i) => {
          const key = grouped ? (idea.groupKey ?? '') : ''
          const opensBand =
            grouped && (i === 0 || rows[i - 1].groupKey !== idea.groupKey)
          const bandId = `${group}:${key}`
          const isFolded = grouped && folded.has(bandId)
          const ids = members.get(key) ?? []
          return (
            <Fragment key={idea.id}>
              {opensBand && (
                <IdeaBand
                  group={group}
                  groupKey={key}
                  first={idea}
                  vocabulary={vocabulary}
                  count={formatNumber(counts.get(key) ?? 0, {}, i18n.language)}
                  ticked={{
                    on: ids.filter((id) => ticked.has(id)).length,
                    of: ids.length,
                  }}
                  selecting={selecting}
                  wide={showCampaign}
                  folded={isFolded}
                  onFold={() => toggleFold(bandId)}
                  onTick={() => onToggleBand(ids)}
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
                    onToggle: (shift) => onToggleRow(idea.id, shift),
                  }}
                />
              )}
            </Fragment>
          )
        })}
      </ul>
      <div ref={footRef} aria-hidden className="h-px" />
      {loadingMore && (
        <p className="py-3 text-center text-xs/4 text-secondary-foreground">
          {t('content.filter.loadingMore')}
        </p>
      )}
      {moreFailed && !loadingMore && (
        <p className="flex justify-center gap-2 py-3 text-xs/4 text-destructive">
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
    </div>
  )
}

/** A group's head: its box, its name and how many it holds. */
function IdeaBand({
  group,
  groupKey,
  first,
  vocabulary,
  ...band
}: {
  group: IdeaGrouping
  groupKey: string
  /** The group's first card — it carries the author's name the key does not. */
  first: Idea
  vocabulary: IdeaVocabulary
  count: string
  ticked: { on: number; of: number }
  selecting: boolean
  wide: boolean
  folded: boolean
  onFold: () => void
  onTick: () => void
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
      case 'used':
        return vocabulary.valueLabel('used', groupKey)
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
        return t('ideas.view.group.none')
    }
  })()
  return (
    <CardBand
      {...band}
      label={label}
      selectable
      leading={
        source && (
          <HugeiconsIcon
            icon={(kind && KIND_ICON[kind]) || Note01Icon}
            size={12}
            strokeWidth={1.75}
            aria-hidden
            className={cn(
              'shrink-0',
              (kind && KIND_TONE[kind]) ?? 'text-kind-neutral',
            )}
          />
        )
      }
      // What the document is, beside how many ideas it gave.
      aside={source && first.sourceAsset && sourceFacts(t, first.sourceAsset)}
    />
  )
}

/**
 * The campaign every ticked idea on screen is filed under, or null when they
 * differ, have none, or aren't all loaded.
 */
function sharedCampaign(rows: Idea[], ticked: Set<string>): string | null {
  // Past what one compile or draft takes there is no form to fill.
  if (ticked.size > MAX_IDEAS_PER_POST) return null
  let shared: string | null = null
  for (const id of ticked) {
    const campaign = rows.find((r) => r.id === id)?.campaignId
    if (!campaign || (shared && campaign !== shared)) return null
    shared = campaign
  }
  return shared
}

/** How many ideas one compile or draft takes (`/api/ideas/compile|draft`). */
const MAX_IDEAS_PER_POST = 10

/**
 * What can be done to the ticked ideas, in the list's head: make posts of
 * them (a planned post, or finished drafts — one to ten at a time), or
 * delete them, which asks first.
 */
function SelectionActions({
  count,
  busy,
  campaignId,
  plans,
  onDelete,
  onCompile,
  onDraft,
}: {
  count: number
  busy: boolean
  /** The ideas' one campaign, whose platforms COMPILE and DRAFT offer. */
  campaignId: string | null
  /** The ticked ideas' plans, which the form presets from (CON-485). */
  plans: IdeaPlan[]
  onDelete: () => void
  /** Ideas into a planned post per platform (CON-449/470). */
  onCompile: (answer: IdeaPostAnswer) => void
  /** Ideas into finished drafts. */
  onDraft: (answer: IdeaPostAnswer) => void
}) {
  const { t } = useTranslation()
  // The server takes one to ten ideas per compile or draft.
  const tooMany = count > MAX_IDEAS_PER_POST
  const tooManyTitle = tooMany ? t('ideas.lifecycle.tooMany') : undefined
  return (
    <>
      <IdeaPostForm
        verb="compile"
        ideaCount={count}
        campaignId={campaignId}
        plans={plans}
        disabled={busy || tooMany}
        onSubmit={onCompile}
      >
        <Button
          variant="ghost"
          size="sm"
          disabled={busy || tooMany}
          title={tooManyTitle}
        >
          {t('ideas.lifecycle.compile')}
        </Button>
      </IdeaPostForm>
      <IdeaPostForm
        verb="draft"
        ideaCount={count}
        campaignId={campaignId}
        plans={plans}
        disabled={busy || tooMany}
        onSubmit={onDraft}
      >
        <Button
          variant="ghost"
          size="sm"
          disabled={busy || tooMany}
          title={tooManyTitle}
        >
          {t('ideas.lifecycle.draft')}
        </Button>
      </IdeaPostForm>
      <Button variant="ghost" size="sm" onClick={onDelete} disabled={busy}>
        <TrashIcon className="text-destructive" />
        <span>{t('ideas.bulk.delete')}</span>
      </Button>
    </>
  )
}
