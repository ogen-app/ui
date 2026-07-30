import {
  createFileRoute,
  redirect,
  useNavigate,
} from "@tanstack/react-router";
import { PostsEmptyState } from "@/components/campaigns/PostsEmptyState";
import { PostsToolbar } from "@/components/campaigns/PostsToolbar";
import { WeeklyCalendar } from "@/components/campaigns/calendar/WeeklyCalendar";
import { formatAnchor, parseAnchor } from "@/components/campaigns/calendar/date";
import { useAddPost, useCampaignPosts } from "@/hooks/usePosts.ts";

export const Route = createFileRoute(
  "/_authenticated/campaigns/$campaignId/calendar/$anchor/$view",
)({
  beforeLoad: ({ params }) => {
    // Normalize malformed anchors / unsupported views to the current week.
    const parsed = parseAnchor(params.anchor);
    if (!parsed || params.view !== "week") {
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
  const { campaignId, anchor } = Route.useParams();
  const navigate = useNavigate();
  const { data: posts } = useCampaignPosts(campaignId);
  const addPost = useAddPost(campaignId);
  const anchorDate = parseAnchor(anchor) ?? new Date();

  const handleAnchorChange = (d: Date) =>
    navigate({
      to: "/campaigns/$campaignId/calendar/$anchor/$view",
      params: { campaignId, anchor: formatAnchor(d), view: "week" },
    });

  return (
    <div className="flex flex-col h-full min-h-0 min-w-0">
      <PostsToolbar
        campaignId={campaignId}
        view="week"
        anchor={anchorDate}
        onAnchorChange={handleAnchorChange}
      />
      {!posts || posts.length === 0 ? (
        <PostsEmptyState
          variant="week"
          campaignId={campaignId}
          anchor={anchorDate}
          onAddPost={addPost}
        />
      ) : (
        <WeeklyCalendar
          campaignId={campaignId}
          posts={posts}
          anchor={anchorDate}
        />
      )}
    </div>
  );
}
