import { describe, expect, it } from 'vitest'
import { assetPlace, findPlace, passagePlace } from './assetPlace'

describe('assetPlace', () => {
  it('reads each kind of cited place', () => {
    expect(assetPlace('12:03–12:47')).toEqual({ kind: 'time', seconds: 723 })
    expect(assetPlace('Sheet "Pipeline" rows 10-24')).toEqual({
      kind: 'rows',
      label: 'Sheet "Pipeline" rows 10-24',
    })
    expect(assetPlace('pp. 5–6')).toEqual({ kind: 'page', page: 5 })
    expect(assetPlace('Slide 4')).toEqual({ kind: 'label', label: 'Slide 4' })
    expect(assetPlace('  ')).toBeNull()
  })
})

describe('findPlace', () => {
  it('finds the chunk holding a page, or the one labelled so', () => {
    document.body.innerHTML = `
      <li data-place data-page-from="1" data-page-to="3"></li>
      <li data-place data-page-from="4" data-page-to="7" id="hit"></li>
      <li data-place data-label="Slide 4" id="slide"></li>`
    expect(findPlace(document, { kind: 'page', page: 5 })?.id).toBe('hit')
    expect(findPlace(document, { kind: 'label', label: 'Slide 4' })?.id).toBe(
      'slide',
    )
    expect(findPlace(document, { kind: 'page', page: 40 })).toBeNull()
  })
})

describe('passagePlace (CON-487)', () => {
  it('opens at the passage’s own label, else its page, never its chunk', () => {
    expect(passagePlace({ chunkId: 'c9', label: 'pp. 5–6', page: 5 })).toBe(
      'pp. 5–6',
    )
    expect(passagePlace({ label: '12:03–12:47', startMs: 723000 })).toBe(
      '12:03–12:47',
    )
    expect(passagePlace({ chunkId: 'c9', page: 12 })).toBe('p. 12')
    expect(passagePlace({ chunkId: 'c9' })).toBeUndefined()
    expect(passagePlace(undefined)).toBeUndefined()
  })
})
