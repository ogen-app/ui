import { describe, expect, it } from 'vitest'
import {
  isNotePinned,
  noteSummary,
  noteTypeLabel,
  splitNotesByPin,
} from '@/lib/postNotes'
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

describe('noteTypeLabel', () => {
  it('names the three known types', () => {
    expect(noteTypeLabel('draft_thesis')).toBe('Draft thesis')
    expect(noteTypeLabel('image_prompt')).toBe('Image prompt')
    expect(noteTypeLabel('note')).toBe('Note')
  })

  it('falls back to Note for a type the server grew without us', () => {
    // The vocabulary is validated in Go, not by a DB constraint, so a new
    // value can arrive without a UI release. It must not reach the page raw.
    expect(noteTypeLabel('caption_idea' as PostNoteType)).toBe('Note')
  })
})

describe('isNotePinned', () => {
  it('pins a draft thesis by default', () => {
    expect(isNotePinned(note({ id: 'a', type: 'draft_thesis' }), {})).toBe(true)
  })

  it('leaves every other type unpinned by default', () => {
    expect(isNotePinned(note({ id: 'a' }), {})).toBe(false)
    expect(isNotePinned(note({ id: 'a', type: 'image_prompt' }), {})).toBe(
      false,
    )
  })

  it('lets an explicit false outvote the draft-thesis default', () => {
    // The reason pins are a map and not a list of ids: "absent" cannot mean
    // "unpinned" when the default is pinned.
    const thesis = note({ id: 'a', type: 'draft_thesis' })
    expect(isNotePinned(thesis, { a: false })).toBe(false)
  })

  it('lets an explicit true pin an ordinary note', () => {
    expect(isNotePinned(note({ id: 'a' }), { a: true })).toBe(true)
  })
})

describe('splitNotesByPin', () => {
  it('keeps the server order within each group', () => {
    const rows = [
      note({ id: 'thesis', type: 'draft_thesis' }),
      note({ id: 'first' }),
      note({ id: 'second' }),
      note({ id: 'third' }),
    ]
    const { pinned, rest } = splitNotesByPin(rows, { second: true })

    expect(pinned.map((n) => n.id)).toEqual(['thesis', 'second'])
    expect(rest.map((n) => n.id)).toEqual(['first', 'third'])
  })

  it('returns empty groups rather than undefined for no notes', () => {
    expect(splitNotesByPin([], {})).toEqual({ pinned: [], rest: [] })
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
