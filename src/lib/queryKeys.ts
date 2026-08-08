/**
 * Query keys that more than one layer has to name.
 *
 * Most keys live beside the hook that owns them. These don't, because the
 * hook that owns them also imports the write path (`usePosts`), while the
 * assistant store and the event router — which have to invalidate the same
 * key — sit *underneath* that write path. Importing the hook from either of
 * them closes a cycle; importing this file doesn't, because it imports
 * nothing.
 */

/**
 * A post's saved versions.
 *
 * Deliberately not `['post', id, 'versions']`: anything invalidating the
 * editor's entry by prefix would drag the history along with it, and the
 * history only changes when a snapshot is taken, a restore lands, or the
 * assistant saves one — all of which say so explicitly.
 */
export const postVersionsKey = (postId: string) => ['postVersions', postId] as const
