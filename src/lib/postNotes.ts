import type { PostNote, PostNoteType } from '@/services/api/postNotes'

/**
 * The catalogue keys `noteTypeKey` can answer with. Spelled out rather than
 * `string`, so `t()` still type-checks them against the catalogue at the call
 * site — a key renamed in `en.ts` has to break here, not at run time.
 */
export type NoteTypeKey =
  | 'posts.notes.type.note'
  | 'posts.notes.type.draftThesis'
  | 'posts.notes.type.imagePrompt'

/**
 * The catalogue key naming a note's type on screen.
 *
 * A table of keys rather than of copy: the API sends `draft_thesis`, never a
 * label, and the vocabulary is validated in Go rather than by a DB constraint
 * — so a type this build predates can arrive without a UI release. It maps
 * onto `note` rather than leaking a snake_case identifier into the page.
 */
export function noteTypeKey(type: PostNoteType | string): NoteTypeKey {
  switch (type) {
    case 'draft_thesis':
      return 'posts.notes.type.draftThesis'
    case 'image_prompt':
      return 'posts.notes.type.imagePrompt'
    default:
      return 'posts.notes.type.note'
  }
}

/**
 * The heading a note card carries.
 *
 * The title when it has one — the note's own words are what identifies it in a
 * list of notes. Failing that, a type worth naming: a draft thesis and an
 * image prompt say where they came from, which a person cannot infer from the
 * body. A plain untitled note gets nothing, because "Note" under a card headed
 * "Notes" is the one label that adds no information — and a type this build
 * predates is a plain note for exactly the same reason.
 */
export function noteHeading(
  note: PostNote,
): { kind: 'title'; text: string } | { kind: 'type'; key: NoteTypeKey } | null {
  const title = note.title.trim()
  if (title) return { kind: 'title', text: title }
  const key = noteTypeKey(note.type)
  return key === 'posts.notes.type.note' ? null : { kind: 'type', key }
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
