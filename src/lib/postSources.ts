import { addPostAssets, getPost, removePostAsset } from '@/services/api/posts'
import { postKey } from '@/hooks/usePost'
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
 * Lands the source fields of a server copy in the editor's cache and the row.
 *
 * Only the source fields. The user may well have typed since the write went
 * out, and `changeDoc` has already painted those keystrokes — replacing the
 * whole document would snap the text, and the cursor, back one round-trip. The
 * server copy is hydrated, so `used_assets` comes along and the sources card
 * can name the new document without fetching it.
 *
 * Nothing else has to be done to make the write stick. The membership endpoints
 * are the only writer of `used_asset_ids` — the whole-post PUT stopped carrying
 * the field with CON-233 — so there is no autosave left to race, and no read
 * back to check that there wasn't.
 */
async function landPostSources(server: Post): Promise<void> {
  queryClient.setQueryData<Post>(postKey(server.id), (prev) =>
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
 * Puts the sources back to what the server holds, after a write it refused.
 *
 * Both writes below are painted optimistically by their caller, so a refusal
 * leaves a row on screen for a document the post does not read from — the one
 * state this list must never be left in, since it is what the assistant is
 * about to be told it can see. Only the source fields move: the user may be
 * mid-sentence, and their words are not what failed.
 */
function repairSources(postId: string): void {
  void getPost(postId)
    .then(landPostSources)
    .catch(() => {
      // The read failed too — the server is unreachable rather than refusing,
      // and the toast has already said the change did not land. The next fetch
      // of this post corrects the row.
    })
}

/**
 * Adds documents to a post's sources, ignoring any it already has.
 *
 * One atomic `POST /api/posts/:id/assets`: the server unions the ids in and
 * touches nothing else, so three uploads finishing at once all survive — which
 * is what the read-modify-write this replaced, and the promise queue that
 * serialized it, existed to fake.
 *
 * Reports its own failure: both callers — the sources card and an upload
 * finishing after the user has walked away — are outside the mutation cache
 * that toasts everything else. A post that is already `scheduled` or
 * `published` answers 409, its sources being locked content (CON-251), and the
 * server's message is what the toast says.
 */
export function attachToPost(
  postId: string,
  assetIds: string[],
): Promise<void> {
  return addPostAssets(postId, assetIds)
    .then(landPostSources)
    .catch((error: unknown) => {
      toast.error('Unable to add this to the post', {
        description:
          error instanceof Error
            ? error.message
            : 'The document was saved but the post is not reading from it.',
      })
      repairSources(postId)
    })
}

/**
 * Takes one document off a post's sources, leaving the asset alone.
 *
 * The counterpart of `attachToPost`, and the only way a source comes off: the
 * editor's autosave cannot write `used_asset_ids` at all now. The optimistic
 * paint is the caller's — this lands what the server actually holds over it.
 */
export function detachFromPost(postId: string, assetId: string): Promise<void> {
  return removePostAsset(postId, assetId)
    .then(landPostSources)
    .catch((error: unknown) => {
      toast.error('Unable to remove this from the post', {
        description:
          error instanceof Error
            ? error.message
            : 'The post is still reading from that document.',
      })
      repairSources(postId)
    })
}
