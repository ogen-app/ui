import { describe, expect, it } from 'vitest'
import { noteHeading, noteSummary, noteTypeKey } from '@/lib/postNotes'
import type { PostNote, PostNoteType } from '@/services/api/postNotes'

function note(over: Partial<PostNote> & { id: string }): PostNote {
  return {
    post_id: 'p1',
    type: 'note',
    title: '',
    body: 'body',
    origin: 'manual',
    created_by: 'u1',
    created_at: '2026-08-08T10:00:00Z',
    updated_at: '2026-08-08T10:00:00Z',
    ...over,
  }
}

describe('noteTypeKey', () => {
  it('names the three known types', () => {
    expect(noteTypeKey('draft_thesis')).toBe('posts.notes.type.draftThesis')
    expect(noteTypeKey('image_prompt')).toBe('posts.notes.type.imagePrompt')
    expect(noteTypeKey('note')).toBe('posts.notes.type.note')
  })

  it('falls back to note for a type the server grew without us', () => {
    // The vocabulary is validated in Go, not by a DB constraint, so a new
    // value can arrive without a UI release. It must not reach the page raw.
    expect(noteTypeKey('caption_idea' as PostNoteType)).toBe(
      'posts.notes.type.note',
    )
  })
})

describe('noteHeading', () => {
  it('heads a note with its own title', () => {
    expect(
      noteHeading(note({ id: 'a', title: 'Fact-check the stat' })),
    ).toEqual({ kind: 'title', text: 'Fact-check the stat' })
  })

  it('trims the title, and treats a blank one as none', () => {
    expect(noteHeading(note({ id: 'a', title: '  Hook  ' }))).toEqual({
      kind: 'title',
      text: 'Hook',
    })
    expect(noteHeading(note({ id: 'a', title: '   ' }))).toBeNull()
  })

  it('names the type when there is no title and the type says something', () => {
    // Where the note came from is the one thing the body cannot tell you.
    expect(noteHeading(note({ id: 'a', type: 'draft_thesis' }))).toEqual({
      kind: 'type',
      key: 'posts.notes.type.draftThesis',
    })
    expect(noteHeading(note({ id: 'a', type: 'image_prompt' }))).toEqual({
      kind: 'type',
      key: 'posts.notes.type.imagePrompt',
    })
  })

  it('heads an untitled plain note with nothing', () => {
    // "Note", under a card headed "Notes", is the one label that adds nothing.
    expect(noteHeading(note({ id: 'a' }))).toBeNull()
  })

  it('says nothing for a type this build predates, rather than "Note"', () => {
    // An unknown type resolves to the generic key, and the generic key is
    // exactly the label worth omitting.
    expect(
      noteHeading(note({ id: 'a', type: 'caption_idea' as PostNoteType })),
    ).toBeNull()
  })

  it('prefers the title over the type', () => {
    expect(
      noteHeading(note({ id: 'a', type: 'draft_thesis', title: 'The angle' })),
    ).toEqual({ kind: 'title', text: 'The angle' })
  })
})

describe('noteSummary', () => {
  it('prefers the title', () => {
    expect(noteSummary(note({ id: 'a', title: 'Fact-check', body: 'x' }))).toBe(
      'Fact-check',
    )
  })

  it('falls back to the first non-empty body line', () => {
    // The assistant routinely writes a body with no title.
    const n = note({
      id: 'a',
      title: '   ',
      body: '\n\n  Open with the stat  \nthen',
    })
    expect(noteSummary(n)).toBe('Open with the stat')
  })

  it('is empty when there is nothing to show', () => {
    expect(noteSummary(note({ id: 'a', title: '', body: '   \n ' }))).toBe('')
  })
})
