import { useMemo } from 'react'
import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { PageContainer } from '@/components/page-primitives/PageContainer'
import { PageHeader } from '@/components/page-primitives/PageHeader'
import { PostsEmptyState } from '@/components/campaigns/PostsEmptyState'
import { PostsToolbar } from '@/components/campaigns/PostsToolbar'
import { WorkspaceCalendarHeaderActions } from '@/components/campaigns/calendar/CalendarHeaderActions'
import { MonthlyCalendar } from '@/components/campaigns/calendar/MonthlyCalendar'
import { WeeklyCalendar } from '@/components/campaigns/calendar/WeeklyCalendar'
import {
  addDays,
  addMonths,
  formatAnchor,
  parseAnchor,
} from '@/components/campaigns/calendar/date'
import { isFeatureEnabled } from '@/config/featureFlags'
import { useCalendarSettings } from '@/hooks/useCalendarSettings'
import { useHotkeys } from '@/hooks/useHotkeys'
import { useWorkspacePosts } from '@/hooks/usePosts'
import { useRememberPostsPlace } from '@/hooks/usePostsPlace'
import { WORKSPACE_PLACE } from '@/lib/postsPlace'
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
  beforeLoad: ({ params }) => {
    if (!isFeatureEnabled('workspace-calendar'))
      throw redirect({ to: '/campaigns' })
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
 * the whole of the difference — the cards name their campaign, nothing here
 * creates a post, and the view switch has no LIST segment because the table is
 * a campaign's.
 *
 * Owns its own page shell rather than sitting under a layout route: `/calendar`
 * is a redirect and this is the only screen beneath it, so a layout would exist
 * to wrap one child.
 *
 * One seam worth knowing about: opening a post from here and pressing the
 * editor's back arrow lands on that post's *campaign* calendar, not back here.
 * The arrow means "back to this campaign's posts" and reads the campaign's own
 * remembered place (`PostDetailsHeader`); teaching it that a post can be
 * arrived at from somewhere with no campaign would mean recording where the
 * user came from, which is exactly the navigation-writes-memory rule that
 * `usePanelScope` exists to avoid.
 */
function WorkspaceCalendarView() {
  const { anchor, view } = Route.useParams()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const {
    data: posts,
    isLoading: postsPending,
    isError: postsError,
  } = useWorkspacePosts()
  const rows = posts ?? NO_POSTS
  // A failed fetch is not an empty workspace — same rule as the campaign's
  // calendar. Cached rows from an earlier success still draw; only a fetch that
  // never answered is a failure here.
  const postsFailed = postsError && posts === undefined
  // The grids read the settings themselves; the route only needs to know
  // whether they have arrived, because which day starts the week and which days
  // are shown at all decide the shape of the grid.
  const { isPending: settingsPending } = useCalendarSettings()
  // `beforeLoad` has already rejected anything else; this narrows the param
  // for the branches below rather than re-deciding it.
  const granularity = isGranularity(view) ? view : 'week'
  // Memoized because it is the key every range derivation downstream hangs
  // off: a fresh Date each render would rebuild the whole grid each render.
  const anchorDate = useMemo(() => parseAnchor(anchor) ?? new Date(), [anchor])

  // Filed under the workspace's own key in the same map the campaigns use, so
  // coming back to `/calendar` lands on the week that was being read.
  useRememberPostsPlace(WORKSPACE_PLACE, granularity, anchor)

  const handleAnchorChange = (d: Date) =>
    navigate({
      to: '/calendar/$anchor/$view',
      params: { anchor: formatAnchor(d), view: granularity },
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
    <PageContainer variant="fullFlex">
      <div className="flex-1 min-h-0 flex flex-col">
        <PageHeader
          title={t('nav.calendar')}
          actions={<WorkspaceCalendarHeaderActions />}
        />
        <div className="page-content-motion grid overflow-hidden h-full px-3 lg:px-6">
          <div className="flex flex-col h-full min-h-0 min-w-0">
            <PostsToolbar
              campaignId={null}
              view={granularity}
              anchor={anchorDate}
              onAnchorChange={handleAnchorChange}
            />
            {settingsPending ? null : postsFailed ? (
              <p className="px-6 py-8 text-sm text-tertiary-foreground">
                {t('calendar.loadFailed')}
              </p>
            ) : !postsPending && rows.length === 0 ? (
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
    </PageContainer>
  )
}
