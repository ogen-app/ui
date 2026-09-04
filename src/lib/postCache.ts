import type { QueryClient } from '@tanstack/react-query'
import {
  CAMPAIGN_SUMMARIES_KEY,
  campaignPostsKey,
  WORKSPACE_POSTS_KEY,
} from '@/lib/queryKeys'
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
 * A saved post, carrying the sources the client already holds rather than the
 * ones its own response came back with.
 *
 * The whole-post `PUT` stopped sending `used_asset_ids` with CON-233 — the
 * membership endpoints own the field — so a save's response says nothing about
 * it beyond what the row happened to hold when the server read it. Attach a
 * document while a save is in flight and the two land in either order; without
 * this, the later response quietly takes the document back off the list, and
 * the post looks like it refused an attach that in fact succeeded.
 *
 * `held` is whatever the cache has — the optimistic paint, or the membership
 * endpoint's own hydrated answer, both of which are newer evidence than a reply
 * to a request that never mentioned the field. With nothing cached there is
 * nothing better, and the response stands.
 */
export function withHeldSources(saved: Post, held: Post | undefined): Post {
  if (!held) return saved
  return {
    ...saved,
    used_asset_ids: held.used_asset_ids,
    used_assets: held.used_assets,
  }
}

/**
 * Marks the campaign's posts stale, plus the roll-up that is computed from
 * them. For writes whose result we don't hold — a delete, a create, an
 * assistant turn that rewrote the post server-side. If you *do* hold the saved
 * post, `landSavedPost` is cheaper and doesn't flash the old row first.
 */
export function invalidateCampaignPosts(
  qc: QueryClient,
  campaignId: string,
): void {
  qc.invalidateQueries({ queryKey: campaignPostsKey(campaignId) })
  qc.invalidateQueries({ queryKey: CAMPAIGN_SUMMARIES_KEY })
  // The workspace-wide list holds the same rows under its own root
  // (`useAssetUsage`, auto-publish), so a campaign invalidation never reaches
  // it by prefix — it has to be named.
  qc.invalidateQueries({ queryKey: WORKSPACE_POSTS_KEY })
}

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
    const post = (query.state.data as Post[] | undefined)?.find(
      (p) => p.id === postId,
    )
    if (post) return { post, updatedAt: query.state.dataUpdatedAt }
  }
  return undefined
}

export async function landSavedPost(
  qc: QueryClient,
  post: Post,
): Promise<void> {
  const key = campaignPostsKey(post.campaign_id)
  // A list refetch already in flight — a teammate's broadcast invalidating
  // the key just before this save landed — was dispatched before the write
  // committed, so its response can resolve *after* this patch and put the
  // old row back for the full staleTime. Cancel it; the query stays marked
  // stale and refetches on the next mount or focus with the fresh row.
  // *Awaited*, because cancellation reverts the query to its pre-fetch state
  // as it settles — patching before that revert lands would have the revert
  // erase the patch.
  await Promise.all([
    qc.cancelQueries({ queryKey: key }),
    qc.cancelQueries({ queryKey: WORKSPACE_POSTS_KEY }),
  ])
  qc.setQueryData<Post[]>(key, (prev) =>
    prev?.map((p) => (p.id === post.id ? post : p)),
  )
  // The same row again in the workspace-wide list, which sits outside the
  // `['campaigns']` namespace and would otherwise keep serving the old
  // `used_asset_ids` to `useAssetUsage` for its staleTime.
  qc.setQueryData<Post[]>(WORKSPACE_POSTS_KEY, (prev) =>
    prev?.map((p) => (p.id === post.id ? post : p)),
  )
  qc.invalidateQueries({ queryKey: CAMPAIGN_SUMMARIES_KEY })
}
