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

/**
 * A post's notes (CON-188).
 *
 * Outside the editor's key for the same reason as the history: a note is not
 * part of the post document, and the autosave invalidates `['post', id]` on
 * every settled edit — nesting would refetch the whole note list on each
 * keystroke burst. The assistant writes notes without touching the body, so
 * the two genuinely move independently.
 */
export const postNotesKey = (postId: string) => ['postNotes', postId] as const

/**
 * A campaign's posts — what the calendar, the list view and the arrow-key
 * neighbours all read.
 *
 * Deliberately a different namespace from the editor's `['post', id]`: the two
 * hold the same rows but answer different questions, and nothing invalidates
 * across the boundary by prefix. Whoever writes a post has to land it in both,
 * which is what `postCache.ts` is for.
 */
export const campaignPostsKey = (campaignId: string) =>
  ['campaigns', campaignId, 'posts'] as const

/**
 * The batched Campaigns-list payload (CON-152). Nests under `['campaigns']`,
 * so anything invalidating the campaigns list refreshes it too; post writes
 * invalidate it explicitly because they touch a sibling key.
 */
export const CAMPAIGN_SUMMARIES_KEY = ['campaigns', 'summaries'] as const

/**
 * Every post in the workspace, hydrated (`GET /api/posts`).
 *
 * Deliberately outside `['campaigns', id, 'posts']`: this is the same rows
 * seen from the other side — a question that spans campaigns rather than one
 * campaign's list — and nothing should invalidate one by touching the other.
 */
export const WORKSPACE_POSTS_KEY = ['posts'] as const
