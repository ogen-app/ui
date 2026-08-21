import { getPost, postToPayload, updatePost } from "@/services/api/posts";
import { postKey } from "@/hooks/usePost";
import { flushPendingSave } from "@/lib/pendingSaves";
import { landSavedPost } from "@/lib/postCache";
import { queryClient } from "@/lib/queryClient";
import { toast } from "@/stores/toastStore";
import type { Asset } from "@/types/content";
import type { Post } from "@/types/posts";

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
  return ids.map((id) => ({ id, asset: known.get(id) ?? null }));
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
  const map = new Map<string, Asset>();
  for (const asset of extra) map.set(asset.id, asset);
  for (const asset of hydrated) map.set(asset.id, asset);
  return map;
}

/** One promise chain per post, so read-modify-write on the id list is serial. */
const queues = new Map<string, Promise<unknown>>();

function enqueue(postId: string, run: () => Promise<void>): Promise<void> {
  const previous = queues.get(postId) ?? Promise.resolve();
  // `catch` on the tail, not on `run`: a failed write must not break the chain
  // for the next one, but its own rejection still has to reach the caller.
  const next = previous.then(run, run);
  queues.set(
    postId,
    next.catch(() => {}),
  );
  return next;
}

/**
 * Bounded, because the loop below re-runs only when a keystroke lands in the
 * exact window of an in-flight PUT — twice in a row is already vanishingly
 * rare, and past this many attempts the next natural autosave settles it.
 */
const MAX_WRITE_ATTEMPTS = 4;

async function write(
  postId: string,
  nextIds: (post: Post) => string[],
): Promise<void> {
  for (let attempt = 0; attempt < MAX_WRITE_ATTEMPTS; attempt++) {
    // The editor holds the *whole* post in a 600ms debounce, so a PUT from
    // here would be overwritten wholesale by the flush that follows it — the
    // pending copy still carries the id list as it was before this ran.
    // Landing that debounce first is the same thing the assistant does before
    // writing a post server-side, and for the same reason.
    await flushPendingSave(postId);
    const post = await getPost(postId);
    const ids = nextIds(post);
    if (
      ids.length === post.used_asset_ids.length &&
      ids.every((id, i) => id === post.used_asset_ids[i])
    ) {
      return;
    }
    const saved = await updatePost(postId, {
      ...postToPayload(post),
      used_asset_ids: ids,
    });
    // Only the source fields land in the editor's cache. The user may have
    // typed since the flush above, and `changeDoc` has already painted those
    // keystrokes — replacing the whole document with `saved` would snap the
    // text (and the cursor) back one round-trip. The response is hydrated, so
    // `used_assets` comes along and the editor's card can name the new
    // document without fetching anything.
    queryClient.setQueryData<Post>(postKey(postId), (prev) =>
      prev
        ? {
            ...prev,
            used_asset_ids: saved.used_asset_ids,
            used_assets: saved.used_assets,
          }
        : saved,
    );
    landSavedPost(queryClient, saved);
    // Not done yet: a keystroke that arrived *while the PUT was in flight*
    // cloned the pre-write document into the editor's debounce, and its flush
    // will put the old id list straight back. Going round again flushes that
    // straggler and re-asserts; the first quiet pass reads its own ids back
    // and returns above.
  }
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
 * behind it to toast for it.
 */
export function attachToPost(
  postId: string,
  assetIds: string[],
): Promise<void> {
  return enqueue(postId, () =>
    write(postId, (post) => {
      const held = new Set(post.used_asset_ids);
      return [
        ...post.used_asset_ids,
        ...assetIds.filter((id) => !held.has(id)),
      ];
    }),
  ).catch((error: unknown) => {
    toast.error("Unable to add this to the post", {
      description:
        error instanceof Error
          ? error.message
          : "The document was saved but the post is not reading from it.",
    });
  });
}
