import { describe, expect, it } from 'vitest'
import { snippetParts } from './snippet'

describe('snippetParts', () => {
  it('splits on the marks and unescapes the text', () => {
    expect(
      snippetParts('…bees &amp; <mark>hives</mark> in &lt;winter&gt; &#39;26…'),
    ).toEqual([
      { text: '…bees & ', marked: false },
      { text: 'hives', marked: true },
      { text: " in <winter> '26…", marked: false },
    ])
  })

  it('keeps markup the document contained as text', () => {
    expect(snippetParts('&lt;script&gt;<mark>x</mark>')).toEqual([
      { text: '<script>', marked: false },
      { text: 'x', marked: true },
    ])
  })

  it('reads a snippet with nothing marked as one run', () => {
    expect(snippetParts('plain')).toEqual([{ text: 'plain', marked: false }])
  })
})
