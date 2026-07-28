/**
 * Turning the editor's Markdown into the plain text a social platform will
 * actually show.
 *
 * The post editor stores Markdown (`blocksToMarkdownLossy`), but none of the
 * networks we publish to render it — LinkedIn, Facebook and Instagram captions
 * are all plain text with newlines. `content` stays Markdown all the way to the
 * API, which flattens it at the publish boundary (`submit_post_to_zernio.go`,
 * CON-126); the author's source is never rewritten.
 *
 * This is the front-end half of that: it produces the same text for the preview
 * card and for the character count, so the user is shown and measured against
 * what actually publishes. Per the `src/lib/*` rule, the Go implementation is
 * the source of truth — if its rules move, these follow.
 */

/** Where each network folds a caption behind "see more", and its hard cap. */
export type PlatformTextLimits = {
  /** Characters shown before the fold. Approximate — the real fold is also
   *  line-based and differs between mobile and desktop. */
  fold: number
  /** Hard limit the network rejects past. */
  max: number
}

// Observed platform behaviour, not API-documented values. Worth re-checking
// when a network redesigns its feed.
export const PLATFORM_TEXT_LIMITS: Record<string, PlatformTextLimits> = {
  linkedin: { fold: 210, max: 3000 },
  facebook: { fold: 477, max: 63206 },
  instagram: { fold: 125, max: 2200 },
  threads: { fold: 500, max: 500 },
  twitter: { fold: 280, max: 280 },
  youtube: { fold: 157, max: 5000 },
}

/**
 * Markdown → the plain text the network will display.
 *
 * Deliberately lossy in the same way the platforms are: emphasis markers go
 * away, structure collapses to newlines. List markers become bullets because
 * that is what a user typing a list expects to see published — the alternative
 * (dropping them) makes the preview look wrong for the most common case.
 */
export function markdownToSocialText(markdown: string): string {
  if (!markdown) return ''

  const lines = markdown.replace(/\r\n/g, '\n').split('\n')
  const out: string[] = []
  let inFence = false

  for (const raw of lines) {
    let line = raw

    // Fenced code: keep the contents, drop the fences. Nothing inside is
    // Markdown, so it passes through untouched.
    if (/^\s*(```|~~~)/.test(line)) {
      inFence = !inFence
      continue
    }
    if (inFence) {
      out.push(line)
      continue
    }

    // Thematic breaks have no plain-text equivalent worth showing.
    if (/^\s*([-*_])(\s*\1){2,}\s*$/.test(line)) continue

    line = line.replace(/^\s{0,3}#{1,6}\s+/, '') // heading
    line = line.replace(/^\s*>\s?/, '') // blockquote
    line = line.replace(/^(\s*)[-*+]\s+/, '$1• ') // bullet list
    line = line.replace(/^(\s*)(\d+)[.)]\s+/, '$1$2. ') // ordered list

    out.push(inlineToText(line))
  }

  return (
    out
      .join('\n')
      // Blank runs collapse to one empty line: Markdown needs the double
      // newline between blocks, a feed post does not.
      .replace(/\n{3,}/g, '\n\n')
      .trim()
  )
}

// Escaped punctuation is masked before any other rule runs, so that `\*` can
// never be read as emphasis, and restored at the very end. Doing it the other
// way round eats the backslash's character along with the marker.
const MASK = '\u0000'
const ESCAPED = /\\([!-/:-@[-`{-~])/g
const MASKED = new RegExp(`${MASK}(\\d+)${MASK}`, 'g')

/** Inline Markdown within a single line. */
function inlineToText(input: string): string {
  let s = input.replace(ESCAPED, (_m, ch: string) => `${MASK}${ch.charCodeAt(0)}${MASK}`)

  // Images: the alt text is all a caption can carry.
  s = s.replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')

  // Links: keep the URL — it stays clickable once published and it counts
  // toward the character limit, so hiding it would understate the length.
  s = s.replace(/\[([^\]]*)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g, (_m, text: string, url: string) =>
    !text || text === url ? url : `${text} (${url})`,
  )
  s = s.replace(/<((?:https?|mailto):[^>]+)>/g, '$1') // autolink

  s = s.replace(/`([^`]+)`/g, '$1') // inline code
  s = s.replace(/(\*\*\*|___)(.+?)\1/g, '$2') // bold italic
  s = s.replace(/(\*\*|__)(.+?)\1/g, '$2') // bold
  s = s.replace(/(?<![*\w])\*(?!\s)([^*]+?)(?<!\s)\*(?!\*)/g, '$1') // italic *
  s = s.replace(/(?<![_\w])_(?!\s)([^_]+?)(?<!\s)_(?!\w)/g, '$1') // italic _
  s = s.replace(/~~(.+?)~~/g, '$1') // strikethrough

  return s.replace(MASKED, (_m, code: string) => String.fromCharCode(Number(code)))
}

/** Splits text at the fold so a preview can render its own "see more". */
export function foldText(
  text: string,
  fold: number,
): { head: string; rest: string } {
  if (text.length <= fold) return { head: text, rest: '' }

  // Break on a space so the fold never cuts a word in half. Only look back a
  // little — a long unbroken string (a URL) should just be cut.
  const window = text.slice(0, fold)
  const space = window.lastIndexOf(' ')
  const at = space > fold - 20 ? space : fold

  return { head: text.slice(0, at).trimEnd(), rest: text.slice(at).trimStart() }
}
