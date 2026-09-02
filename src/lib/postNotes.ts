import type { PostNote, PostNoteType } from '@/services/api/postNotes'

/**
 * What a note's type is called on screen. The front end owns this copy — the
 * API sends `draft_thesis`, never a label — so an unknown type coming back
 * from a server that has grown the vocabulary reads as a plain note rather
 * than leaking a snake_case identifier into the page.
 */
export function noteTypeLabel(type: PostNoteType | string): string {
  switch (type) {
    case 'draft_thesis':
      return 'Draft thesis'
    case 'image_prompt':
      return 'Image prompt'
    default:
      return 'Note'
  }
}

/**
 * Whether a note is pinned above the post body.
 *
 * A `draft_thesis` is pinned unless the user has said otherwise. It is the
 * outline the post is being written *from* — since CON-188 the content plan
 * leaves the body empty and puts the thesis here, so filing it under the
 * images would hide the only copy of the brief behind a scroll.
 *
 * That default is why pins are stored as a map rather than a list of ids: an
 * explicit `false` has to be able to outvote the default, and "absent from a
 * list" cannot say that.
 */
export function isNotePinned(
  note: PostNote,
  pins: Record<string, boolean>,
): boolean {
  return pins[note.id] ?? note.type === 'draft_thesis'
}

/**
 * Splits the server's list into the two places notes render — above the post
 * body, and below the media — preserving the order the server sent (draft
 * theses first, then oldest-first) within each group.
 */
export function splitNotesByPin(
  notes: PostNote[],
  pins: Record<string, boolean>,
): { pinned: PostNote[]; rest: PostNote[] } {
  const pinned: PostNote[] = []
  const rest: PostNote[] = []
  for (const note of notes) {
    ;(isNotePinned(note, pins) ? pinned : rest).push(note)
  }
  return { pinned, rest }
}

/**
 * The one-line preview for a collapsed note: its title, or the first non-empty
 * line of the body when it has none. Titles are optional on the API and the
 * assistant often omits them.
 */
export function noteSummary(note: PostNote): string {
  const title = note.title.trim()
  if (title) return title
  const firstLine = note.body
    .split('\n')
    .map((line) => line.trim())
    .find((line) => line.length > 0)
  return firstLine ?? ''
}
