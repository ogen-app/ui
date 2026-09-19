import { describe, expect, it } from 'vitest'
import { extentLabel, wordCount } from './assetExtent'

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
    expect(
      extentLabel({ content: 'w '.repeat(1240), status: 'ready', type: 'MD' }),
    ).toBe('1,240 words')
  })

  it('says word, singular', () => {
    expect(extentLabel({ content: 'hello', status: 'ready', type: 'MD' })).toBe(
      '1 word',
    )
  })

  it('reads an empty processing asset as a wait, not a verdict', () => {
    expect(
      extentLabel({ content: '', status: 'processing', type: 'PDF' }),
    ).toBe('Not read yet')
  })

  it('names the failure a size never would: uploaded fine, extracted to nothing', () => {
    expect(extentLabel({ content: '', status: 'partial', type: 'PDF' })).toBe(
      'Nothing extracted',
    )
    expect(extentLabel({ content: '', status: 'ready', type: 'PDF' })).toBe(
      'Nothing extracted',
    )
  })

  // An image that uploaded perfectly has no extracted text and never will —
  // saying so as a failure is the row calling a working asset broken.
  it('reads an undescribed image as undescribed, not as a failed extraction', () => {
    expect(extentLabel({ content: '', status: 'ready', type: 'IMG' })).toBe(
      'No description',
    )
  })

  it('counts an image description like any other words', () => {
    expect(
      extentLabel({ content: 'a teal swatch', status: 'ready', type: 'IMG' }),
    ).toBe('3 words')
  })
})
