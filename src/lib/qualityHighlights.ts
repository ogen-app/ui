import type { QualitySeverity } from '@/types/quality'

/**
 * Finding a quality suggestion's `span` in the post, and keeping track of it
 * while the author edits (CON-441).
 *
 * `span` is model-quoted text: the backend requires it on every suggestion,
 * but the model may re-type the quotes, drop the Markdown markers the editor
 * renders away, or quote text the author has since changed. So matching is
 * exact first, then loose, and a miss is an answer rather than an error.
 *
 * Pure, so the post body (ProseMirror positions) and the title (a plain
 * string) share one account of what a match is.
 */

/** A half-open range of characters, `[start, end)`. */
export type SpanRange = { start: number; end: number }

/**
 * What became of a suggestion's span in the post.
 * - `marked`: found, and untouched since the panel opened.
 * - `whole`: the match covers most of the post, so it is not a place in it
 *   and nothing is painted.
 * - `edited`: edited since the panel opened, or not in the post at all — the
 *   client cannot tell "fixed" from "changed" until the next run says so.
 */
export type SpanStatus = 'marked' | 'whole' | 'edited'

/** How a mark is painted: E1's wash, E2's chosen state, E4's underline. */
export type MarkTone = 'pale' | 'chosen' | 'edited'

/** Characters the editor renders away, so a quote of the Markdown still finds the text. */
const DROPPED = new Set(['*', '_', '`'])

/** Typographic variants the model swaps freely for their plain forms. */
const FOLDED: Record<string, string> = {
  '‘': "'",
  '’': "'",
  '“': '"',
  '”': '"',
  '–': '-',
  '—': '-',
}

/** Quotation marks or an ellipsis the model wraps a quote in. */
const WRAPPING = /^(?:["'“”‘’«»]|…|\.\.\.)+|(?:["'“”‘’«»]|…|\.\.\.)+$/g

/**
 * `text` with case, whitespace runs, typographic quotes and Markdown markers
 * folded away, plus where each folded character came from.
 */
function fold(text: string): { text: string; from: number[] } {
  let out = ''
  const from: number[] = []
  let space = false
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (DROPPED.has(ch)) continue
    if (/\s/.test(ch)) {
      if (space || out.length === 0) continue
      space = true
      out += ' '
      from.push(i)
      continue
    }
    space = false
    // Lower-casing can lengthen a character; every piece points back at it.
    for (const piece of (FOLDED[ch] ?? ch).toLowerCase()) {
      out += piece
      from.push(i)
    }
  }
  return { text: out, from }
}

/**
 * Where `span` occurs in `text`: exactly first, then ignoring case,
 * whitespace, typographic quotes and Markdown markers. Several matches mark
 * the first; none is `null`.
 */
export function findSpan(text: string, span: string): SpanRange | null {
  const quote = span.trim()
  if (!quote) return null
  const exact = text.indexOf(quote)
  if (exact >= 0) return { start: exact, end: exact + quote.length }

  const needle = fold(quote.replace(WRAPPING, '')).text.trimEnd()
  if (!needle) return null
  const hay = fold(text)
  const at = hay.text.indexOf(needle)
  if (at < 0) return null
  return { start: hay.from[at], end: hay.from[at + needle.length - 1] + 1 }
}

/**
 * Whether a match is about the whole post rather than a place in it (E3):
 * more than half of the visible characters, or every paragraph of a post that
 * has more than one. Washing it would tint the post from top to bottom and
 * bury the marks that point somewhere.
 *
 * `blocks` are the non-empty paragraphs, in the same coordinates as `range`.
 */
export function isWholePost(range: SpanRange, blocks: SpanRange[]): boolean {
  let visible = 0
  let covered = 0
  for (const block of blocks) {
    visible += block.end - block.start
    covered += Math.max(
      0,
      Math.min(block.end, range.end) - Math.max(block.start, range.start),
    )
  }
  if (visible > 0 && covered * 2 > visible) return true
  return (
    blocks.length > 1 &&
    blocks.every((b) => b.end > range.start && b.start < range.end)
  )
}

/**
 * Carries a range across one edit of a plain string (the title), the way
 * ProseMirror's mapping carries the body's marks: text typed inside moves the
 * end, text typed before moves both, and typing at either edge stays outside.
 *
 * `touched` says the edit reached into the range (E4). A `null` range means
 * the edit removed all of it.
 */
export function mapRangeThroughEdit(
  prev: string,
  next: string,
  range: SpanRange,
): { range: SpanRange | null; touched: boolean } {
  if (prev === next) return { range, touched: false }
  const shorter = Math.min(prev.length, next.length)
  let head = 0
  while (head < shorter && prev[head] === next[head]) head++
  let tail = 0
  while (
    tail < shorter - head &&
    prev[prev.length - 1 - tail] === next[next.length - 1 - tail]
  ) {
    tail++
  }
  // `prev[head, oldEnd)` became `next[head, newEnd)`.
  const oldEnd = prev.length - tail
  const newEnd = next.length - tail
  const delta = newEnd - oldEnd

  if (oldEnd <= range.start) {
    return {
      range: { start: range.start + delta, end: range.end + delta },
      touched: false,
    }
  }
  if (head >= range.end) return { range, touched: false }

  // Text typed in place of the span's edges belongs to the span.
  const start = Math.min(range.start, head)
  const end = range.end <= oldEnd ? newEnd : range.end + delta
  return {
    range: end > start ? { start, end } : null,
    touched: true,
  }
}

/** One painted run of characters and the mark that won it. */
export type Segment<M> = SpanRange & { mark: M }

const SEVERITY_RANK: Record<QualitySeverity, number> = {
  high: 3,
  medium: 2,
  low: 1,
}

/**
 * Which mark paints a character two marks share: the chosen one, then an
 * unedited one over an edited one, then the more severe. Washes never stack.
 */
export function markRank(severity: QualitySeverity, tone: MarkTone): number {
  const rank = SEVERITY_RANK[severity] ?? 1
  if (tone === 'chosen') return 100 + rank
  if (tone === 'pale') return 10 + rank
  return rank
}

/**
 * Overlapping ranges cut into runs that each belong to one mark, the
 * highest-ranked one covering them. Adjacent runs of the same mark merge.
 */
export function paintSegments<M>(
  marks: (SpanRange & { mark: M; rank: number })[],
): Segment<M>[] {
  const edges = [...new Set(marks.flatMap((m) => [m.start, m.end]))].sort(
    (a, b) => a - b,
  )
  const out: Segment<M>[] = []
  for (let i = 0; i < edges.length - 1; i++) {
    const start = edges[i]
    const end = edges[i + 1]
    let top: (typeof marks)[number] | null = null
    for (const m of marks) {
      if (m.start <= start && m.end >= end && (!top || m.rank > top.rank)) {
        top = m
      }
    }
    if (!top) continue
    const last = out[out.length - 1]
    if (last && last.end === start && last.mark === top.mark) last.end = end
    else out.push({ start, end, mark: top.mark })
  }
  return out
}

/** The class names `index.css` paints a mark with. */
export function markClass(severity: QualitySeverity, tone: MarkTone): string {
  const sev = severity in SEVERITY_RANK ? severity : 'low'
  return `quality-mark quality-mark--${sev} quality-mark--${tone}`
}
