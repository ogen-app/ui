import { describe, expect, it } from 'vitest'
import {
  findSpan,
  isWholePost,
  mapRangeThroughEdit,
  markRank,
  paintSegments,
} from './qualityHighlights'

describe('findSpan', () => {
  const body = 'Ukraine’s beekeepers kept 90% of their hives through the war.'

  it('finds an exact quote', () => {
    expect(findSpan(body, 'kept 90% of their hives')).toEqual({
      start: 21,
      end: 44,
    })
  })

  it('ignores case, whitespace runs and typographic quotes', () => {
    const range = findSpan(body, "ukraine's   BEEKEEPERS")!
    expect(body.slice(range.start, range.end)).toBe('Ukraine’s beekeepers')
  })

  it('reads through the Markdown markers the editor renders away', () => {
    const range = findSpan('A **bold** claim', 'a bold claim')!
    expect(range).toEqual({ start: 0, end: 16 })
    expect(findSpan('Plain words here', '**words**')).toEqual({
      start: 6,
      end: 11,
    })
  })

  it('drops the quotation marks and ellipsis a quote is wrapped in', () => {
    const range = findSpan(body, '“kept 90% of their…')!
    expect(body.slice(range.start, range.end)).toBe('kept 90% of their')
  })

  it('marks the first of several matches', () => {
    expect(findSpan('bee, bee, bee', 'bee')).toEqual({ start: 0, end: 3 })
  })

  it('says nothing when the quote is gone or empty', () => {
    expect(findSpan(body, 'kept most of')).toBeNull()
    expect(findSpan(body, '   ')).toBeNull()
  })
})

describe('isWholePost', () => {
  const blocks = [
    { start: 0, end: 40 },
    { start: 41, end: 80 },
    { start: 81, end: 100 },
  ]

  it('is the whole post past half of the visible text', () => {
    expect(isWholePost({ start: 0, end: 60 }, blocks)).toBe(true)
    expect(isWholePost({ start: 0, end: 40 }, blocks)).toBe(false)
  })

  it('is the whole post when it touches every paragraph', () => {
    expect(isWholePost({ start: 39, end: 82 }, blocks)).toBe(true)
  })

  it('a phrase in a one-paragraph post is a place, not the post', () => {
    expect(isWholePost({ start: 0, end: 10 }, [{ start: 0, end: 30 }])).toBe(
      false,
    )
  })
})

describe('mapRangeThroughEdit', () => {
  const title = '[ai playground] The Smallest Republics'
  const tag = { start: 0, end: 15 }
  const smallest = { start: 20, end: 28 }

  it('shifts a range when text changes before it', () => {
    expect(
      mapRangeThroughEdit(title, title.replace('The', 'Our own'), smallest),
    ).toEqual({ range: { start: 24, end: 32 }, touched: false })
  })

  it('leaves a range alone when text changes after it', () => {
    expect(mapRangeThroughEdit(title, title + '!', tag)).toEqual({
      range: tag,
      touched: false,
    })
  })

  it('treats typing at either edge as outside the span', () => {
    expect(mapRangeThroughEdit(title, 'X' + title, tag).touched).toBe(false)
    expect(
      mapRangeThroughEdit(title, title.replace('] ', ']! '), tag).touched,
    ).toBe(false)
  })

  it('marks a range edited when typing reaches into it', () => {
    const next = title.replace('playground', 'sandbox')
    const { range, touched } = mapRangeThroughEdit(title, next, tag)
    expect(touched).toBe(true)
    expect(next.slice(range!.start, range!.end)).toBe('[ai sandbox]')
  })

  it('drops a range the edit removed entirely', () => {
    expect(mapRangeThroughEdit(title, 'The Smallest Republics', tag)).toEqual({
      range: null,
      touched: true,
    })
  })
})

describe('paintSegments', () => {
  it('gives shared characters to the more severe mark', () => {
    const segments = paintSegments([
      { start: 0, end: 10, mark: 'low', rank: markRank('low', 'pale') },
      { start: 5, end: 15, mark: 'high', rank: markRank('high', 'pale') },
    ])
    expect(segments).toEqual([
      { start: 0, end: 5, mark: 'low' },
      { start: 5, end: 15, mark: 'high' },
    ])
  })

  it('lets the chosen mark win over any severity', () => {
    const segments = paintSegments([
      { start: 0, end: 10, mark: 'low', rank: markRank('low', 'chosen') },
      { start: 5, end: 15, mark: 'high', rank: markRank('high', 'pale') },
    ])
    expect(segments).toEqual([
      { start: 0, end: 10, mark: 'low' },
      { start: 10, end: 15, mark: 'high' },
    ])
  })

  it('paints an unedited mark over an edited one', () => {
    expect(markRank('low', 'pale')).toBeGreaterThan(markRank('high', 'edited'))
  })
})
