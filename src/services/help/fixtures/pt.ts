import type { HelpArticle, HelpBlock } from '@/types/help'

/**
 * A few lines of Portable Text shorthand for the fixtures.
 *
 * The output is the real payload — blocks, spans, `markDefs`, the three custom
 * nodes — so nothing downstream knows these were written by hand. The helpers
 * only exist so an article reads like an article in this file rather than like
 * forty lines of JSON per paragraph. They are fixture tooling, never imported
 * by the renderer.
 */

let seq = 0
/** `_key`s only need to be unique within their array; a counter is plenty. */
const key = () => `k${++seq}`

/** An inline piece: plain text, or one of the marks below. */
type Part =
  | string
  | { strong: string }
  | { text: string; article: string }
  | { text: string; path: string }

/** Bold. */
export const b = (text: string): Part => ({ strong: text })
/** A cross-link to another article, by key — it stays inside the drawer. */
export const see = (text: string, article: string): Part => ({ text, article })
/** A link into the app — the drawer stays open while the app moves. */
export const go = (text: string, path: string): Part => ({ text, path })

function inline(parts: Part[]) {
  const markDefs: HelpBlock[] = []
  const children = parts.map((part) => {
    if (typeof part === 'string')
      return { _type: 'span', _key: key(), text: part, marks: [] }
    if ('strong' in part)
      return {
        _type: 'span',
        _key: key(),
        text: part.strong,
        marks: ['strong'],
      }
    const def: HelpBlock =
      'article' in part
        ? { _key: key(), _type: 'articleLink', target: part.article }
        : { _key: key(), _type: 'appLink', path: part.path }
    markDefs.push(def)
    return { _type: 'span', _key: key(), text: part.text, marks: [def._key] }
  })
  return { children, markDefs }
}

const block = (style: string, parts: Part[], extra = {}): HelpBlock => ({
  _type: 'block',
  _key: key(),
  style,
  ...inline(parts),
  ...extra,
})

export const p = (...parts: Part[]) => block('normal', parts)
export const h2 = (text: string) => block('h2', [text])
export const h3 = (text: string) => block('h3', [text])

/** A bulleted list — one array of parts per item. */
export const bullets = (...items: Part[][]): HelpBlock[] =>
  items.map((parts) => block('normal', parts, { listItem: 'bullet', level: 1 }))

export const callout = (
  tone: 'note' | 'tip' | 'warning',
  ...paragraphs: Part[][]
): HelpBlock => ({
  _type: 'helpCallout',
  _key: key(),
  tone,
  body: paragraphs.map((parts) => p(...parts)),
})

/**
 * A concept, placed whole inside another article.
 *
 * Exactly what the GROQ projection returns for a `helpEmbed` block: the
 * referenced concept resolved in place, one level deep — so a concept embedded
 * in a page article is the same object the concept's own page shows.
 */
export const embed = (concept: HelpArticle): HelpBlock => ({
  _type: 'helpEmbed',
  _key: key(),
  article: {
    key: concept.key,
    title: concept.title,
    summary: concept.summary,
    body: concept.body,
  },
})
