import { useMemo } from 'react'
import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router'
import { PostsEmptyState } from '@/components/campaigns/PostsEmptyState'
import { PostsToolbar } from '@/components/campaigns/PostsToolbar'
import { MonthlyCalendar } from '@/components/campaigns/calendar/MonthlyCalendar'
import { WeeklyCalendar } from '@/components/campaigns/calendar/WeeklyCalendar'
import {
  addDays,
  addMonths,
  formatAnchor,
  parseAnchor,
} from '@/components/campaigns/calendar/date'
import { useAddPost, useCampaignPosts } from '@/hooks/usePosts.ts'
import { useCalendarSettings } from '@/hooks/useCalendarSettings'
import { useHotkeys } from '@/hooks/useHotkeys'
import { useRememberPostsPlace } from '@/hooks/usePostsPlace'
import type { Post } from '@/types/posts'

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
  beforeLoad: ({ params }) => {
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
      })
    }
  },
  component: CalendarView,
})

function CalendarView() {
  const { campaignId, anchor, view } = Route.useParams()
  const navigate = useNavigate()
  const {
    data: posts,
    isLoading: postsPending,
    isError: postsError,
  } = useCampaignPosts(campaignId)
  const rows = posts ?? NO_POSTS
  // A failed fetch is not an empty campaign: without this, an error left
  // `rows` empty with `postsPending` false, and the screen invited the user to
  // add their first post to a campaign that may hold dozens. Cached rows from
  // an earlier success still draw — only a fetch that never answered is a
  // failure here.
  const postsFailed = postsError && posts === undefined
  // The grid reads the settings itself; the route only needs to know whether
  // they have arrived.
  const { isPending: settingsPending } = useCalendarSettings(campaignId)
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

  return (
    <div className="flex flex-col h-full min-h-0 min-w-0">
      <PostsToolbar
        campaignId={campaignId}
        view={granularity}
        anchor={anchorDate}
        onAnchorChange={handleAnchorChange}
      />
      {settingsPending ? null : postsFailed ? (
        <p className="px-6 py-8 text-sm text-tertiary-foreground">
          Couldn’t load this campaign’s posts — the calendar will fill in once
          they’re reachable again.
        </p>
      ) : !postsPending && rows.length === 0 ? (
        // Only once the query has answered: the invitation to add the first
        // post is a claim about the campaign, and an empty grid is the honest
        // way to wait for it.
        <PostsEmptyState
          variant={granularity}
          campaignId={campaignId}
          anchor={anchorDate}
          onAddPost={addPost}
        />
      ) : (
        <Calendar campaignId={campaignId} posts={rows} anchor={anchorDate} />
      )}
    </div>
  )
}
