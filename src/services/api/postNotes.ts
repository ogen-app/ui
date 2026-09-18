import { apiJson, apiVoid } from './http'

const BASE = '/api/posts'

/**
 * What kind of thing a note holds (CON-188). The set grows server-side without
 * a migration — it is validated in Go, not by a DB constraint — so treat an
 * unknown value as a plain note rather than as an error.
 */
export type PostNoteType = 'draft_thesis' | 'image_prompt' | 'note'

/**
 * How the note came to exist. `created_by` is always a real user even for the
 * two machine origins (the acting session for the assistant, the campaign's
 * creator for the content plan), so this — not the author — is what tells a
 * generated note from a hand-written one.
 */
export type PostNoteOrigin = 'manual' | 'assistant' | 'content_plan'

export type PostNote = {
  id: string
  post_id: string
  type: PostNoteType
  title: string
  body: string
  origin: PostNoteOrigin
  created_by: string
  created_at: string
  updated_at: string
}

/**
 * Every note on the post. The server orders it: `draft_thesis` first, then
 * oldest-first — and unlike the versions list it answers `[]` rather than
 * `null` when there are none.
 */
export function listPostNotes(postId: string): Promise<PostNote[]> {
  return apiJson<PostNote[]>(`${BASE}/${postId}/notes`, 'Unable to load notes')
}

/**
 * Adds a note. `origin` is not part of the body — the server stamps `manual`
 * on anything created through REST, which is what makes the origin trustworthy
 * as "who wrote this".
 */
export function createPostNote(
  postId: string,
  note: { type: PostNoteType; title: string; body: string },
): Promise<PostNote> {
  return apiJson<PostNote>(
    `${BASE}/${postId}/notes`,
    'Unable to add the note',
    {
      method: 'POST',
      body: note,
    },
  )
}

/**
 * Edits a note in place. Send only what changed — the server rejects an empty
 * patch with a 400 rather than treating it as a no-op.
 */
export function updatePostNote(
  postId: string,
  noteId: string,
  patch: { type?: PostNoteType; title?: string; body?: string },
): Promise<PostNote> {
  return apiJson<PostNote>(
    `${BASE}/${postId}/notes/${noteId}`,
    'Unable to save the note',
    { method: 'PATCH', body: patch },
  )
}

export function deletePostNote(postId: string, noteId: string): Promise<void> {
  return apiVoid(
    `${BASE}/${postId}/notes/${noteId}`,
    'Unable to delete the note',
    {
      method: 'DELETE',
    },
  )
}
