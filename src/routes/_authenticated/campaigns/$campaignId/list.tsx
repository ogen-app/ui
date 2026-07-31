import { createFileRoute } from "@tanstack/react-router";
import { PostsEmptyState } from "@/components/campaigns/PostsEmptyState";
import { PostsTable } from "@/components/tables/postsTable";
import { PostsToolbar } from "@/components/campaigns/PostsToolbar";
import { useAddPost, useCampaignPosts, useDeletePost } from "@/hooks/usePosts.ts";
import type { Post } from "@/types/posts";

export const Route = createFileRoute(
  "/_authenticated/campaigns/$campaignId/list",
)({
  component: CampaignListView,
});

/** Stable identity: the table's columns are memoized against its props. */
const NO_POSTS: Post[] = [];

function CampaignListView() {
  const { campaignId } = Route.useParams();
  const { data: posts, isLoading } = useCampaignPosts(campaignId);
  // `mutate` is stable, so the columns aren't rebuilt on every render.
  const { mutate: handleDelete } = useDeletePost(campaignId);
  const addPost = useAddPost(campaignId);

  return (
    <div className="flex flex-col h-full min-h-0 min-w-0">
      <PostsToolbar campaignId={campaignId} view="list" />
      {/* Gate on the query, not on `!posts`: the backend answers a campaign
          with no posts with null, so truthiness can't tell "none" from "not
          yet" — and the empty state's invitation to add the first post is a
          claim we don't get to make until we've asked. The table renders on
          one path either way; `loading` draws its own rows. */}
      {!isLoading && (!posts || posts.length === 0) ? (
        <PostsEmptyState variant="list" campaignId={campaignId} onAddPost={addPost} />
      ) : (
        <div className="flex-1 min-h-0 overflow-y-auto">
          <PostsTable
            posts={posts ?? NO_POSTS}
            campaignId={campaignId}
            onDelete={handleDelete}
            emptyStateMessage="No posts yet"
            emptyStateActionLabel="Add Post"
            onEmptyStateAction={addPost}
            loading={isLoading}
          />
        </div>
      )}
    </div>
  );
}
