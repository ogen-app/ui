import { describe, expect, it } from 'vitest'
import { foldText, markdownToSocialText, splitThread } from './socialText.ts'

describe('markdownToSocialText', () => {
  it('strips emphasis but keeps the words', () => {
    expect(markdownToSocialText('**bold** and *italic* and ~~gone~~')).toBe(
      'bold and italic and gone',
    )
  })

  it('keeps asterisks that are not emphasis', () => {
    expect(markdownToSocialText('2 * 3 * 4')).toBe('2 * 3 * 4')
  })

  it('drops heading and quote markers', () => {
    expect(markdownToSocialText('## Why now\n\n> because')).toBe(
      'Why now\n\nbecause',
    )
  })

  it('turns bullets into bullet characters and keeps ordered numbers', () => {
    expect(markdownToSocialText('- one\n- two')).toBe('• one\n• two')
    expect(markdownToSocialText('1. one\n2. two')).toBe('1. one\n2. two')
  })

  it('keeps the URL alongside link text', () => {
    expect(markdownToSocialText('[Ogen](https://getogen.com)')).toBe(
      'Ogen (https://getogen.com)',
    )
  })

  it('does not repeat a URL used as its own link text', () => {
    expect(
      markdownToSocialText('[https://getogen.com](https://getogen.com)'),
    ).toBe('https://getogen.com')
  })

  it('reduces an image to its alt text', () => {
    expect(markdownToSocialText('![a chart](https://x.com/a.png)')).toBe(
      'a chart',
    )
  })

  it('collapses block spacing to a single blank line', () => {
    expect(markdownToSocialText('a\n\n\n\nb')).toBe('a\n\nb')
  })

  it('unescapes punctuation the editor escaped', () => {
    expect(markdownToSocialText('50\\% off \\*not italic\\*')).toBe(
      '50% off *not italic*',
    )
  })

  it('passes fenced code through without treating it as Markdown', () => {
    expect(markdownToSocialText('```\nconst a = **b**\n```')).toBe(
      'const a = **b**',
    )
  })

  it('drops horizontal rules', () => {
    expect(markdownToSocialText('a\n\n---\n\nb')).toBe('a\n\nb')
  })

  it('is empty for empty input', () => {
    expect(markdownToSocialText('')).toBe('')
  })
})

describe('foldText', () => {
  it('leaves short text unfolded', () => {
    expect(foldText('short', 10)).toEqual({ head: 'short', rest: '' })
  })

  it('folds on a word boundary', () => {
    const { head, rest } = foldText('the quick brown fox jumps over', 20)
    expect(head).toBe('the quick brown fox')
    expect(rest).toBe('jumps over')
  })

  it('cuts mid-token when there is no nearby space', () => {
    const url = 'https://example.com/a-very-long-path-with-no-spaces-at-all'
    const { head } = foldText(url, 20)
    expect(head).toHaveLength(20)
  })

  it('loses no characters', () => {
    const text = 'the quick brown fox jumps over the lazy dog'
    const { head, rest } = foldText(text, 20)
    expect((head + ' ' + rest).length).toBe(text.length)
  })
})

describe('splitThread', () => {
  it('splits at blank lines', () => {
    expect(splitThread('one\n\ntwo\n\nthree')).toEqual(['one', 'two', 'three'])
  })

  it('keeps a single newline inside a post', () => {
    expect(splitThread('one\ntwo')).toEqual(['one\ntwo'])
  })

  it('treats a run of blank lines as one break', () => {
    expect(splitThread('one\n\n\n  \n\ntwo')).toEqual(['one', 'two'])
  })

  it('always yields at least one post', () => {
    expect(splitThread('')).toEqual([''])
    expect(splitThread('\n\n  \n')).toEqual([''])
  })
})
