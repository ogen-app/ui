import { describe, expect, it } from 'vitest'
import { newIdea, type Idea } from './ideas'
import { citedPlace, ideaParts, isAnalysed } from './ideaSource'

const base = newIdea({
  id: 'i1',
  title: 'Wax does not forget',
  note: '',
  campaignId: null,
  at: new Date('2026-10-01T00:00:00Z'),
})

const analysed = (over: Partial<Idea> = {}): Idea => ({
  ...base,
  origin: 'asset_analysis',
  ...over,
})

describe('ideaParts', () => {
  it('has none for a written idea, whose note is just a note', () => {
    expect(ideaParts({ ...base, origin: 'manual', note: 'a\n\nb' })).toBeNull()
    expect(isAnalysed(base)).toBe(false)
  })

  it("takes the server's split where it made one", () => {
    expect(
      ideaParts(
        analysed({
          note: 'ignored\n\nSources: p. 9',
          angle: 'The hook',
          rationale: 'Why',
          sources: ['p. 6', 'p. 5'],
        }),
      ),
    ).toEqual({ angle: 'The hook', rationale: 'Why', sources: ['pp. 5–6'] })
  })

  it('reads an older idea back out of its note', () => {
    expect(
      ideaParts(analysed({ note: 'The hook\n\nWhy it fits\n\nSources: p. 4' })),
    ).toEqual({
      angle: 'The hook',
      rationale: 'Why it fits',
      sources: ['p. 4'],
    })
  })
})

describe('citedPlace', () => {
  it('names a web page by its domain', () => {
    expect(
      citedPlace(
        analysed({
          sources: ['§2'],
          sourceAsset: {
            id: 'a',
            title: 'A page',
            kind: 'web',
            pageCount: null,
            durationMs: null,
            domain: 'example.org',
            reading: null,
          },
        }),
      ),
    ).toEqual({ places: ['example.org'], more: 0 })
  })

  it('names two places and counts the rest', () => {
    expect(
      citedPlace(analysed({ sources: ['p. 1', 'p. 4', 'Slide 2', '12:03'] })),
    ).toEqual({ places: ['p. 1', 'p. 4'], more: 2 })
  })
})
