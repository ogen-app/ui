import { describe, expect, it } from 'vitest'
import { HELP_FIXTURES } from '@/services/help/fixtures'
import { buildHelpIndex } from '@/services/help'
import { HELP_PAGES, HELP_TOPICS, helpPageOf } from '@/lib/helpTopics'
import type { HelpBlock, HelpEmbeddedArticle } from '@/types/help'

/**
 * The fixtures stand in for the CMS, so they are held to what the Studio would
 * enforce: a reference cannot point at nothing, and an embed can only point at
 * a concept. A broken fixture would otherwise hide in the drawer as a link that
 * goes nowhere — exactly the rot references were chosen to prevent.
 */

const articles = Object.values(HELP_FIXTURES)

/** Every block, callout bodies included, but not inside embeds. */
const blocksOf = (body: HelpBlock[]): HelpBlock[] =>
  body.flatMap((block) =>
    block._type === 'helpCallout'
      ? [block, ...blocksOf(block.body as HelpBlock[])]
      : [block],
  )

const linkTargets = (body: HelpBlock[]) =>
  blocksOf(body).flatMap((block) =>
    ((block.markDefs as HelpBlock[] | undefined) ?? [])
      .filter((mark) => mark._type === 'articleLink')
      .map((mark) => mark.target as string),
  )

const embedsOf = (body: HelpBlock[]) =>
  body
    .filter((block) => block._type === 'helpEmbed')
    .map((block) => block.article as HelpEmbeddedArticle)

describe('help fixtures', () => {
  it('file every article under its own key', () => {
    for (const [key, article] of Object.entries(HELP_FIXTURES))
      expect(article.key).toBe(key)
  })

  it('link only to articles that exist', () => {
    for (const article of articles) {
      for (const target of [...linkTargets(article.body), ...article.related])
        expect(HELP_FIXTURES, `${article.key} → ${target}`).toHaveProperty(
          target,
        )
    }
  })

  it('claim only topics and screens the app can ask for', () => {
    for (const article of articles) {
      for (const topic of article.topics) expect(HELP_TOPICS).toContain(topic)
      for (const page of article.pages) expect(HELP_PAGES).toContain(page)
    }
  })

  it('give a screen only to a page article, and every page article one', () => {
    for (const article of articles) {
      if (article.kind === 'page')
        expect(article.pages.length).toBeGreaterThan(0)
      else expect(article.pages).toEqual([])
    }
  })

  it('embed concepts, resolved exactly as the concept reads on its own', () => {
    for (const article of articles) {
      for (const embedded of embedsOf(article.body)) {
        const concept = HELP_FIXTURES[embedded.key]
        expect(concept.kind).toBe('concept')
        expect(embedded).toEqual({
          key: concept.key,
          title: concept.title,
          summary: concept.summary,
          body: concept.body,
        })
      }
    }
  })

  it('keep embeds one level deep', () => {
    // The query does not follow an embed inside an embedded concept, so a
    // concept that embeds would read differently in the drawer and the Studio.
    for (const article of articles.filter((a) => a.kind === 'concept'))
      expect(embedsOf(article.body)).toEqual([])
  })

  it('write a shared concept once and show it on several screens', () => {
    // The point of the model, held as a fact about the content we ship.
    const showing = articles.filter((a) =>
      embedsOf(a.body).some((e) => e.key === 'post-statuses'),
    )
    expect(showing.map((a) => a.pages).flat()).toEqual(
      expect.arrayContaining(['posts', 'calendar', 'post']),
    )
  })
})

describe('buildHelpIndex', () => {
  it('lets the first claim win, for topics and screens alike', () => {
    expect(
      buildHelpIndex([
        { key: 'a', kind: 'page', topics: ['post.status'], pages: ['posts'] },
        { key: 'b', kind: 'page', topics: ['post.status'], pages: ['posts'] },
      ]),
    ).toEqual({ topics: { 'post.status': 'a' }, pages: { posts: 'a' } })
  })

  it('never hands a screen to a concept', () => {
    expect(
      buildHelpIndex([
        { key: 'c', kind: 'concept', topics: [], pages: ['posts'] },
      ]).pages,
    ).toEqual({})
  })
})

describe('helpPageOf', () => {
  it('takes the deepest route that names a screen', () => {
    expect(
      helpPageOf([
        { staticData: { help: 'foundation' } },
        { staticData: {} },
        { staticData: { help: 'campaign.strategy' } },
        {},
      ]),
    ).toBe('campaign.strategy')
  })

  it('answers null where no route names one', () => {
    expect(helpPageOf([{}, { staticData: {} }])).toBeNull()
  })
})
