import { describe, expect, it } from 'vitest'
import { emphasisParts, stripEmphasis } from './qualityEmphasis'

describe('emphasisParts', () => {
  it('splits one marked phrase out of the sentence', () => {
    expect(
      emphasisParts('The claim is loose, so **say they are bioindicators**.'),
    ).toEqual([
      { text: 'The claim is loose, so ', strong: false },
      { text: 'say they are bioindicators', strong: true },
      { text: '.', strong: false },
    ])
  })

  it('drops the empty runs when the phrase opens or closes the sentence', () => {
    expect(emphasisParts('**Too long for Threads**, and tagged.')).toEqual([
      { text: 'Too long for Threads', strong: true },
      { text: ', and tagged.', strong: false },
    ])
  })

  it('reads unmarked text as one plain run', () => {
    expect(emphasisParts('Facts hold up.')).toEqual([
      { text: 'Facts hold up.', strong: false },
    ])
  })

  // The backend is meant to strip a bad mark before storing; this is the same
  // rule again, so the reader never sees a stray asterisk.
  it('falls back to plain text on anything but one clean pair', () => {
    for (const text of [
      '**a** and **b**',
      'an **unclosed mark',
      'an empty ** ** pair',
      'a lone * and **a phrase**',
    ]) {
      const parts = emphasisParts(text)
      expect(parts).toHaveLength(1)
      expect(parts[0].strong).toBe(false)
      expect(parts[0].text).not.toContain('*')
    }
  })
})

describe('stripEmphasis', () => {
  it('removes every asterisk', () => {
    expect(stripEmphasis('a **b** *c*')).toBe('a b c')
  })
})
