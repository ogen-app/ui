import { useMemo } from "react";
import {
  createFileRoute,
  redirect,
  useNavigate,
} from "@tanstack/react-router";
import { PostsEmptyState } from "@/components/campaigns/PostsEmptyState";
import { PostsToolbar } from "@/components/campaigns/PostsToolbar";
import { MonthlyCalendar } from "@/components/campaigns/calendar/MonthlyCalendar";
import { MonthlyCalendarSkeleton } from "@/components/campaigns/calendar/MonthlyCalendarSkeleton";
import { WeeklyCalendar } from "@/components/campaigns/calendar/WeeklyCalendar";
import { WeeklyCalendarSkeleton } from "@/components/campaigns/calendar/WeeklyCalendarSkeleton";
import {
  addDays,
  addMonths,
  formatAnchor,
  parseAnchor,
} from "@/components/campaigns/calendar/date";
import { useAddPost, useCampaignPosts } from "@/hooks/usePosts.ts";
import { useCalendarSettings } from "@/hooks/useCalendarSettings";
import { useHotkeys } from "@/hooks/useHotkeys";

/** The granularities the calendar can be read at. */
const VIEWS = ["week", "month"] as const;
type CalendarGranularity = (typeof VIEWS)[number];

function isGranularity(value: string): value is CalendarGranularity {
  return (VIEWS as readonly string[]).includes(value);
}

export const Route = createFileRoute(
  "/_authenticated/campaigns/$campaignId/calendar/$anchor/$view",
)({
  beforeLoad: ({ params }) => {
    // Normalize malformed anchors / unsupported views to the current week.
    const parsed = parseAnchor(params.anchor);
    if (!parsed || !isGranularity(params.view)) {
      throw redirect({
        to: "/campaigns/$campaignId/calendar/$anchor/$view",
        params: {
          campaignId: params.campaignId,
          anchor: formatAnchor(parsed ?? new Date()),
          view: "week",
        },
      });
    }
  },
  component: CalendarView,
});

function CalendarView() {
  const { campaignId, anchor, view } = Route.useParams();
  const navigate = useNavigate();
  const { data: posts, isLoading: postsPending } = useCampaignPosts(campaignId);
  const {
    firstDayOfWeek,
    hiddenDays,
    isPending: settingsPending,
  } = useCalendarSettings(campaignId);
  const addPost = useAddPost(campaignId);
  // `beforeLoad` has already rejected anything else; this narrows the param
  // for the branches below rather than re-deciding it.
  const granularity = isGranularity(view) ? view : "week";
  // Memoized because it is the key every range derivation downstream hangs
  // off: a fresh Date each render would rebuild the whole grid each render.
  const anchorDate = useMemo(() => parseAnchor(anchor) ?? new Date(), [anchor]);

  // Both queries decide what the grid looks like: the posts fill it, the
  // settings say which columns it has and where it starts. Either one missing
  // means anything we draw would be redrawn.
  const loading = postsPending || settingsPending;

  const handleAnchorChange = (d: Date) =>
    navigate({
      to: "/campaigns/$campaignId/calendar/$anchor/$view",
      params: { campaignId, anchor: formatAnchor(d), view: granularity },
    });

  const Skeleton =
    granularity === "month" ? MonthlyCalendarSkeleton : WeeklyCalendarSkeleton;
  const Calendar = granularity === "month" ? MonthlyCalendar : WeeklyCalendar;

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
      granularity === "month"
        ? addMonths(anchorDate, direction)
        : addDays(anchorDate, direction * 7),
    );
  useHotkeys({
    ArrowLeft: () => step(-1),
    ArrowRight: () => step(1),
  });

  return (
    <div className="flex flex-col h-full min-h-0 min-w-0">
      <PostsToolbar
        campaignId={campaignId}
        view={granularity}
        anchor={anchorDate}
        onAnchorChange={handleAnchorChange}
      />
      {loading ? (
        <Skeleton
          anchor={anchorDate}
          firstDayOfWeek={settingsPending ? null : firstDayOfWeek}
          hiddenDays={hiddenDays}
        />
      ) : !posts || posts.length === 0 ? (
        <PostsEmptyState
          variant={granularity}
          campaignId={campaignId}
          anchor={anchorDate}
          onAddPost={addPost}
        />
      ) : (
        <Calendar campaignId={campaignId} posts={posts} anchor={anchorDate} />
      )}
    </div>
  );
}
