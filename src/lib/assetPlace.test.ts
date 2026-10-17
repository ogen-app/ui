import { describe, expect, it } from 'vitest'
import { assetPlace, findPlace } from './assetPlace'

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
