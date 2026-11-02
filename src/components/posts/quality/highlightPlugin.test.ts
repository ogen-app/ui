import { describe, expect, it } from 'vitest'
import { BlockNoteEditor } from '@blocknote/core'
import { EditorState } from 'prosemirror-state'
import {
  qualityHighlightKey,
  qualityHighlightPlugin,
  type HighlightSpan,
} from './highlightPlugin'

const PARAGRAPHS = [
  'Every beehive is a micro-nation, and the smallest republics teach the most.',
  'Ukraine’s beekeepers kept 90% of their hives through the war.',
  'Yet the queen is the one who lays the future.',
]

/** BlockNote's own schema and document, without mounting an editor. */
function start() {
  const editor = BlockNoteEditor.create({
    initialContent: PARAGRAPHS.map((content) => ({
      type: 'paragraph' as const,
      content,
    })),
  })
  return EditorState.create({
    doc: editor.prosemirrorState.doc,
    plugins: [qualityHighlightPlugin()],
  })
}

const SPANS: HighlightSpan[] = [
  { index: 0, span: 'kept 90% of their hives', severity: 'high' },
  { index: 1, span: 'Yet the queen', severity: 'low' },
  { index: 2, span: 'a paraphrase nobody wrote', severity: 'medium' },
]

function set(state: EditorState, spans: HighlightSpan[] | null) {
  return state.apply(
    state.tr.setMeta(qualityHighlightKey, { type: 'set', spans }),
  )
}

function choose(state: EditorState, chosen: number | null) {
  return state.apply(
    state.tr.setMeta(qualityHighlightKey, { type: 'choose', chosen }),
  )
}

/** Where `text` sits in the document. */
function find(state: EditorState, text: string) {
  let at = -1
  state.doc.descendants((node, pos) => {
    if (at < 0 && node.isText && node.text?.includes(text)) {
      at = pos + node.text.indexOf(text)
    }
  })
  return { from: at, to: at + text.length }
}

function classes(state: EditorState) {
  const value = qualityHighlightKey.getState(state)!
  return value.decorations
    .find()
    .map(
      (d) =>
        (d as unknown as { type: { attrs: Record<string, string> } }).type
          .attrs,
    )
}

describe('qualityHighlightPlugin', () => {
  it('finds each span and paints it pale, without touching the document', () => {
    const before = start()
    const state = set(before, SPANS)
    expect(state.doc.eq(before.doc)).toBe(true)

    const value = qualityHighlightKey.getState(state)!
    expect(value.marks.map((m) => m.index)).toEqual([0, 1])
    expect(value.marks[0]).toMatchObject(find(state, 'kept 90% of their hives'))
    expect(value.unmarked.get(2)).toBe('edited')
    expect(classes(state).map((a) => a.class)).toEqual([
      'quality-mark quality-mark--high quality-mark--pale',
      'quality-mark quality-mark--low quality-mark--pale',
    ])
  })

  it('brings the chosen span to full strength and marks its line', () => {
    const state = choose(set(start(), SPANS), 0)
    const attrs = classes(state)
    expect(attrs).toContainEqual({
      class: 'quality-mark quality-mark--high quality-mark--chosen',
      'data-quality-chosen': '',
    })
    expect(attrs).toContainEqual({ class: 'quality-line quality-line--high' })
  })

  it('turns a span the author types into from a wash into an underline', () => {
    let state = set(start(), SPANS)
    const { from } = find(state, '90%')
    state = state.apply(state.tr.insertText('most', from, from + 3))

    const mark = qualityHighlightKey.getState(state)!.marks[0]
    expect(mark.edited).toBe(true)
    expect(state.doc.textBetween(mark.from, mark.to)).toBe(
      'kept most of their hives',
    )
    expect(classes(state)[0].class).toBe(
      'quality-mark quality-mark--high quality-mark--edited',
    )
  })

  it('leaves a span alone when the typing is beside it', () => {
    let state = set(start(), SPANS)
    const { to } = find(state, 'kept 90% of their hives')
    state = state.apply(state.tr.insertText(' all', to))
    expect(qualityHighlightKey.getState(state)!.marks[0].edited).toBe(false)
  })

  it('forgets a span deleted outright, and reports it as edited', () => {
    let state = set(start(), SPANS)
    const { from, to } = find(state, 'Yet the queen')
    state = state.apply(state.tr.delete(from, to))
    const value = qualityHighlightKey.getState(state)!
    expect(value.marks.map((m) => m.index)).toEqual([0])
    expect(value.unmarked.get(1)).toBe('edited')
  })

  it('marks nothing for a span that is most of the post', () => {
    const whole = PARAGRAPHS.join(' ')
    const state = set(start(), [{ index: 0, span: whole, severity: 'medium' }])
    const value = qualityHighlightKey.getState(state)!
    expect(value.marks).toEqual([])
    expect(value.unmarked.get(0)).toBe('whole')
    expect(classes(state)).toEqual([])
  })

  it('clears every mark when the panel closes', () => {
    const state = set(choose(set(start(), SPANS), 0), null)
    expect(classes(state)).toEqual([])
  })
})
