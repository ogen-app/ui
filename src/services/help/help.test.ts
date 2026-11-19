import { describe, expect, it } from 'vitest'
import { buildHelpIndex } from '@/services/help'
import { helpPageOf } from '@/lib/helpTopics'

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
