import {
  Plugin,
  PluginKey,
  type EditorState,
  type Transaction,
} from 'prosemirror-state'
import { Decoration, DecorationSet, type EditorView } from 'prosemirror-view'
import {
  findSpan,
  isWholePost,
  markClass,
  markRank,
  paintSegments,
  type MarkTone,
  type SpanRange,
  type SpanStatus,
} from '@/lib/qualityHighlights.ts'
import type { QualitySeverity } from '@/types/quality'

/**
 * The quality panel's marks in the post body (CON-441): a ProseMirror plugin
 * that paints every suggestion's span as a decoration.
 *
 * Decorations are the whole point of doing it here rather than with marks:
 * they are not in the document, so they never reach the Markdown the editor
 * saves, never mark the post dirty and never enter undo history. The plugin's
 * inputs arrive as transaction meta, which changes no content either.
 */

/** One suggestion the body is asked to find. `index` is its place in the list. */
export type HighlightSpan = {
  index: number
  span: string
  severity: QualitySeverity
}

/**
 * What the body tells the page, as events on the editor's DOM: the plugin is
 * built once with the editor, so it has no props to call back through.
 */
export const HIGHLIGHT_CHOOSE_EVENT = 'qualityhighlight:choose'
export const HIGHLIGHT_STATUS_EVENT = 'qualityhighlight:status'

/** `detail` of {@link HIGHLIGHT_CHOOSE_EVENT}: the author clicked inside this suggestion's span. */
export type HighlightChooseDetail = number
/** `detail` of {@link HIGHLIGHT_STATUS_EVENT}: every asked-for suggestion's status. */
export type HighlightStatusDetail = Record<number, SpanStatus>

type Mark = {
  index: number
  severity: QualitySeverity
  from: number
  to: number
  edited: boolean
}

type HighlightState = {
  marks: Mark[]
  /** Suggestions that were asked for and found nothing to paint. */
  unmarked: Map<number, Exclude<SpanStatus, 'marked'>>
  chosen: number | null
  decorations: DecorationSet
}

type Meta =
  | { type: 'set'; spans: HighlightSpan[] | null }
  | { type: 'choose'; chosen: number | null }

export const qualityHighlightKey = new PluginKey<HighlightState>(
  'qualityHighlights',
)

type Doc = EditorState['doc']

/**
 * The body as one string — paragraphs joined by a newline — with the document
 * position of every character, so a match in the text is a range in the doc.
 */
function flatten(doc: Doc) {
  let text = ''
  const pos: number[] = []
  const blocks: SpanRange[] = []
  doc.descendants((node, at) => {
    if (!node.isTextblock) return true
    if (text.length > 0) {
      text += '\n'
      pos.push(-1)
    }
    const start = text.length
    node.forEach((child, offset) => {
      const base = at + 1 + offset
      if (child.isText && child.text) {
        for (let i = 0; i < child.text.length; i++) pos.push(base + i)
        text += child.text
      } else {
        // A hard break or an inline node reads as a space.
        pos.push(base)
        text += ' '
      }
    })
    if (text.length > start) blocks.push({ start, end: text.length })
    return false
  })
  return { text, pos, blocks }
}

function locate(doc: Doc, spans: HighlightSpan[]) {
  const { text, pos, blocks } = flatten(doc)
  const marks: Mark[] = []
  const unmarked: HighlightState['unmarked'] = new Map()
  for (const s of spans) {
    const range = findSpan(text, s.span)
    if (!range) {
      unmarked.set(s.index, 'edited')
      continue
    }
    if (isWholePost(range, blocks)) {
      unmarked.set(s.index, 'whole')
      continue
    }
    let first = range.start
    while (first < range.end && pos[first] < 0) first++
    let last = range.end - 1
    while (last > first && pos[last] < 0) last--
    if (pos[first] < 0) {
      unmarked.set(s.index, 'edited')
      continue
    }
    marks.push({
      index: s.index,
      severity: s.severity,
      from: pos[first],
      to: pos[last] + 1,
      edited: false,
    })
  }
  return { marks, unmarked }
}

/**
 * Carries the marks through an edit, step by step. A step that reaches into a
 * mark's range edits it (E4); one that removes all of it removes the mark.
 * Typing at either edge stays outside, the way it does for the title.
 */
function mapMarks(marks: Mark[], tr: Transaction) {
  const lost: number[] = []
  let current = marks
  for (const map of tr.mapping.maps) {
    const next: Mark[] = []
    for (const m of current) {
      let touched = m.edited
      map.forEach((oldStart, oldEnd) => {
        const inserted = oldStart === oldEnd
        if (
          inserted
            ? oldStart > m.from && oldStart < m.to
            : oldStart < m.to && oldEnd > m.from
        ) {
          touched = true
        }
      })
      const from = map.map(m.from, 1)
      const to = map.map(m.to, -1)
      if (to <= from) lost.push(m.index)
      else next.push({ ...m, from, to, edited: touched })
    }
    current = next
  }
  return { marks: current, lost }
}

function toneOf(mark: Mark, chosen: number | null): MarkTone {
  if (mark.edited) return 'edited'
  return mark.index === chosen ? 'chosen' : 'pale'
}

function decorate(doc: Doc, marks: Mark[], chosen: number | null) {
  const painted = paintSegments(
    marks.map((m) => ({
      start: m.from,
      end: m.to,
      mark: m,
      rank: markRank(m.severity, toneOf(m, chosen)),
    })),
  )
  const decorations = painted.map(({ start, end, mark }) => {
    const tone = toneOf(mark, chosen)
    return Decoration.inline(start, end, {
      class: markClass(mark.severity, tone),
      ...(tone === 'chosen' ? { 'data-quality-chosen': '' } : {}),
    })
  })
  // E2's square in the margin, on the paragraph the chosen span starts in.
  const picked = marks.find((m) => m.index === chosen && !m.edited)
  if (picked) {
    const $from = doc.resolve(picked.from)
    if ($from.parent.isTextblock && $from.depth > 0) {
      decorations.push(
        Decoration.node($from.before(), $from.after(), {
          class: `quality-line quality-line--${picked.severity}`,
        }),
      )
    }
  }
  return DecorationSet.create(doc, decorations)
}

function statusesOf(state: HighlightState): Record<number, SpanStatus> {
  const out: Record<number, SpanStatus> = {}
  for (const [index, status] of state.unmarked) out[index] = status
  for (const m of state.marks) out[m.index] = m.edited ? 'edited' : 'marked'
  return out
}

const EMPTY: HighlightState = {
  marks: [],
  unmarked: new Map(),
  chosen: null,
  decorations: DecorationSet.empty,
}

/** The plugin; the editor mounts one per instance. */
export function qualityHighlightPlugin() {
  return new Plugin<HighlightState>({
    key: qualityHighlightKey,
    state: {
      init: () => EMPTY,
      apply(tr, value, _old, state) {
        const meta = tr.getMeta(qualityHighlightKey) as Meta | undefined
        let next = value
        if (tr.docChanged && value.marks.length > 0) {
          const { marks, lost } = mapMarks(value.marks, tr)
          const unmarked = new Map(value.unmarked)
          for (const index of lost) unmarked.set(index, 'edited')
          next = { ...value, marks, unmarked }
        }
        if (meta?.type === 'set') {
          if (!meta.spans) return EMPTY
          const found = locate(state.doc, meta.spans)
          next = { ...next, ...found, chosen: null }
        } else if (meta?.type === 'choose') {
          next = { ...next, chosen: meta.chosen }
        }
        if (next === value && !tr.docChanged) return value
        return {
          ...next,
          decorations: decorate(state.doc, next.marks, next.chosen),
        }
      },
    },
    props: {
      decorations: (state) => qualityHighlightKey.getState(state)?.decorations,
      handleClick(view, pos) {
        const value = qualityHighlightKey.getState(view.state)
        const hit = value?.marks
          .filter((m) => m.from <= pos && pos <= m.to)
          .sort(
            (a, b) =>
              markRank(b.severity, toneOf(b, value.chosen)) -
              markRank(a.severity, toneOf(a, value.chosen)),
          )[0]
        if (hit) {
          view.dom.dispatchEvent(
            new CustomEvent<HighlightChooseDetail>(HIGHLIGHT_CHOOSE_EVENT, {
              detail: hit.index,
            }),
          )
        }
        // Never consume the click: the caret still goes where it was put.
        return false
      },
    },
    view() {
      let reported = ''
      return {
        update(view: EditorView) {
          const value = qualityHighlightKey.getState(view.state)
          if (!value) return
          const statuses = statusesOf(value)
          const key = JSON.stringify(statuses)
          if (key === reported) return
          reported = key
          view.dom.dispatchEvent(
            new CustomEvent<HighlightStatusDetail>(HIGHLIGHT_STATUS_EVENT, {
              detail: statuses,
            }),
          )
        },
      }
    },
  })
}

/** Hands the plugin its spans (or `null` to clear them), changing no content. */
export function setHighlights(view: EditorView, spans: HighlightSpan[] | null) {
  view.dispatch(
    view.state.tr
      .setMeta(qualityHighlightKey, { type: 'set', spans } satisfies Meta)
      .setMeta('addToHistory', false),
  )
}

/** Moves the chosen mark, changing no content. */
export function chooseHighlight(view: EditorView, chosen: number | null) {
  view.dispatch(
    view.state.tr
      .setMeta(qualityHighlightKey, { type: 'choose', chosen } satisfies Meta)
      .setMeta('addToHistory', false),
  )
}
