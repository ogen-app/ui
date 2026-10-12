import type { AssetChunk } from '@/types/content'

/**
 * A document's outline, read from its chunks (CON-366) — what the asset
 * page's stage draws for a Word file or a deck, which have no picture of
 * their own (document-service renders no thumbnails).
 *
 * Two shapes, by what document-service wrote:
 *
 * - **Slides.** A deck's chunks are labelled "Slide 4" or "Slides 4-6", and
 *   their text opens each slide with a `Slide N` line, the slide's title on
 *   the line after. The outline is the slide titles, numbered.
 * - **Headings.** Prose is chunked under its heading path — the anchor's
 *   `heading_path`, or the label it is joined into ("Plan › Audience"). The
 *   outline is every heading in order, indented by depth.
 *
 * Anything else (an email, a plain text file with no headings) has no
 * outline: an empty list, and the stage keeps its format tile.
 */
export type OutlineItem = {
  text: string
  /** 0 for a top-level heading or a slide. */
  depth: number
  /** The slide's number, for a deck. */
  number?: number
}

export type DocumentOutline = {
  kind: 'slides' | 'headings'
  items: OutlineItem[]
}

const SLIDE_LABEL = /^Slides? \d+/
const SLIDE_LINE = /^Slide (\d+)$/

export function documentOutline(
  chunks: AssetChunk[],
  max = 8,
): DocumentOutline | null {
  const slides = chunks.filter(
    (c) =>
      c.source_anchor?.kind === 'slide' ||
      SLIDE_LABEL.test(c.source_label ?? ''),
  )
  if (slides.length > 0) {
    const items: OutlineItem[] = []
    const seen = new Set<number>()
    for (const chunk of slides) {
      const lines = chunk.content.split('\n').map((l) => l.trim())
      lines.forEach((line, i) => {
        const m = SLIDE_LINE.exec(line)
        if (!m || seen.has(Number(m[1]))) return
        const number = Number(m[1])
        seen.add(number)
        const title = lines.slice(i + 1).find((l) => l !== '') ?? ''
        items.push({
          text: SLIDE_LINE.test(title) ? '' : title,
          depth: 0,
          number,
        })
      })
    }
    return items.length > 0
      ? { kind: 'slides', items: items.slice(0, max) }
      : null
  }

  const items: OutlineItem[] = []
  const seen = new Set<string>()
  for (const chunk of chunks) {
    // An email's or a sheet's label is not a heading.
    const kind = chunk.source_anchor?.kind
    if (kind && kind !== 'section' && kind !== 'page') continue
    const path =
      chunk.source_anchor?.heading_path ??
      (chunk.source_label ? chunk.source_label.split(' › ') : [])
    path.forEach((heading, depth) => {
      const key = path.slice(0, depth + 1).join('\u0000')
      if (!heading.trim() || seen.has(key)) return
      seen.add(key)
      items.push({ text: heading.trim(), depth })
    })
    if (items.length >= max) break
  }
  return items.length > 0
    ? { kind: 'headings', items: items.slice(0, max) }
    : null
}
