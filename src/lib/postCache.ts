import type { QueryClient } from '@tanstack/react-query'
import { CAMPAIGN_SUMMARIES_KEY, campaignPostsKey } from '@/lib/queryKeys'
import type { Post } from '@/types/posts'

/**
 * Keeping the post lists in step with whoever just wrote a post.
 *
 * A post is cached twice under two namespaces that never invalidate each other:
 * the editor's `['post', id]` and the campaign's `['campaigns', id, 'posts']`
 * that the calendar, the list view and the arrow-key neighbours read. Any write
 * that lands in only one of them leaves the other showing the old row — and
 * with a 30-second `staleTime`, "the other" is exactly what the user sees when
 * they retitle a post and press Back.
 *
 * Lives in `lib/` rather than beside `usePosts`, because the two places that
 * most need it — the editor hook and the assistant store — sit on the wrong
 * side of that hook's imports to reach it (same reason as `queryKeys.ts`).
 */

/**
 * Marks the campaign's posts stale, plus the roll-up that is computed from
 * them. For writes whose result we don't hold — a delete, a create, an
 * assistant turn that rewrote the post server-side. If you *do* hold the saved
 * post, `landSavedPost` is cheaper and doesn't flash the old row first.
 */
export function invalidateCampaignPosts(qc: QueryClient, campaignId: string): void {
  qc.invalidateQueries({ queryKey: campaignPostsKey(campaignId) })
  qc.invalidateQueries({ queryKey: CAMPAIGN_SUMMARIES_KEY })
}

/**
 * Writes a just-saved post into its campaign's list.
 *
 * A patch rather than an invalidation, for two reasons. It is exact — the
 * server hydrates its `PUT`/`GET` response through the same query the list
 * endpoint uses, so the row we hold *is* the row a refetch would return — and
 * it costs nothing, which matters because the editor's autosave calls this
 * every 600ms while someone types, with the list query mounted the whole time
 * (`usePostNeighbours`). Invalidating there would refetch the campaign's posts
 * on every typing burst.
 *
 * The summaries roll-up still gets invalidated: it is derived from post content
 * rather than copied from it, so there is nothing here to patch it with. It is
 * never mounted at the same time as the editor, so this only marks it stale.
 *
 * A post the list doesn't have yet is left alone — an unfetched list will
 * fetch, and a new post arrives through the create path, which invalidates.
 */
/**
 * The campaign list's copy of a post, for opening the editor on it without a
 * fetch first.
 *
 * The same identity `landSavedPost` relies on, read the other way round: the
 * list's rows come from the endpoint that hydrates `GET /posts/:id`, and every
 * editor write lands in both namespaces — so a row this finds *is* what the
 * detail fetch would return. Seeding from it is what makes stepping to a
 * neighbouring post instant instead of unmounting the editor onto a loader.
 *
 * `dataUpdatedAt` travels with the row so Query can judge the seed's age
 * itself: a list fetched moments ago opens the post with no request at all, an
 * older one paints immediately and refetches behind it.
 *
 * Searched across every campaign rather than taking an id, because the editor
 * hook has only the post's. There is one such list cached in practice — the one
 * the calendar, the table and the arrow keys share.
 */
export function cachedPostFromList(
  qc: QueryClient,
  postId: string,
): { post: Post; updatedAt: number } | undefined {
  for (const query of qc.getQueryCache().findAll({ queryKey: ['campaigns'] })) {
    // Prefix matching also lands on the campaigns list and on the summaries
    // roll-up, neither of which holds `Post` rows.
    const key = query.queryKey
    if (key.length !== 3 || key[2] !== 'posts') continue
    const post = (query.state.data as Post[] | undefined)?.find((p) => p.id === postId)
    if (post) return { post, updatedAt: query.state.dataUpdatedAt }
  }
  return undefined
}

export function landSavedPost(qc: QueryClient, post: Post): void {
  const key = campaignPostsKey(post.campaign_id)
  // A list refetch already in flight — a teammate's broadcast invalidating
  // the key just before this save landed — was dispatched before the write
  // committed, so its response can resolve *after* this patch and put the
  // old row back for the full staleTime. Cancel it; the query stays marked
  // stale and refetches on the next mount or focus with the fresh row.
  void qc.cancelQueries({ queryKey: key })
  qc.setQueryData<Post[]>(key, (prev) =>
    prev?.map((p) => (p.id === post.id ? post : p)),
  )
  qc.invalidateQueries({ queryKey: CAMPAIGN_SUMMARIES_KEY })
}
