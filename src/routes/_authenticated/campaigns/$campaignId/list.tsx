import { createFileRoute } from "@tanstack/react-router";
import { PostsEmptyState } from "@/components/campaigns/PostsEmptyState";
import { PostsTable } from "@/components/tables/postsTable";
import { PostsToolbar } from "@/components/campaigns/PostsToolbar";
import { useAddPost, useCampaignPosts, useDeletePost } from "@/hooks/usePosts.ts";

export const Route = createFileRoute(
  "/_authenticated/campaigns/$campaignId/list",
)({
  component: CampaignListView,
});

function CampaignListView() {
  const { campaignId } = Route.useParams();
  const { data: posts } = useCampaignPosts(campaignId);
  const deletePost = useDeletePost(campaignId);
  const addPost = useAddPost(campaignId);

  return (
    <div className="flex flex-col h-full min-h-0 min-w-0">
      <PostsToolbar campaignId={campaignId} view="list" />
      {!posts || posts.length === 0 ? (
        <PostsEmptyState variant="list" campaignId={campaignId} onAddPost={addPost} />
      ) : (
        <div className="flex-1 min-h-0 overflow-y-auto">
          <PostsTable
            posts={posts}
            campaignId={campaignId}
            onDelete={(id) => deletePost.mutate(id)}
            emptyStateMessage="No posts yet"
            emptyStateActionLabel="Add Post"
            onEmptyStateAction={addPost}
          />
        </div>
      )}
    </div>
  );
}
