import { describe, expect, it } from 'vitest'

import {
  MAX_THREAD_POSTS,
  assignAttachment,
  autoSplitCount,
  isSequencePost,
  parseAssignment,
  planThread,
  reconcileAssignment,
  splitBody,
  splitToLimit,
  supportsSequence,
  threadHasIssues,
  type ThreadAssignment,
} from './threadSequence.ts'

function att(id: string, mime = 'image/jpeg') {
  return { id, mime_type: mime }
}

const LIMITS = { charLimit: 280, imageCap: 4, videoCap: 1 }

function plan(
  content: string,
  extra: {
    attachments?: { id: string; mime_type: string }[]
    assignment?: ThreadAssignment
    charLimit?: number | null | undefined
  } = {},
) {
  return planThread({
    ...LIMITS,
    content,
    attachments: extra.attachments ?? [],
    assignment: extra.assignment ?? {},
    ...(('charLimit' in extra) ? { charLimit: extra.charLimit } : {}),
  })
}

describe('supportsSequence / isSequencePost', () => {
  it('covers the two networks Zernio takes threadItems for', () => {
    expect(supportsSequence('twitter')).toBe(true)
    expect(supportsSequence('threads')).toBe(true)
    expect(supportsSequence('linkedin')).toBe(false)
    expect(supportsSequence(undefined)).toBe(false)
  })

  it('is the pair, not either half', () => {
    expect(isSequencePost('twitter', 'thread')).toBe(true)
    expect(isSequencePost('twitter', 'text-post')).toBe(false)
    expect(isSequencePost('linkedin', 'thread')).toBe(false)
  })
})

describe('splitBody', () => {
  it('breaks at a divider, and leaves blank lines inside a post', () => {
    const { parts, rule } = splitBody('One\n\nstill one\n\n---\n\nTwo')
    expect(rule).toBe('divider')
    expect(parts).toEqual(['One\n\nstill one', 'Two'])
  })

  it('takes the form BlockNote writes a divider back as', () => {
    expect(splitBody('One\n\n***\n\nTwo').parts).toEqual(['One', 'Two'])
    expect(splitBody('One\n\n___\n\nTwo').parts).toEqual(['One', 'Two'])
  })

  it('falls back to blank lines when the body has no divider', () => {
    const { parts, rule } = splitBody('First post\n\nSecond post\n\nThird')
    expect(rule).toBe('blank-line')
    expect(parts).toEqual(['First post', 'Second post', 'Third'])
  })

  it('does not read a divider inside a fenced code block as a break', () => {
    // It stays copy — `markdownToSocialText` keeps what is inside a fence —
    // so the body falls back to blank lines rather than claiming a divider.
    const { parts, rule } = splitBody('Look:\n\n```\n---\n```\n\nSee?')
    expect(rule).toBe('blank-line')
    expect(parts).toContain('---')
  })

  it('drops the empty parts a half-typed divider leaves behind', () => {
    expect(splitBody('---\n\nFirst\n\n---').parts).toEqual(['First'])
  })

  it('never returns nothing, so an empty body previews as an empty post', () => {
    expect(splitBody('').parts).toEqual([''])
    expect(splitBody('---').parts).toEqual([''])
  })

  it('flattens the Markdown, so the count is what the network receives', () => {
    expect(splitBody('**bold**').parts).toEqual(['bold'])
  })
})

describe('splitToLimit', () => {
  it('leaves a part that already fits', () => {
    expect(splitToLimit('short', 280)).toEqual(['short'])
  })

  it('says nothing while the ceiling is still loading', () => {
    expect(splitToLimit('x'.repeat(900), undefined)).toHaveLength(1)
    expect(splitToLimit('x'.repeat(900), null)).toHaveLength(1)
  })

  it('cuts on a sentence end where there is one', () => {
    const body = `${'a'.repeat(120)}. ${'b'.repeat(120)}. ${'c'.repeat(120)}.`
    const parts = splitToLimit(body, 280)
    expect(parts).toHaveLength(2)
    expect(parts[0].endsWith('.')).toBe(true)
    expect(parts[0].startsWith('a')).toBe(true)
  })

  it('falls back to a word break rather than leaving a post half empty', () => {
    // One sentence ends early, then nothing but words: taking the sentence
    // would publish a post a third of the length it could be.
    const body = `Short. ${'word '.repeat(200)}`
    const parts = splitToLimit(body, 280)
    expect(parts[0].length).toBeGreaterThan(200)
    expect(parts[0].endsWith('word')).toBe(true)
  })

  it('cuts an unbroken token where the limit falls', () => {
    const parts = splitToLimit('x'.repeat(600), 280)
    expect(parts[0]).toHaveLength(280)
    expect(parts.join('')).toHaveLength(600)
  })

  it('keeps every post within the limit', () => {
    const parts = splitToLimit('word '.repeat(400).trim(), 280)
    expect(parts.length).toBeGreaterThan(1)
    for (const part of parts) expect(part.length).toBeLessThanOrEqual(280)
  })

  it('counts code points, so an emoji is one character', () => {
    expect(splitToLimit('👍👍', 2)).toEqual(['👍👍'])
  })
})

describe('planThread', () => {
  it('numbers the posts the way the reader reads them', () => {
    const result = plan('One\n\nTwo\n\nThree')
    expect(result.posts.map((p) => p.position)).toEqual([1, 2, 3])
    expect(result.posts.map((p) => p.text)).toEqual(['One', 'Two', 'Three'])
    expect(result.rule).toBe('blank-line')
  })

  it('has no over-limit state, because it cuts instead', () => {
    const result = plan('word '.repeat(300).trim())
    expect(result.posts.length).toBeGreaterThan(1)
    for (const post of result.posts) expect(post.count).toBeLessThanOrEqual(280)
    expect(threadHasIssues(result)).toBe(false)
  })

  it('marks only the posts its own splitter cut', () => {
    const result = plan(`Short one\n\n${'word '.repeat(300).trim()}`)
    expect(result.posts[0].autoSplit).toBe(false)
    expect(autoSplitCount(result)).toBe(result.posts.length - 1)
  })

  it('gives every unassigned file to the first post', () => {
    const result = plan('One\n\nTwo', { attachments: [att('1'), att('2')] })
    expect(result.posts[0].attachments.map((a) => a.id)).toEqual(['1', '2'])
    expect(result.posts[1].attachments).toEqual([])
  })

  it('honours an assignment', () => {
    const result = plan('One\n\nTwo', {
      attachments: [att('1'), att('2')],
      assignment: { '2': 1 },
    })
    expect(result.posts[0].attachments.map((a) => a.id)).toEqual(['1'])
    expect(result.posts[1].attachments.map((a) => a.id)).toEqual(['2'])
  })

  it('gives a file the last post when the post it named is gone', () => {
    const result = plan('Only one post now', {
      attachments: [att('1')],
      assignment: { '1': 6 },
    })
    expect(result.posts[0].attachments.map((a) => a.id)).toEqual(['1'])
  })

  it('applies the image cap per post, not to the thread', () => {
    const attachments = ['1', '2', '3', '4', '5'].map((id) => att(id))
    const spread = plan('One\n\nTwo', {
      attachments,
      assignment: { '4': 1, '5': 1 },
    })
    expect(spread.posts.every((p) => p.issues.length === 0)).toBe(true)

    const piled = plan('One\n\nTwo', { attachments })
    expect(piled.posts[0].issues).toContain('too-many-images')
  })

  it('applies the one-video cap per post', () => {
    const result = plan('One', {
      attachments: [att('1', 'video/mp4'), att('2', 'video/mp4')],
    })
    expect(result.posts[0].videos).toBe(2)
    expect(result.posts[0].issues).toContain('too-many-videos')
  })

  it('reports a body that needs more posts than a thread holds', () => {
    const body = Array.from({ length: MAX_THREAD_POSTS + 5 }, (_, i) => `p${i}`).join(
      '\n\n',
    )
    const result = plan(body)
    expect(result.overflowed).toBe(true)
    expect(result.posts).toHaveLength(MAX_THREAD_POSTS)
    expect(threadHasIssues(result)).toBe(true)
  })

  it('gives no verdict while the ceiling is loading', () => {
    const result = plan('word '.repeat(300).trim(), { charLimit: undefined })
    expect(result.pending).toBe(true)
    // Uncut, rather than cut at a limit that is about to arrive and move it.
    expect(result.posts).toHaveLength(1)
  })
})

describe('parseAssignment', () => {
  it('reads back what was written', () => {
    expect(parseAssignment('{"a":2}')).toEqual({ a: 2 })
  })

  it('treats nothing and junk alike as never-written', () => {
    expect(parseAssignment(null)).toEqual({})
    expect(parseAssignment('')).toEqual({})
    expect(parseAssignment('not json')).toEqual({})
    expect(parseAssignment('[1,2]')).toEqual({})
  })

  it('drops entries that are not a post index', () => {
    expect(parseAssignment('{"a":"1","b":-1,"c":1.5,"d":0}')).toEqual({ d: 0 })
  })
})

describe('assignAttachment / reconcileAssignment', () => {
  it('records a file on the first post rather than forgetting it', () => {
    expect(assignAttachment({ a: 2 }, 'a', 0)).toEqual({ a: 0 })
  })

  it('ignores an index that is not a post', () => {
    const current = { a: 1 }
    expect(assignAttachment(current, 'a', -1)).toBe(current)
  })

  it('drops entries for files that are gone', () => {
    expect(reconcileAssignment({ a: 1, b: 2 }, [att('a')])).toEqual({ a: 1 })
  })

  it('returns the very same object when there is nothing to fix', () => {
    // Identity, not equality: this runs on every render, and a fresh object
    // would re-run every memo downstream of it.
    const current = { a: 1 }
    expect(reconcileAssignment(current, [att('a')])).toBe(current)
  })
})
