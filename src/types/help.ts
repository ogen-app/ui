/**
 * The help-centre payload, exactly as the CMS projects it (CON-173).
 *
 * These shapes are the contract with `getogen.com`'s Sanity schema, not an
 * internal convenience: the fixtures in `services/help` imitate them so that
 * swapping the real client in later changes one module and nothing else.
 *
 * Two projections are load-bearing and worth stating here rather than leaving
 * to the query:
 *
 * - A cross-link resolves to the target's **`key`**, never its id or slug. An
 *   article's identity is language-independent; only its slug and prose are
 *   translated. That is what lets a Spanish reader follow a link written in
 *   English and land on the Spanish article.
 * - `related` is likewise a list of keys, for the same reason.
 */

/** A Portable Text node. Loosely typed — the renderer narrows by `_type`. */
export type HelpBlock = {
  _type: string
  _key?: string
  [field: string]: unknown
}

/** One article, in one language. */
export type HelpArticle = {
  /** Identity across languages. What `#help/<key>` and topics address. */
  key: string
  title: string
  summary: string
  category: { key: string; title: string }
  body: HelpBlock[]
  /** Keys, not documents — resolved in the reader's language on arrival. */
  related: string[]
  topics: string[]
}

/**
 * Which article answers a given contextual topic.
 *
 * Fetched once and kept, because every `<HelpTrigger>` in the app consults it
 * to decide whether it should render at all — a trigger with nothing behind it
 * is worse than no trigger.
 */
export type HelpTopicMap = Record<string, string>
