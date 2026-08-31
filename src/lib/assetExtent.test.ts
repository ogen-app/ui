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
    expect(extentLabel({ content: 'w '.repeat(1240), status: 'ready' })).toBe(
      '1,240 words',
    )
  })

  it('says word, singular', () => {
    expect(extentLabel({ content: 'hello', status: 'ready' })).toBe('1 word')
  })

  it('reads an empty processing asset as a wait, not a verdict', () => {
    expect(extentLabel({ content: '', status: 'processing' })).toBe(
      'Not read yet',
    )
  })

  it('names the failure a size never would: uploaded fine, extracted to nothing', () => {
    expect(extentLabel({ content: '', status: 'partial' })).toBe(
      'Nothing extracted',
    )
    expect(extentLabel({ content: '', status: 'ready' })).toBe(
      'Nothing extracted',
    )
  })
})
