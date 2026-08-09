import { useCallback, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { BulkActionsBar } from "@/components/campaigns/BulkActionsBar";
import { PostsEmptyState } from "@/components/campaigns/PostsEmptyState";
import { PostsTable } from "@/components/tables/postsTable";
import { PostsToolbar } from "@/components/campaigns/PostsToolbar";
import {
  useAddPost,
  useCampaignPosts,
  useDeletePost,
  useUpdatePost,
} from "@/hooks/usePosts.ts";
import { usePostsTableSort } from "@/hooks/usePostsTableSort.ts";
import type { BulkPlan } from "@/lib/bulkPostEdits";
import { postToPayload } from "@/services/api/posts";
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
  const { mutate: updatePost, isPending: applying } = useUpdatePost(campaignId);
  const addPost = useAddPost(campaignId);

  // The order is the user's, stored server-side and shared by every campaign's
  // list (CON-170). Until it arrives the table draws skeleton rows rather than
  // the default order, so it never sorts itself again under the reader.
  const {
    sorting,
    setSorting,
    isPending: sortPending,
  } = usePostsTableSort();

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const rows = posts ?? NO_POSTS;

  /**
   * The selection is held by id but every action needs the post itself, so it
   * is resolved against the current rows each render. That also drops ids
   * whose post has since gone — a stale id must not be counted as selected
   * or, worse, handed to a bulk action.
   */
  const selectedPosts = useMemo(
    () => rows.filter((p) => selectedIds.has(p.id)),
    [rows, selectedIds],
  );

  const toggleRow = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (!next.delete(id)) next.add(id);
      return next;
    });
  }, []);

  const toggleAll = useCallback(() => {
    setSelectedIds((prev) => {
      const allSelected = rows.length > 0 && rows.every((p) => prev.has(p.id));
      return allSelected ? new Set<string>() : new Set(rows.map((p) => p.id));
    });
  }, [rows]);

  const clearSelection = useCallback(() => setSelectedIds(new Set()), []);

  const applyPlan = useCallback(
    (plan: BulkPlan) => {
      for (const { post, scheduled_at } of plan.changes) {
        updatePost({
          id: post.id,
          payload: { ...postToPayload(post), scheduled_at },
        });
      }
    },
    [updatePost],
  );

  const deletePosts = useCallback(
    (targets: Post[]) => {
      for (const post of targets) handleDelete(post.id);
      // Only the deleted ones leave the selection; anything the action
      // refused stays ticked, so it is still there to act on.
      setSelectedIds((prev) => {
        const next = new Set(prev);
        for (const post of targets) next.delete(post.id);
        return next;
      });
    },
    [handleDelete],
  );

  return (
    <div className="flex flex-col h-full min-h-0 min-w-0">
      {selectedPosts.length > 0 ? (
        <BulkActionsBar
          posts={selectedPosts}
          onClear={clearSelection}
          onApply={applyPlan}
          onDelete={deletePosts}
          busy={applying}
        />
      ) : (
        <PostsToolbar
          campaignId={campaignId}
          view="list"
          // Held back while the query is in flight: "0 posts" is an answer,
          // and we don't have one yet.
          subheading={
            isLoading
              ? undefined
              : `${rows.length} ${rows.length === 1 ? "post" : "posts"}`
          }
        />
      )}
      {/* Gate on the query, not on `!posts`: the backend answers a campaign
          with no posts with null, so truthiness can't tell "none" from "not
          yet" — and the empty state's invitation to add the first post is a
          claim we don't get to make until we've asked. The table renders on
          one path either way; `loading` draws its own rows. */}
      {!isLoading && rows.length === 0 ? (
        <PostsEmptyState variant="list" campaignId={campaignId} onAddPost={addPost} />
      ) : (
        <div className="flex-1 min-h-0 overflow-y-auto">
          <PostsTable
            posts={rows}
            campaignId={campaignId}
            onDelete={handleDelete}
            emptyStateMessage="No posts yet"
            emptyStateActionLabel="Add Post"
            onEmptyStateAction={addPost}
            loading={isLoading || sortPending}
            selectedIds={selectedIds}
            onToggleRow={toggleRow}
            onToggleAll={toggleAll}
            sorting={sorting}
            onSortingChange={setSorting}
          />
        </div>
      )}
    </div>
  );
}
