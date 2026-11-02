import { describe, expect, it } from 'vitest'
import { altTextState } from './altText.ts'

describe('altTextState', () => {
  it('calls blank text missing, whoever wrote it', () => {
    expect(altTextState({ alt_text: '', alt_text_edited_by_user: false })).toBe(
      'missing',
    )
    expect(
      altTextState({ alt_text: '  ', alt_text_edited_by_user: true }),
    ).toBe('missing')
  })

  it('tells a generated description from a written one', () => {
    expect(
      altTextState({ alt_text: 'A cat', alt_text_edited_by_user: false }),
    ).toBe('generated')
    expect(
      altTextState({ alt_text: 'A cat', alt_text_edited_by_user: true }),
    ).toBe('written')
  })
})
