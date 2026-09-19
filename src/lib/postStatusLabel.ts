import type { TFunction } from 'i18next'
import type { PostStatus } from '@/types/posts'

/**
 * What a status is called, in the language the UI is in.
 *
 * A function taking `t` rather than the `Record<PostStatus, string>` this
 * replaced: a label map built at module scope freezes whichever language
 * loaded first, and this one is read on every card in the calendar, every row
 * of the posts table and the editor's badge — so it would have been the most
 * visible instance of that bug in the app.
 *
 * Falls back to the raw status, which is what the map's `?? status` at each
 * call site was doing. It stays here rather than at those sites because a
 * status the catalogue doesn't know about is one thing to say once: a server
 * that grew a state this client hasn't learned yet.
 */
export function postStatusLabel(t: TFunction, status: PostStatus): string {
  const key = `posts.status.${status}` as const
  const label = t(key, { defaultValue: '' })
  return label || status
}
