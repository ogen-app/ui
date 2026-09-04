import { addPostAssets, getPost } from '@/services/api/posts'
import { postKey } from '@/hooks/usePost'
import { flushPendingSave } from '@/lib/pendingSaves'
import { landSavedPost } from '@/lib/postCache'
import { queryClient } from '@/lib/queryClient'
import { toast } from '@/stores/toastStore'
import type { Asset } from '@/types/content'
import type { Post } from '@/types/posts'

/**
 * A post's sources — the documents it writes from.
 *
 * `used_asset_ids` is not a label on the post. It is the post assistant's
 * entire reading list: the flow injects it as `requestState.assetIDs`, and the
 * assistant's three source tools work only off that — `listAssets` enumerates
 * exactly those ids, and `getAssetChunks` / `searchAssetChunks` retrieve
 * against ids learned from that list. Nothing else in the workspace is
 * reachable from a post. The same field is what the quality assessment reads
 * for its own context. So a post with an empty list has an assistant that can
 * see the campaign brief and the post body and nothing more, and this is the
 * only place the user can do anything about that.
 *
 * It arrives already populated on generated posts: the content plan stamps
 * each post with the subset of retrieved assets the model said it drew on,
 * filtered to ones actually placed in its prompt (CON-118). Editing it here
 * therefore writes over a provenance record — deliberately, because the field
 * is read forward as intent by everything downstream, and a reading list you
 * cannot change is worse than a provenance record you can.
 */

/** The post's documents, in the order they were attached. */
export function postAssets(
  ids: string[],
  known: Map<string, Asset>,
): { id: string; asset: Asset | null }[] {
  return ids.map((id) => ({ id, asset: known.get(id) ?? null }))
}

/**
 * Index the assets a post carries, newest knowledge winning.
 *
 * `used_assets` is hydrated by the server on every read and write of a post,
 * so the details are free — the post editor never has to fetch the asset list
 * to name what it is reading from, which matters because that list carries
 * every document's full markdown.
 *
 * `extra` is what the client knows before the server has said so: the document
 * just chosen in the picker, or just created from a URL. Without it the row
 * would appear blank for one autosave round-trip.
 */
export function indexAssets(
  hydrated: Asset[],
  extra: Asset[] = [],
): Map<string, Asset> {
  const map = new Map<string, Asset>()
  for (const asset of extra) map.set(asset.id, asset)
  for (const asset of hydrated) map.set(asset.id, asset)
  return map
}

/**
 * Bounded, because the loop below re-runs only when a keystroke lands in the
 * exact window of an in-flight write — twice in a row is already vanishingly
 * rare. Exhausting the bound without ever reading the ids back stable is
 * reported as a failure, not shrugged off: a pending autosave could still be
 * holding the pre-write list, so "done" would be a lie.
 */
const MAX_WRITE_ATTEMPTS = 4

/** Lands the source fields of a server copy in the editor's cache and the row.
 *
 * Only the source fields. The user may have typed since the flush that
 * preceded this, and `changeDoc` has already painted those keystrokes —
 * replacing the whole document would snap the text, and the cursor, back one
 * round-trip. Both server copies here are hydrated, so `used_assets` comes
 * along and the sources card can name the new document without fetching it.
 */
async function landSources(postId: string, server: Post): Promise<void> {
  queryClient.setQueryData<Post>(postKey(postId), (prev) =>
    prev
      ? {
          ...prev,
          used_asset_ids: server.used_asset_ids,
          used_assets: server.used_assets,
        }
      : server,
  )
  await landSavedPost(queryClient, server)
}

/**
 * Unions `assetIds` into the post's sources and confirms they stayed.
 *
 * The write itself is one atomic `POST /api/posts/:id/assets` (CON-233): the
 * server unions the ids into `used_asset_ids` and touches nothing else, so
 * three uploads finishing at once no longer each write the set they read —
 * which is what the read-modify-write here, and the promise queue that
 * serialized it, existed to survive.
 *
 * The verify pass is what remains, and it is not about this endpoint. `PUT
 * /api/posts/:id` still full-replaces `used_asset_ids`, and the editor
 * autosaves the *whole* post — so a keystroke landing while the POST is in
 * flight clones the pre-write list into the 600ms debounce, and its flush puts
 * that list straight back over the attach. Flushing first (the same thing the
 * assistant does before writing a post server-side) closes the window before
 * the write; reading back afterwards catches the straggler that opened it
 * again. Both go when `used_asset_ids` leaves the PUT payload.
 */
async function attach(postId: string, assetIds: string[]): Promise<void> {
  // One more pass than writes: the last round may only verify, never write, so
  // success is only ever reported off a quiet pass — a read that found the ids
  // in place with no flush pending.
  for (let attempt = 0; attempt <= MAX_WRITE_ATTEMPTS; attempt++) {
    await flushPendingSave(postId)
    if (attempt > 0) {
      const post = await getPost(postId)
      // Landed even though nothing was written: with no queue serializing
      // them, several attaches to one post resolve in whatever order the
      // server answers, and the cache holds whichever response arrived last —
      // possibly one taken before a sibling's ids were in the set. This read
      // is the true set, so it converges the cache on the way past.
      await landSources(postId, post)
      const held = new Set(post.used_asset_ids)
      if (assetIds.every((id) => held.has(id))) return
    }
    if (attempt === MAX_WRITE_ATTEMPTS) break
    await landSources(postId, await addPostAssets(postId, assetIds))
  }
  // Every pass found a conflicting flush had already landed over the previous
  // write. The last one may yet be overwritten by a pending autosave, so
  // resolving here would report an attachment that can still be lost — throw
  // instead, and the caller's toast says so.
  throw new Error(
    'The post kept saving over this change — try adding it again.',
  )
}

/**
 * Adds documents to a post's sources, ignoring any it already has.
 *
 * For writes that have to survive the page: an upload finishing after the user
 * walked away still has to join the post it was dropped on. Everything the
 * editor does while it is on screen goes through `changeDoc` instead, which is
 * instant and rides the autosave.
 *
 * Reports its own failure, because the upload store has no mutation cache
 * behind it to toast for it. A post that is already `scheduled` or `published`
 * answers 409 — its sources are locked content (CON-251) — and the server's
 * message is what the toast says.
 */
export function attachToPost(
  postId: string,
  assetIds: string[],
): Promise<void> {
  return attach(postId, assetIds).catch((error: unknown) => {
    toast.error('Unable to add this to the post', {
      description:
        error instanceof Error
          ? error.message
          : 'The document was saved but the post is not reading from it.',
    })
  })
}
