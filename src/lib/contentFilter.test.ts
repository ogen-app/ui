import { describe, expect, it } from 'vitest'
import {
  EMPTY_FILTER,
  draftName,
  filterAssets,
  filterChips,
  isFilterActive,
  parseModifier,
  statusVocabulary,
  suggest,
  tagVocabulary,
  vocabulary,
  withClause,
  withoutClause,
  type Clause,
  type ContentFilter,
  type FilterFacet,
} from './contentFilter'
import type { Asset, AssetStatus, Tag } from '@/types/content'

const tag = (id: string, name: string): Tag => ({ id, name, color: '#000' })

const asset = (
  title: string,
  status: AssetStatus = 'ready',
  tags: Tag[] = [],
): Asset =>
  ({
    id: title,
    title,
    status,
    tags,
  }) as unknown as Asset

const brand = tag('t1', 'Brand voice')
const legal = tag('t2', 'Legal')

const library = [
  asset('Pricing FAQ for the sales team', 'ready', [legal]),
  asset('Words we don’t use', 'ready', [brand]),
  asset('Market sizing working document', 'processing', []),
  asset('LinkedIn post archive', 'failed', [brand, legal]),
]

const is = (facet: FilterFacet, id: string): Clause => ({
  facet,
  id,
  negated: false,
})
const not = (facet: FilterFacet, id: string): Clause => ({
  facet,
  id,
  negated: true,
})

const filter = (clauses: Clause[], name = ''): ContentFilter => ({
  name,
  clauses,
})
const titles = (assets: Asset[]) => assets.map((a) => a.title)

describe('filterAssets', () => {
  it('keeps everything when nothing is asked for', () => {
    expect(filterAssets(library, EMPTY_FILTER)).toHaveLength(4)
  })

  it('matches a name anywhere in the title, ignoring case', () => {
    expect(titles(filterAssets(library, filter([], 'SALES')))).toEqual([
      'Pricing FAQ for the sales team',
    ])
  })

  it('ignores a name that is only whitespace, rather than matching nothing', () => {
    expect(filterAssets(library, filter([], '   '))).toHaveLength(4)
  })

  it('treats two values of one facet as any-of', () => {
    expect(
      titles(
        filterAssets(
          library,
          filter([is('status', 'processing'), is('status', 'failed')]),
        ),
      ),
    ).toEqual(['Market sizing working document', 'LinkedIn post archive'])
  })

  it('treats two tags as any-of, not all-of', () => {
    expect(
      filterAssets(library, filter([is('tag', 't1'), is('tag', 't2')])),
    ).toHaveLength(3)
  })

  it('ands separate facets, and the name, together', () => {
    expect(
      titles(
        filterAssets(
          library,
          filter([is('status', 'ready'), is('tag', 't1')], 'e'),
        ),
      ),
    ).toEqual(['Words we don’t use'])
  })

  it('drops an untagged document as soon as any tag is wanted', () => {
    const found = filterAssets(library, filter([is('tag', 't1')]))
    expect(titles(found)).not.toContain('Market sizing working document')
  })
})

describe('filterAssets, negated', () => {
  it('excludes what it names', () => {
    expect(titles(filterAssets(library, filter([not('tag', 't2')])))).toEqual([
      'Words we don’t use',
      'Market sizing working document',
    ])
  })

  it('keeps an untagged document, which carries nothing to exclude', () => {
    const found = filterAssets(library, filter([not('tag', 't1')]))
    expect(titles(found)).toContain('Market sizing working document')
  })

  it('ands two exclusions rather than or-ing them', () => {
    // "not Brand voice or not Legal" would keep three of the four; neither-of
    // is the only reading anyone means.
    expect(
      titles(
        filterAssets(library, filter([not('tag', 't1'), not('tag', 't2')])),
      ),
    ).toEqual(['Market sizing working document'])
  })

  it('subtracts from what the wanted values allowed', () => {
    const found = filterAssets(
      library,
      filter([is('tag', 't1'), not('status', 'failed')]),
    )
    expect(titles(found)).toEqual(['Words we don’t use'])
  })

  it('can empty the list by excluding everything present', () => {
    const clauses = ['ready', 'processing', 'failed'].map((id) =>
      not('status', id),
    )
    expect(filterAssets(library, filter(clauses))).toEqual([])
  })
})

describe('isFilterActive', () => {
  it('is false for the empty filter, and for a name of spaces', () => {
    expect(isFilterActive(EMPTY_FILTER)).toBe(false)
    expect(isFilterActive(filter([], '  '))).toBe(false)
  })

  it('is true as soon as one clause stands, negated or not', () => {
    expect(isFilterActive(filter([is('status', 'ready')]))).toBe(true)
    expect(isFilterActive(filter([not('tag', 't1')]))).toBe(true)
  })
})

describe('parseModifier', () => {
  it('reads a keyword and the value being typed after it', () => {
    expect(parseModifier('status:re')).toEqual({
      facet: 'status',
      query: 're',
      negated: false,
    })
    expect(parseModifier('tag:')).toEqual({
      facet: 'tag',
      query: '',
      negated: false,
    })
  })

  it('takes the plural and any casing, because both get typed', () => {
    expect(parseModifier('Tags: brand')).toEqual({
      facet: 'tag',
      query: 'brand',
      negated: false,
    })
  })

  it('reads a leading minus as an exclusion', () => {
    expect(parseModifier('-tag:legal')).toEqual({
      facet: 'tag',
      query: 'legal',
      negated: true,
    })
  })

  it('leaves prose alone, colon or minus or not', () => {
    expect(parseModifier('pricing')).toBeNull()
    expect(parseModifier('Q3: the plan')).toBeNull()
    expect(parseModifier('-pricing')).toBeNull()
  })

  it('empties the name clause only while a modifier is being typed', () => {
    expect(draftName('-status:re')).toBe('')
    expect(draftName('-pricing')).toBe('-pricing')
  })
})

describe('withClause / withoutClause', () => {
  it('adds in the order values were reached', () => {
    const two = withClause(
      withClause(EMPTY_FILTER, 'tag', 't2', false),
      'status',
      'ready',
      false,
    )
    expect(two.clauses).toEqual([is('tag', 't2'), is('status', 'ready')])
  })

  it('adds nothing twice, and returns the same filter when nothing changes', () => {
    const one = withClause(EMPTY_FILTER, 'status', 'ready', false)
    expect(withClause(one, 'status', 'ready', false)).toBe(one)
  })

  it('flips a value in place rather than standing it beside itself', () => {
    const one = withClause(EMPTY_FILTER, 'tag', 't1', false)
    expect(withClause(one, 'tag', 't1', true).clauses).toEqual([
      not('tag', 't1'),
    ])
  })

  it('removes only the value named', () => {
    const two = filter([is('status', 'ready'), not('status', 'failed')])
    expect(withoutClause(two, 'status', 'ready').clauses).toEqual([
      not('status', 'failed'),
    ])
  })
})

describe('filterChips', () => {
  it('gives one chip per clause, in order, labelled as it is shown', () => {
    const chips = filterChips(
      filter([is('status', 'ready'), not('tag', 't1')]),
      vocabulary(library),
    )
    expect(chips).toEqual([
      {
        facet: 'status',
        id: 'ready',
        negated: false,
        keyword: 'status',
        label: 'Ready',
      },
      {
        facet: 'tag',
        id: 't1',
        negated: true,
        keyword: 'tag',
        label: 'Brand voice',
      },
    ])
  })
})

describe('statusVocabulary', () => {
  it('offers only the statuses present, in life-cycle order', () => {
    expect(statusVocabulary(library).map((v) => v.id)).toEqual([
      'processing',
      'ready',
      'failed',
    ])
  })

  it('leaves a scope where everything has been read nothing to filter by', () => {
    const allReady = [asset('One'), asset('Two')]
    expect(statusVocabulary(allReady).map((v) => v.id)).toEqual(['ready'])
  })
})

describe('tagVocabulary', () => {
  it('offers each tag once, by name, from the documents in scope', () => {
    expect(tagVocabulary(library)).toEqual([
      { id: 't1', name: 'Brand voice' },
      { id: 't2', name: 'Legal' },
    ])
  })

  it('is empty when nothing here is tagged', () => {
    expect(tagVocabulary([asset('Untitled')])).toEqual([])
  })
})

describe('suggest', () => {
  const vocab = vocabulary(library)

  it('offers the modifiers themselves when nothing is typed', () => {
    expect(suggest('', EMPTY_FILTER, vocab).map((s) => s.keyword)).toEqual([
      'status',
      'status',
      'tag',
      'tag',
    ])
  })

  it('follows every offer with its opposite, in that order', () => {
    expect(suggest('', EMPTY_FILTER, vocab).map((s) => s.negated)).toEqual([
      false,
      true,
      false,
      true,
    ])
  })

  it("offers a begun modifier's remaining values", () => {
    expect(suggest('status:re', EMPTY_FILTER, vocab)).toEqual([
      {
        kind: 'value',
        facet: 'status',
        keyword: 'status',
        negated: false,
        id: 'ready',
        label: 'Ready',
      },
      {
        kind: 'value',
        facet: 'status',
        keyword: 'status',
        negated: true,
        id: 'ready',
        label: 'Ready',
      },
    ])
  })

  // The pair is how exclusion is found; a typed minus means it has been.
  it('drops the including half once the minus is typed', () => {
    expect(suggest('-tag:legal', EMPTY_FILTER, vocab)).toEqual([
      {
        kind: 'value',
        facet: 'tag',
        keyword: 'tag',
        negated: true,
        id: 't2',
        label: 'Legal',
      },
    ])
  })

  it('offers the modifiers in excluding form after a lone minus', () => {
    expect(suggest('-', EMPTY_FILTER, vocab).every((s) => s.negated)).toBe(true)
  })

  it('never offers a value already claimed, whichever way it was claimed', () => {
    const found = suggest('tag:', filter([not('tag', 't1')]), vocab)
    expect(found.map((s) => (s.kind === 'value' ? s.id : s.kind))).toEqual([
      't2',
      't2',
    ])
  })

  it('stops offering a modifier with nothing left to give', () => {
    const spent = filter([is('tag', 't1'), not('tag', 't2')])
    expect(suggest('', spent, vocab).map((s) => s.keyword)).toEqual([
      'status',
      'status',
    ])
  })

  it('reads prose as the start of a modifier', () => {
    expect(suggest('sta', EMPTY_FILTER, vocab)[0]).toMatchObject({
      kind: 'facet',
      keyword: 'status',
    })
  })

  it('also offers a value that prose names outright, keyword unknown', () => {
    expect(suggest('brand', EMPTY_FILTER, vocab)).toEqual([
      {
        kind: 'value',
        facet: 'tag',
        keyword: 'tag',
        negated: false,
        id: 't1',
        label: 'Brand voice',
      },
      {
        kind: 'value',
        facet: 'tag',
        keyword: 'tag',
        negated: true,
        id: 't1',
        label: 'Brand voice',
      },
    ])
  })

  // Six values, twelve rows: a cap that could cut between an offer and its
  // opposite would leave a row whose sibling is one scroll away.
  it('caps prose at six values and keeps every pair whole', () => {
    const found = suggest('e', EMPTY_FILTER, vocab).filter(
      (s) => s.kind === 'value',
    )
    expect(found.length % 2).toBe(0)
    expect(found.length).toBeLessThanOrEqual(12)
  })
})
