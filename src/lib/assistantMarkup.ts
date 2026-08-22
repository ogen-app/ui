/**
 * The tiny subset of markup assistant replies are rendered with. Deliberately
 * not a markdown library: replies are prose with the occasional list, and a
 * parser we own can stay stable mid-stream (a half-written `**bold**` must not
 * flicker the whole block).
 */

export type InlineSpan = {
  text: string
  bold: boolean
}

export type AssistantBlock =
  | { kind: 'paragraph'; spans: InlineSpan[] }
  | { kind: 'list'; ordered: boolean; items: InlineSpan[][] }

const ORDERED_ITEM = /^\d+[.)]\s+/
const UNORDERED_ITEM = /^[-*•]\s+/
// Split on the delimiter itself so the captured groups land on odd indices.
const BOLD = /\*\*(.+?)\*\*/g

/**
 * Splits `**bold**` runs out of a line. An unterminated `**` stays literal,
 * which is what a streaming reply looks like halfway through emphasis.
 */
function parseInline(text: string): InlineSpan[] {
  const spans: InlineSpan[] = []
  let last = 0
  for (const match of text.matchAll(BOLD)) {
    const start = match.index
    if (start > last) spans.push({ text: text.slice(last, start), bold: false })
    spans.push({ text: match[1], bold: true })
    last = start + match[0].length
  }
  if (last < text.length) spans.push({ text: text.slice(last), bold: false })
  return spans
}

/**
 * Groups a reply into paragraphs and lists. Blocks are separated by a blank
 * line; a block whose every line starts with a list marker becomes a list, so
 * a paragraph that merely mentions "1. " mid-sentence stays a paragraph.
 */
export function parseAssistantMarkup(content: string): AssistantBlock[] {
  return content
    .split(/\n\s*\n/)
    .map((block) => block.split('\n').filter((line) => line.trim() !== ''))
    .filter((lines) => lines.length > 0)
    .map((lines) => {
      const marker = lines.every((line) => ORDERED_ITEM.test(line.trim()))
        ? ORDERED_ITEM
        : lines.every((line) => UNORDERED_ITEM.test(line.trim()))
          ? UNORDERED_ITEM
          : null

      if (marker) {
        return {
          kind: 'list' as const,
          ordered: marker === ORDERED_ITEM,
          items: lines.map((line) => parseInline(line.trim().replace(marker, ''))),
        }
      }

      // Soft line breaks inside a paragraph read as one flowing sentence.
      return { kind: 'paragraph' as const, spans: parseInline(lines.join(' ')) }
    })
}
