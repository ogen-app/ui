import type { HelpArticle, HelpIndexRow } from '@/types/help'

/**
 * The help centre's read of Sanity (CON-173) — GROQ over a plain `fetch`.
 *
 * Deliberately not `@sanity/client`: a read is one GET with the query in the
 * URL, and hand-rolling it keeps the rule that matters visible on the page —
 * **`credentials: 'omit'`**. Everything in `services/api/` sends the session
 * cookie, and Sanity is a third party.
 *
 * The queries mirror `getogen.com/studio/schemaTypes/helpArticle.ts`; the
 * schema is the source of truth and these are a typed copy of its shape, not
 * a shared package — two queries do not justify a cross-repo release.
 *
 * Only reached when `VITE_SANITY_PROJECT_ID` is set. Without it the service
 * serves fixtures, which is every environment today: the public `production`
 * dataset has no help articles in it yet.
 */

const API_VERSION = 'v2025-02-19'

export const sanityConfig = () => {
  const projectId = import.meta.env.VITE_SANITY_PROJECT_ID
  if (!projectId) return null
  return {
    projectId,
    dataset: import.meta.env.VITE_SANITY_DATASET || 'production',
  }
}

/** Published, meant for the app, and English unless it says otherwise. */
const FOR_APP = `_type == "helpArticle" && (!defined(surfaces) || "app" in surfaces)`
const LANG = `coalesce(language, "en")`

/**
 * The reader's language if this article has it, English otherwise — per
 * article, because a half-translated help centre is the normal steady state.
 */
const localised = (type: string, keyExpr: string, extra = '') =>
  `*[_type == "${type}" && key == ${keyExpr} && ${LANG} in [$lang, "en"]${extra}]` +
  ` | order(select(${LANG} == $lang => 0, 1) asc)[0]`

/** A cross-link carries its target's key, never a document id. */
const MARKS = `_type == "block" => { markDefs[]{ ..., _type == "articleLink" => { "target": article->key } } }`

/** One level of body: blocks and callouts, with their links projected. */
const FLAT_BODY = `..., ${MARKS}, _type == "helpCallout" => { body[]{ ..., ${MARKS} } }`

/**
 * The body, with each `helpEmbed` replaced by the concept it points at — in
 * the reader's language, one level deep. A concept embedded inside a concept
 * arrives without its `article` and renders as nothing.
 */
const BODY = `body[]{
  ${FLAT_BODY},
  _type == "helpEmbed" => {
    "article": ${localised('helpArticle', '^.article->key', ` && ${FOR_APP}`)}{
      key, title, summary, "body": body[]{ ${FLAT_BODY} }
    }
  }
}`

const ARTICLE_QUERY = `${localised('helpArticle', '$key', ` && ${FOR_APP}`)}{
  key,
  kind,
  title,
  summary,
  "language": ${LANG},
  "category": ${localised('helpCategory', '^.category->key')}{ key, title },
  "related": coalesce(related[]->key, []),
  "topics": coalesce(topics, []),
  "pages": coalesce(pages, []),
  ${BODY}
}`

/**
 * What claims which topic and which screen. Read off the English documents:
 * identity is language-independent, and English is the one language every
 * article is guaranteed to have.
 */
const INDEX_QUERY = `*[${FOR_APP} && ${LANG} == "en"]{
  key, kind, "topics": coalesce(topics, []), "pages": coalesce(pages, [])
}`

async function query<T>(groq: string, params: Record<string, string>) {
  const config = sanityConfig()
  if (!config) throw new Error('help: VITE_SANITY_PROJECT_ID is not set')
  const url = new URL(
    `https://${config.projectId}.apicdn.sanity.io/${API_VERSION}/data/query/${config.dataset}`,
  )
  url.searchParams.set('query', groq)
  url.searchParams.set('perspective', 'published')
  // GROQ parameters travel as JSON values, `$name=<json>`.
  for (const [name, value] of Object.entries(params))
    url.searchParams.set(`$${name}`, JSON.stringify(value))
  // The one bare `fetch` outside `services/api`, on purpose: this is a third
  // party, so it must carry neither the session cookie nor `X-Workspace-Id`
  // — exactly what `scopedFetch` would add.
  // eslint-disable-next-line no-restricted-globals
  const res = await fetch(url, { credentials: 'omit' })
  if (!res.ok) throw new Error(`help: Sanity answered ${res.status}`)
  return ((await res.json()) as { result: T }).result
}

export const queryHelpArticle = (key: string, lang: string) =>
  query<HelpArticle | null>(ARTICLE_QUERY, { key, lang })

export const queryHelpIndex = () => query<HelpIndexRow[]>(INDEX_QUERY, {})
