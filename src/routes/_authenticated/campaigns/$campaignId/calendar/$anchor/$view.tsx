import { useCallback, useMemo, useState } from 'react'
import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { PostsEmptyState } from '@/components/campaigns/PostsEmptyState'
import { CalendarHeader } from '@/components/campaigns/calendar/CalendarHeader'
import { MonthlyCalendar } from '@/components/campaigns/calendar/MonthlyCalendar'
import { WeeklyCalendar } from '@/components/campaigns/calendar/WeeklyCalendar'
import {
  addDays,
  addMonths,
  calendarRange,
  formatAnchor,
  parseAnchor,
  postsInRange,
} from '@/components/campaigns/calendar/date'
import { CalendarSelectionContext } from '@/components/campaigns/calendar/calendarSelection'
import { BulkActionsBar } from '@/components/campaigns/BulkActionsBar'
import { PostsFilterBar } from '@/components/campaigns/postsFilter/PostsFilterBar'
import { useAddPost, useCampaignPosts } from '@/hooks/usePosts.ts'
import { useBulkPostActions } from '@/hooks/useBulkPostActions'
import {
  useAssistantPage,
  useAssistantRequest,
} from '@/hooks/useAssistantContext'
import { viewerTimeZone } from '@/lib/assetFilter'
import {
  isPostFilterActive,
  parsePostListSearch,
  postFilterFromSearch,
  postRequestParams,
  searchFromPostFilter,
  type PostFilter,
} from '@/lib/postFilter'
import { listFilter, type ViewPage } from '@/lib/viewContext'
import { useCalendarSettings } from '@/hooks/useCalendarSettings'
import { useHotkeys } from '@/hooks/useHotkeys'
import { useRememberPostsPlace } from '@/hooks/usePostsPlace'
import type { Post } from '@/types/posts'
import { awaiting } from '@/lib/fetched'
import { cn } from '@/lib'
import { counted, formatDate, formatDateRange } from '@/lib/intl'

/** Stable identity for a grid with nothing in it yet. */
const NO_POSTS: Post[] = []

/** The granularities the calendar can be read at. */
const VIEWS = ['week', 'month'] as const
type CalendarGranularity = (typeof VIEWS)[number]

function isGranularity(value: string): value is CalendarGranularity {
  return (VIEWS as readonly string[]).includes(value)
}

export const Route = createFileRoute(
  '/_authenticated/campaigns/$campaignId/calendar/$anchor/$view',
)({
  // The posts list's filter, in the same words (CON-472).
  validateSearch: parsePostListSearch,
  beforeLoad: ({ params, search }) => {
    // Normalize malformed anchors / unsupported views to the current week.
    const parsed = parseAnchor(params.anchor)
    if (!parsed || !isGranularity(params.view)) {
      throw redirect({
        to: '/campaigns/$campaignId/calendar/$anchor/$view',
        params: {
          campaignId: params.campaignId,
          anchor: formatAnchor(parsed ?? new Date()),
          view: 'week',
        },
        search,
      })
    }
  },
  component: CalendarView,
})

function CalendarView() {
  const { campaignId, anchor, view } = Route.useParams()
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const search = Route.useSearch()
  const filter = useMemo(() => postFilterFromSearch(search), [search])
  const filtered = isPostFilterActive(filter)
  const [timeZone] = useState(viewerTimeZone)
  const params = useMemo(
    () => postRequestParams(filter, timeZone),
    [filter, timeZone],
  )
  const onFilterChange = useCallback(
    (next: PostFilter) =>
      void navigate({
        to: '/campaigns/$campaignId/calendar/$anchor/$view',
        params: { campaignId, anchor, view },
        search: searchFromPostFilter(next),
        replace: true,
      }),
    [navigate, campaignId, anchor, view],
  )
  const postsQuery = useCampaignPosts(campaignId, params)
  // Whether the campaign has any posts at all is the unfiltered read's to
  // say: a filter that matches nothing is not an empty campaign.
  const allPosts = useCampaignPosts(campaignId)
  const { data: posts, isError: postsError } = postsQuery
  const rows = posts ?? NO_POSTS
  // A failed fetch is not an empty campaign: without this, an error left
  // `rows` empty with `postsPending` false, and the screen invited the user to
  // add their first post to a campaign that may hold dozens. Cached rows from
  // an earlier success still draw — only a fetch that never answered is a
  // failure here.
  const postsFailed = postsError && posts === undefined
  // The grid reads the settings itself; the route only needs to know whether
  // they have arrived.
  const {
    isPending: settingsPending,
    firstDayOfWeek,
    hiddenDays,
  } = useCalendarSettings()
  const addPost = useAddPost(campaignId)
  // `beforeLoad` has already rejected anything else; this narrows the param
  // for the branches below rather than re-deciding it.
  const granularity = isGranularity(view) ? view : 'week'
  // Memoized because it is the key every range derivation downstream hangs
  // off: a fresh Date each render would rebuild the whole grid each render.
  const anchorDate = useMemo(() => parseAnchor(anchor) ?? new Date(), [anchor])

  // The calendar is where the memory is written from — see `lib/postsPlace`.
  // Recorded from the params rather than from `anchorDate`, so what is stored
  // is the string the URL carried and not a re-serialisation of it. `beforeLoad`
  // has already normalised anything malformed, so this only ever sees a real
  // anchor and one of the two granularities.
  useRememberPostsPlace(campaignId, granularity, anchor)

  // Only the settings hold the grid back. Which day starts the week — and
  // which days are shown at all — is a stored preference, and a Monday that
  // turns into a Sunday under the reader is worse than a beat of nothing.
  //
  // The posts don't: the anchor draws the whole grid on its own, so it goes up
  // real and the cards land into the cells they belong in. Sketching cards
  // first only means watching them be replaced by different cards a cell or
  // two along.

  const handleAnchorChange = (d: Date) =>
    navigate({
      to: '/campaigns/$campaignId/calendar/$anchor/$view',
      params: { campaignId, anchor: formatAnchor(d), view: granularity },
      search: true,
    })

  // The same step the toolbar's arrows take, on the arrow keys. Unbounded in
  // both directions — a campaign's calendar has no first or last week, so
  // unlike stepping through posts there is no end to stop at.
  //
  // "The same step" is doing work now that there are two granularities: the
  // keys move a month in the month view and a week in the week view, matching
  // the buttons they shadow. An arrow that always moved seven days would walk
  // the month view a row at a time.
  const step = (direction: number) =>
    handleAnchorChange(
      granularity === 'month'
        ? addMonths(anchorDate, direction)
        : addDays(anchorDate, direction * 7),
    )
  useHotkeys({
    ArrowLeft: () => step(-1),
    ArrowRight: () => step(1),
  })

  // Ticked posts (CON-472): by a card's corner box, or the assistant's select.
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const { applyPlan, deletePosts, busy } = useBulkPostActions(
    campaignId,
    setSelectedIds,
  )
  // The cards on screen: posts dated inside the days shown, less the
  // weekdays this user hides — what the grid draws, and all a tick can reach.
  const range = useMemo(
    () => calendarRange(anchorDate, granularity, firstDayOfWeek),
    [anchorDate, granularity, firstDayOfWeek],
  )
  // Moving to other days or another filter starts a new selection, so ticks
  // left behind never come back unasked. Keyed on the day and view the user
  // chose, not on the range: that shifts when the stored first day of the
  // week arrives, which would clear an assistant's select on a cold mount
  // (CON-482).
  const selectionScope = `${anchor}|${granularity}|${listFilter(params)}`
  const [scopeOfTicks, setScopeOfTicks] = useState(selectionScope)
  if (scopeOfTicks !== selectionScope) {
    setScopeOfTicks(selectionScope)
    setSelectedIds(new Set())
  }
  const onScreen = useMemo(
    () => postsInRange(rows, range, hiddenDays),
    [rows, range, hiddenDays],
  )
  // The sentence counts the days on screen (CON-486), matching and in all —
  // "3 of 5" over a week showing three, not the campaign's whole match.
  const onScreenUnfiltered = useMemo(
    () => postsInRange(allPosts.data ?? NO_POSTS, range, hiddenDays),
    [allPosts.data, range, hiddenDays],
  )
  // Resolved against the cards on screen, so a post that has gone, that the
  // filter hides or that is in another week is never counted or acted on.
  const selectedPosts = useMemo(
    () => onScreen.filter((p) => selectedIds.has(p.id)),
    [onScreen, selectedIds],
  )
  const selection = useMemo(
    () => ({
      ticked: new Set(selectedPosts.map((p) => p.id)) as ReadonlySet<string>,
      toggle: (id: string) =>
        setSelectedIds((prev) => {
          const next = new Set(prev)
          if (!next.delete(id)) next.add(id)
          return next
        }),
    }),
    [selectedPosts],
  )
  // Only the cards on screen can be ticked, and the rail says how many were.
  useAssistantRequest((action) => {
    if (action.type !== 'select' || action.selection?.kind !== 'post')
      return false
    // Not before the posts have arrived: a cold open would tick nothing and
    // spend the request, so it waits for them (`ready`).
    if (!posts) return false
    const here = new Set(onScreen.map((p) => p.id))
    const ids = action.selection.ids.filter((id) => here.has(id))
    setSelectedIds(new Set(ids))
    return ids.length
  }, posts)

  // What the composer's chip calls the ticks (CON-486): their day when they
  // share one — "2 posts on Tue 22" — else the days on screen.
  const selectionLabel = useMemo(() => {
    if (selectedPosts.length === 0) return undefined
    const days = new Set(
      selectedPosts.map((p) => new Date(p.scheduled_at!).toDateString()),
    )
    const count = counted(selectedPosts.length, i18n.language)
    if (days.size === 1)
      return t('assistant.chip.postsOnDay', {
        ...count,
        day: formatDate(
          new Date(selectedPosts[0].scheduled_at!),
          { weekday: 'short', day: 'numeric' },
          i18n.language,
        ),
      })
    return t('assistant.chip.postsInWindow', {
      ...count,
      window: formatDateRange(
        parseAnchor(range.from)!,
        parseAnchor(range.to)!,
        { day: 'numeric', month: 'short' },
        i18n.language,
      ),
    })
  }, [selectedPosts, range, t, i18n.language])

  // What the assistant sees (CON-472): the days on screen as the window, the
  // filter in the endpoint's words — with the zone the window's days are read
  // in — the posts drawn in those days, and what is ticked.
  const page = useMemo<ViewPage>(() => {
    const visible = onScreen.map((p) => p.id)
    const out: ViewPage = {
      filter: listFilter({ ...params, tz: timeZone }),
      window: { from: range.from, to: range.to, campaignId },
    }
    if (visible.length > 0) out.visible = { kind: 'post', ids: visible }
    if (selectedPosts.length > 0) {
      out.selection = {
        kind: 'post',
        ids: selectedPosts.map((p) => p.id),
        count: selectedPosts.length,
      }
      out.selectionLabel = selectionLabel
    }
    return out
  }, [
    onScreen,
    range,
    params,
    timeZone,
    campaignId,
    selectedPosts,
    selectionLabel,
  ])
  useAssistantPage(page)

  // `awaiting`, not `isLoading` — see `lib/fetched`: the empty state is a
  // claim about the campaign, and a paused read is not an answer.
  const campaignEmpty =
    !awaiting(allPosts) && (allPosts.data?.length ?? 0) === 0 && !filtered

  return (
    <div className="flex flex-col h-full min-h-0 min-w-0">
      {/* The header stays while posts are ticked (CON-486): it is the week's
          navigation, and the bulk bar floats over the grid's foot instead. */}
      <CalendarHeader
        campaignId={campaignId}
        view={granularity}
        anchor={anchorDate}
        onAnchorChange={handleAnchorChange}
      />
      <div className="flex flex-1 min-h-0 min-w-0 flex-col px-3 pt-3 lg:px-6">
        {!campaignEmpty && (
          <div className="px-6 pb-3">
            <PostsFilterBar
              campaignId={campaignId}
              filter={filter}
              onChange={onFilterChange}
              total={onScreen.length}
              totalUnfiltered={onScreenUnfiltered.length}
            />
          </div>
        )}
        {settingsPending ? null : postsFailed ? (
          <p className="px-6 py-8 text-sm text-tertiary-foreground">
            {t('calendar.loadFailedCampaign')}
          </p>
        ) : campaignEmpty ? (
          // Only once the query has answered: the invitation to add the first
          // post is a claim about the campaign, and an empty grid is the honest
          // way to wait for it.
          <PostsEmptyState
            variant={granularity}
            anchor={anchorDate}
            onAddPost={addPost}
          />
        ) : (
          <div
            className={cn(
              'relative flex flex-1 min-h-0 min-w-0 flex-col',
              // While the bulk bar shows, its strip under the grid is the bar's
              // (CON-486): its 48px and the 16px it stands off the edge. The
              // grid ends above it, so no card or tick box is ever under it —
              // the month grid can't scroll out from under a bar, and a week
              // lane at its foot couldn't either.
              selectedPosts.length > 0 && 'pb-16',
            )}
          >
            <CalendarSelectionContext.Provider value={selection}>
              {granularity === 'month' ? (
                <MonthlyCalendar
                  campaignId={campaignId}
                  posts={rows}
                  anchor={anchorDate}
                />
              ) : (
                <WeeklyCalendar
                  campaignId={campaignId}
                  posts={rows}
                  anchor={anchorDate}
                  hideIdeaSlots={filtered}
                />
              )}
            </CalendarSelectionContext.Provider>
            {selectedPosts.length > 0 && (
              <BulkActionsBar
                floating
                posts={selectedPosts}
                onClear={() => setSelectedIds(new Set())}
                onApply={applyPlan}
                onDelete={deletePosts}
                busy={busy}
              />
            )}
          </div>
        )}
      </div>
    </div>
  )
}
