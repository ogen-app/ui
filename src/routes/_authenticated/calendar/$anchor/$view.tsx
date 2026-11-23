import { useCallback, useMemo, useState } from 'react'
import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { PageContainer } from '@/components/page-primitives/PageContainer'
import { PostsEmptyState } from '@/components/campaigns/PostsEmptyState'
import { PostsFilterBar } from '@/components/campaigns/postsFilter/PostsFilterBar'
import { CalendarHeader } from '@/components/campaigns/calendar/CalendarHeader'
import { CalendarDrawer } from '@/components/campaigns/calendar/CalendarDrawer'
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
import { useCalendarSettings } from '@/hooks/useCalendarSettings'
import { useHotkeys } from '@/hooks/useHotkeys'
import { useWorkspacePosts } from '@/hooks/usePosts'
import { useRememberPostsPlace } from '@/hooks/usePostsPlace'
import { WORKSPACE_PLACE } from '@/lib/postsPlace'
import { viewerTimeZone } from '@/lib/assetFilter'
import { awaiting } from '@/lib/fetched'
import {
  isPostFilterActive,
  parsePostListSearch,
  postFilterFromSearch,
  postRequestParams,
  searchFromPostFilter,
  type PostFilter,
} from '@/lib/postFilter'
import type { Post } from '@/types/posts'

/** Stable identity for a grid with nothing in it yet. */
const NO_POSTS: Post[] = []

/** The granularities the calendar can be read at. */
const VIEWS = ['week', 'month'] as const
type CalendarGranularity = (typeof VIEWS)[number]

function isGranularity(value: string): value is CalendarGranularity {
  return (VIEWS as readonly string[]).includes(value)
}

export const Route = createFileRoute('/_authenticated/calendar/$anchor/$view')({
  staticData: { help: 'calendar' },
  // The workspace posts list's filter, in the same words (CON-472).
  validateSearch: parsePostListSearch,
  beforeLoad: ({ params, search }) => {
    // Normalize malformed anchors / unsupported views to the current week, as
    // the campaign's calendar does — including `list`, which is a real view
    // there and not one here.
    const parsed = parseAnchor(params.anchor)
    if (!parsed || !isGranularity(params.view)) {
      throw redirect({
        to: '/calendar/$anchor/$view',
        params: {
          anchor: formatAnchor(parsed ?? new Date()),
          view: 'week',
        },
        search,
      })
    }
  },
  component: WorkspaceCalendarView,
})

/**
 * The workspace's calendar — every campaign's posts on one grid.
 *
 * The campaign's calendar with the filter taken off, and deliberately the same
 * components rather than a second implementation: the two grids, the cards, the
 * rung ladder and the toolbar all take the campaign as an argument, and `null`
 * is what says there isn't one. Three things follow from that null and they are
 * the whole of the difference — the cards name their campaign, a day's add
 * asks which campaign the post is for, the filter has a Campaign field, and
 * the view switch has no LIST segment because the table is a campaign's.
 *
 * Owns its own page shell rather than sitting under a layout route: `/calendar`
 * is a redirect and this is the only screen beneath it, so a layout would exist
 * to wrap one child.
 *
 * One seam worth knowing about: opening a post from here and pressing the
 * editor's Posts link lands on that post's *campaign* calendar, not back here.
 * The link means "back to this campaign's posts" and reads the campaign's own
 * remembered place (`PostBar`); teaching it that a post can be arrived at
 * from somewhere with no campaign would mean recording where the user came
 * from, which navigation is not allowed to write.
 */
function WorkspaceCalendarView() {
  const { anchor, view } = Route.useParams()
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
        to: '/calendar/$anchor/$view',
        params: { anchor, view },
        search: (prev) => ({
          ...searchFromPostFilter(next),
          group: prev.group,
        }),
        replace: true,
      }),
    [navigate, anchor, view],
  )
  const postsQuery = useWorkspacePosts(params)
  // Whether there are posts at all is the unfiltered read's to say.
  const allPosts = useWorkspacePosts()
  const { data: posts, isError: postsError } = postsQuery
  const rows = posts ?? NO_POSTS
  // A failed fetch is not an empty workspace — same rule as the campaign's
  // calendar. Cached rows from an earlier success still draw; only a fetch that
  // never answered is a failure here.
  const postsFailed = postsError && posts === undefined
  // The grids read the settings themselves; the route only needs to know
  // whether they have arrived, because which day starts the week and which days
  // are shown at all decide the shape of the grid.
  const {
    isPending: settingsPending,
    firstDayOfWeek,
    hiddenDays,
  } = useCalendarSettings()
  // `beforeLoad` has already rejected anything else; this narrows the param
  // for the branches below rather than re-deciding it.
  const granularity = isGranularity(view) ? view : 'week'
  // Memoized because it is the key every range derivation downstream hangs
  // off: a fresh Date each render would rebuild the whole grid each render.
  const anchorDate = useMemo(() => parseAnchor(anchor) ?? new Date(), [anchor])
  // The pills count the days on screen (CON-486), as the campaign's do.
  const range = useMemo(
    () => calendarRange(anchorDate, granularity, firstDayOfWeek),
    [anchorDate, granularity, firstDayOfWeek],
  )
  const onScreen = useMemo(
    () => postsInRange(rows, range, hiddenDays),
    [rows, range, hiddenDays],
  )
  const onScreenUnfiltered = useMemo(
    () => postsInRange(allPosts.data ?? NO_POSTS, range, hiddenDays),
    [allPosts.data, range, hiddenDays],
  )
  // `awaiting`, not `isLoading` — see `lib/fetched`: the empty state is a
  // claim about the workspace, and a paused read is not an answer.
  const workspaceEmpty =
    !awaiting(allPosts) && (allPosts.data?.length ?? 0) === 0 && !filtered

  // Filed under the workspace's own key in the same map the campaigns use, so
  // coming back to `/calendar` lands on the week that was being read.
  useRememberPostsPlace(WORKSPACE_PLACE, granularity, anchor)

  const handleAnchorChange = (d: Date) =>
    navigate({
      to: '/calendar/$anchor/$view',
      params: { anchor: formatAnchor(d), view: granularity },
      search: true,
    })

  const Calendar = granularity === 'month' ? MonthlyCalendar : WeeklyCalendar

  // The same step the toolbar's arrows take, on the arrow keys: a month in the
  // month view, a week in the week view, unbounded in both directions.
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

  return (
    <PageContainer variant="fullFlex" className="flex-row">
      <div className="flex-1 min-w-0 min-h-0 flex flex-col">
        <CalendarHeader
          campaignId={null}
          view={granularity}
          anchor={anchorDate}
          onAnchorChange={handleAnchorChange}
        />
        <div className="page-content-motion grid overflow-hidden h-full px-3 lg:px-6 pt-3">
          <div className="flex flex-col h-full min-h-0 min-w-0">
            {!workspaceEmpty && (
              <div className="pb-3">
                <PostsFilterBar
                  campaignId={null}
                  filter={filter}
                  onChange={onFilterChange}
                  total={onScreen.length}
                  totalUnfiltered={onScreenUnfiltered.length}
                />
              </div>
            )}
            {settingsPending ? null : postsFailed ? (
              <p className="px-6 py-8 text-sm text-tertiary-foreground">
                {t('calendar.loadFailed')}
              </p>
            ) : workspaceEmpty ? (
              // Only once the query has answered: an empty grid is the honest
              // way to wait for it. No add affordance, so the empty state says
              // where posts come from rather than offering to make one.
              <PostsEmptyState variant={granularity} anchor={anchorDate} />
            ) : (
              <Calendar campaignId={null} posts={rows} anchor={anchorDate} />
            )}
          </div>
        </div>
      </div>
      <CalendarDrawer />
    </PageContainer>
  )
}
