import { describe, expect, it } from 'vitest'
import { i18next } from '@/i18n'
import type { Asset } from '@/types/content'
import { extentLabel, wordCount } from './assetExtent'

const t = i18next.t.bind(i18next)

const extent = (asset: Partial<Asset>) =>
  extentLabel(
    t,
    { content: '', status: 'ready', type: 'MD', file: null, ...asset },
    'en',
  )

describe('wordCount', () => {
  it('counts words across any run of whitespace', () => {
    expect(wordCount({ content: 'one two\nthree   four\t five' })).toBe(5)
  })

  it('is zero for whitespace alone', () => {
    expect(wordCount({ content: '  \n ' })).toBe(0)
  })
})

describe('extentLabel', () => {
  it('groups thousands, because 12000 words is a report and 1200 is a memo', () => {
    expect(extent({ content: 'w '.repeat(1240) })).toBe('1,240 words')
  })

  it('says word, singular', () => {
    expect(extent({ content: 'hello' })).toBe('1 word')
  })

  it('reads an empty processing asset as a wait, not a verdict', () => {
    expect(extent({ status: 'processing', type: 'PDF' })).toBe('Not read yet')
    expect(extent({ status: 'pending', type: 'AUDIO' })).toBe('Not read yet')
  })

  /*
   * A PDF's and a document's `content` is the placeholder `"[]"` — the text
   * is in the chunks — so counting its words would put "1 word" on every one.
   */
  it('states a PDF by its pages and a document by its size', () => {
    const file = { page_count: 12, size_bytes: 4 << 20 } as Asset['file']
    expect(extent({ type: 'PDF', content: '[]', file })).toBe('12 pages')
    expect(
      extent({
        type: 'DOC',
        content: '[]',
        file: { page_count: 0, size_bytes: 2 << 20 } as Asset['file'],
      }),
    ).toBe('2.0 MB')
  })

  it('names the failure a size never would: uploaded fine, extracted to nothing', () => {
    expect(extent({ status: 'partial', type: 'MD' })).toBe('Nothing extracted')
    expect(extent({ status: 'failed', type: 'DOC', content: '[]' })).toBe(
      'Nothing extracted',
    )
  })

  // An image that uploaded perfectly and has no description yet — saying so as
  // a failure is the row calling a working asset broken.
  it('reads an undescribed image as undescribed, not as a failed extraction', () => {
    expect(extent({ type: 'IMG' })).toBe('No description')
  })

  it('counts an image description and a transcript like any other words', () => {
    expect(extent({ content: 'a teal swatch', type: 'IMG' })).toBe('3 words')
    expect(extent({ content: 'so welcome back', type: 'AUDIO' })).toBe(
      '3 words',
    )
  })
})
