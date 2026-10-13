/**
 * A search snippet from the Assets query, as plain text runs.
 *
 * The server HTML-escapes the passage and wraps each matched word in
 * `<mark>…</mark>`, which is the only markup it contains. Splitting on that
 * tag and unescaping the rest gives text a component can render as text —
 * never `dangerouslySetInnerHTML`, because the passage is a document's own
 * words and a document can say anything.
 */
export type SnippetPart = { text: string; marked: boolean }

const ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
}

function unescape(text: string): string {
  return text.replace(
    /&(#x[0-9a-f]+|#\d+|[a-z]+);/gi,
    (whole, code: string) => {
      if (code[0] === '#') {
        const n =
          code[1] === 'x' || code[1] === 'X'
            ? parseInt(code.slice(2), 16)
            : parseInt(code.slice(1), 10)
        return Number.isFinite(n) ? String.fromCodePoint(n) : whole
      }
      return ENTITIES[code.toLowerCase()] ?? whole
    },
  )
}

export function snippetParts(snippet: string): SnippetPart[] {
  const parts: SnippetPart[] = []
  const pattern = /<mark>([\s\S]*?)<\/mark>/g
  let last = 0
  for (const match of snippet.matchAll(pattern)) {
    const at = match.index ?? 0
    if (at > last)
      parts.push({ text: unescape(snippet.slice(last, at)), marked: false })
    parts.push({ text: unescape(match[1]), marked: true })
    last = at + match[0].length
  }
  if (last < snippet.length)
    parts.push({ text: unescape(snippet.slice(last)), marked: false })
  return parts
}
