/**
 * The help-centre payload, exactly as the CMS projects it (CON-173).
 *
 * These shapes are the contract with `getogen.com`'s Sanity schema
 * (`studio/schemaTypes/helpArticle.ts`), not an internal convenience: the
 * fixtures in `services/help` imitate them, and the GROQ in
 * `services/help/sanity.ts` produces them, so the renderer cannot tell the two
 * apart.
 *
 * Load-bearing projections, stated here rather than left to the query:
 *
 * - A cross-link resolves to the target's **`key`**, never its id or slug. An
 *   article's identity is language-independent; only its slug and prose are
 *   translated. That is what lets a Spanish reader follow a link written in
 *   English and land on the Spanish article.
 * - `related` is likewise a list of keys, for the same reason.
 * - A **`helpEmbed`** block arrives *resolved*: the concept it points at is
 *   projected into the block, in the reader's language, one level deep. That
 *   is what lets one paragraph about post statuses appear on the Posts page,
 *   the calendar and the post editor — and on the website — while being
 *   written once.
 */

/** A Portable Text node. Loosely typed — the renderer narrows by `_type`. */
export type HelpBlock = {
  _type: string
  _key?: string
  [field: string]: unknown
}

/**
 * What an article is for.
 *
 * - **`page`** explains one screen of the app — what it is, what you do there
 *   — and is what the header's help button opens. It claims its screens
 *   through `pages`.
 * - **`concept`** explains one idea that several screens share (post statuses,
 *   the two levels of the app). It is readable on its own, linked from
 *   anywhere, and *embedded* into page articles, which is how the same words
 *   appear in more than one place without being copied.
 */
export type HelpArticleKind = 'page' | 'concept'

/** A concept as it arrives inside a `helpEmbed` block. */
export type HelpEmbeddedArticle = {
  key: string
  title: string
  summary: string
  body: HelpBlock[]
}

/** One article, in one language. */
export type HelpArticle = {
  /** Identity across languages. What `#help/<key>` and topics address. */
  key: string
  kind: HelpArticleKind
  title: string
  summary: string
  /**
   * The language this copy is in. Differs from the reader's when the article
   * has no translation yet and the query fell back to English — which the
   * drawer says, rather than silently switching language mid-app.
   */
  language: string
  category: { key: string; title: string }
  body: HelpBlock[]
  /** Keys, not documents — resolved in the reader's language on arrival. */
  related: string[]
  /** Contextual `<HelpTrigger>` topics this article answers. */
  topics: string[]
  /** Screens this article explains (`kind: 'page'` only). */
  pages: string[]
}

/**
 * Which article answers each trigger and each screen.
 *
 * Fetched once and kept, because every `<HelpTrigger>` and every page header
 * consults it to decide whether to render a "?" at all — a trigger with nothing
 * behind it is worse than no trigger.
 */
export type HelpIndex = {
  topics: Record<string, string>
  pages: Record<string, string>
}

/** One row of the index read: just enough to build `HelpIndex`. */
export type HelpIndexRow = Pick<
  HelpArticle,
  'key' | 'kind' | 'topics' | 'pages'
>
