import { useCallback, useMemo, useState } from 'react'
import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { PostsEmptyState } from '@/components/campaigns/PostsEmptyState'
import { PostsToolbar } from '@/components/campaigns/PostsToolbar'
import { MonthlyCalendar } from '@/components/campaigns/calendar/MonthlyCalendar'
import { WeeklyCalendar } from '@/components/campaigns/calendar/WeeklyCalendar'
import {
  addDays,
  addMonths,
  calendarRange,
  formatAnchor,
  parseAnchor,
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
  const { t } = useTranslation()
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
  const { isPending: settingsPending, firstDayOfWeek } = useCalendarSettings()
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

  const Calendar = granularity === 'month' ? MonthlyCalendar : WeeklyCalendar

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
  // Resolved against the rows, so a post that has gone — or that the filter
  // now hides — is never counted or handed to a bulk action.
  const selectedPosts = useMemo(
    () => rows.filter((p) => selectedIds.has(p.id)),
    [rows, selectedIds],
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
  useAssistantRequest((action) => {
    if (action.type !== 'select' || action.selection?.kind !== 'post')
      return false
    setSelectedIds(new Set(action.selection.ids))
    return true
  })

  // What the assistant sees (CON-472): the days on screen as the window, the
  // filter in the endpoint's words — with the zone the window's days are read
  // in — the posts drawn in those days, and what is ticked.
  const range = useMemo(
    () => calendarRange(anchorDate, granularity, firstDayOfWeek),
    [anchorDate, granularity, firstDayOfWeek],
  )
  const page = useMemo<ViewPage>(() => {
    // Both are days `calendarRange` made, so they parse.
    const from = parseAnchor(range.from)!.getTime()
    const end = addDays(parseAnchor(range.to)!, 1).getTime()
    const visible = rows
      .filter((p) => {
        const at = p.scheduled_at ? Date.parse(p.scheduled_at) : NaN
        return at >= from && at < end
      })
      .map((p) => p.id)
    const out: ViewPage = {
      filter: listFilter({ ...params, tz: timeZone }),
      window: { from: range.from, to: range.to, campaignId },
    }
    if (visible.length > 0) out.visible = { kind: 'post', ids: visible }
    if (selectedPosts.length > 0)
      out.selection = {
        kind: 'post',
        ids: selectedPosts.map((p) => p.id),
        count: selectedPosts.length,
      }
    return out
  }, [rows, range, params, timeZone, campaignId, selectedPosts])
  useAssistantPage(page)

  // `awaiting`, not `isLoading` — see `lib/fetched`: the empty state is a
  // claim about the campaign, and a paused read is not an answer.
  const campaignEmpty =
    !awaiting(allPosts) && (allPosts.data?.length ?? 0) === 0 && !filtered

  return (
    <div className="flex flex-col h-full min-h-0 min-w-0">
      {selectedPosts.length > 0 ? (
        <BulkActionsBar
          posts={selectedPosts}
          onClear={() => setSelectedIds(new Set())}
          onApply={applyPlan}
          onDelete={deletePosts}
          busy={busy}
        />
      ) : (
        <PostsToolbar
          campaignId={campaignId}
          view={granularity}
          anchor={anchorDate}
          onAnchorChange={handleAnchorChange}
        />
      )}
      {!campaignEmpty && (
        <div className="px-6 pb-3">
          <PostsFilterBar
            campaignId={campaignId}
            filter={filter}
            onChange={onFilterChange}
            total={rows.length}
            totalUnfiltered={allPosts.data?.length ?? rows.length}
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
        <CalendarSelectionContext.Provider value={selection}>
          <Calendar campaignId={campaignId} posts={rows} anchor={anchorDate} />
        </CalendarSelectionContext.Provider>
      )}
    </div>
  )
}
