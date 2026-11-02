/**
 * The one marked phrase in a quality `verdict` or `advice` (CON-443).
 *
 * The model is asked to wrap the phrase a reader must not miss in `**…**`, once
 * per string. This reads exactly that and nothing more: it is not a markdown
 * renderer, and a string that doesn't hold one clean pair is shown as plain
 * text with every asterisk removed — the backend is meant to strip a bad mark
 * before storing it, and this is the same rule applied again at the edge, so a
 * slip in either place never shows the reader a stray `**`.
 *
 * Pure and tested; `EmphasisText` draws it.
 */

export type EmphasisPart = { text: string; strong: boolean }

const MARK = '**'

/** The text with any markers taken out — what an unmarked render shows. */
export function stripEmphasis(text: string): string {
  return text.replace(/\*/g, '')
}

/**
 * The text as plain and strong runs. One pair around a non-empty phrase, with
 * no other asterisk anywhere, splits into up to three parts; anything else
 * comes back as a single plain part.
 */
export function emphasisParts(text: string): EmphasisPart[] {
  const open = text.indexOf(MARK)
  const close = open === -1 ? -1 : text.indexOf(MARK, open + MARK.length)
  if (close !== -1) {
    const before = text.slice(0, open)
    const phrase = text.slice(open + MARK.length, close)
    const after = text.slice(close + MARK.length)
    const clean = !`${before}${phrase}${after}`.includes('*')
    if (clean && phrase.trim()) {
      return [
        { text: before, strong: false },
        { text: phrase, strong: true },
        { text: after, strong: false },
      ].filter((part) => part.text !== '')
    }
  }
  return [{ text: stripEmphasis(text), strong: false }]
}
