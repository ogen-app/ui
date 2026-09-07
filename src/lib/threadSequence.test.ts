import { describe, expect, it } from 'vitest'

import {
  MAX_THREAD_POSTS,
  autoSplitCount,
  planThread,
  publishesAsChain,
  runtPositions,
  splitBody,
  splitToLimit,
  threadHasIssues,
  threadSegments,
} from './threadSequence.ts'
import type { ResolvedPostTypeRule } from '@/types/validation'

/** An attachment, optionally pinned to a message of the chain. */
function att(id: string, mime = 'image/jpeg', segment: number | null = null) {
  return { id, mime_type: mime, segment_index: segment }
}

const LIMITS = { charLimit: 280, imageCap: 4, videoCap: 1 }

function plan(
  content: string,
  extra: {
    attachments?: ReturnType<typeof att>[]
    charLimit?: number | null | undefined
  } = {},
) {
  return planThread({
    ...LIMITS,
    content,
    attachments: extra.attachments ?? [],
    ...('charLimit' in extra ? { charLimit: extra.charLimit } : {}),
  })
}

function rule(over: Partial<ResolvedPostTypeRule> = {}): ResolvedPostTypeRule {
  return {
    requires_content: false,
    allowed_kinds: [],
    min_attachments: 0,
    max_attachments: null,
    max_content_chars: 280,
    segmented: false,
    ...over,
  }
}

describe('publishesAsChain', () => {
  it("is the server's answer, not a list of networks we keep", () => {
    // CON-284 put `segmented` on the post-type rule. The client used to hold a
    // hard-coded set of Zernio ids, which is what went stale the moment the
    // server taught Threads the slug.
    expect(publishesAsChain(rule({ segmented: true }))).toBe(true)
    expect(publishesAsChain(rule())).toBe(false)
  })

  it('decides nothing while the rule is missing', () => {
    expect(publishesAsChain(null)).toBe(false)
    expect(publishesAsChain(undefined)).toBe(false)
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

  it('honours the segment_index stored on the attachment', () => {
    const result = plan('One\n\nTwo', {
      attachments: [att('1'), att('2', 'image/jpeg', 1)],
    })
    expect(result.posts[0].attachments.map((a) => a.id)).toEqual(['1'])
    expect(result.posts[1].attachments.map((a) => a.id)).toEqual(['2'])
  })

  it('gives a file the last post when the post it named is gone', () => {
    // The author deleted a paragraph and the index outlived it. Riding the
    // last post is where the reader last saw the file — and clamping here is
    // also what keeps an out-of-range index off the wire, which the server
    // refuses with a 422 rather than clamping itself.
    const result = plan('Only one post now', {
      attachments: [att('1', 'image/jpeg', 6)],
    })
    expect(result.posts[0].attachments.map((a) => a.id)).toEqual(['1'])
  })

  it('applies the image cap per post, not to the thread', () => {
    const attachments = ['1', '2', '3', '4', '5'].map((id, i) =>
      att(id, 'image/jpeg', i >= 3 ? 1 : 0),
    )
    const spread = plan('One\n\nTwo', { attachments })
    expect(spread.posts.every((p) => p.issues.length === 0)).toBe(true)

    const piled = plan('One\n\nTwo', {
      attachments: ['1', '2', '3', '4', '5'].map((id) => att(id)),
    })
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
    const body = Array.from(
      { length: MAX_THREAD_POSTS + 5 },
      (_, i) => `p${i}`,
    ).join('\n\n')
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

describe('the no-scrap rule', () => {
  it('never ends a cut part on a handful of words', () => {
    // The bug this exists for: filling each post to the ceiling and letting
    // the remainder fall where it may publishes a full post followed by a post
    // reading "and that is why." Barely-over bodies get an even pair instead.
    const body = 'word '.repeat(58).trim() // ~289 chars, just past 280
    const parts = splitToLimit(body, 280)
    expect(parts).toHaveLength(2)
    for (const part of parts) {
      expect(part.length).toBeGreaterThan(280 * 0.2)
      expect(part.length).toBeLessThanOrEqual(280)
    }
  })

  it('still fills to the ceiling when there is a real post left over', () => {
    // The balancing is for the *last* cut only — a long body should not come
    // out as a dozen half-empty posts.
    const parts = splitToLimit('word '.repeat(300).trim(), 280)
    expect(parts.length).toBeGreaterThan(3)
    // Every part but the last two is a full post's worth.
    for (const part of parts.slice(0, -2)) {
      expect(part.length).toBeGreaterThan(280 * 0.6)
    }
  })

  it('leaves a part that already fits exactly alone', () => {
    expect(splitToLimit('x'.repeat(280), 280)).toEqual(['x'.repeat(280)])
  })
})

describe('runts', () => {
  it('names a message too short to have been meant', () => {
    // Only ever the author's doing — a divider typed a line early. The
    // splitter cannot produce one any more.
    const result = plan(
      'A real first message\n\n---\n\nx\n\n---\n\nAnd a third',
    )
    expect(runtPositions(result)).toEqual([2])
  })

  it('does not flag a short closing line', () => {
    // "Thanks for reading." is a thing people write, and refusing it would be
    // worse than the slip the check is for.
    const result = plan('A real first message\n\n---\n\nThanks for reading.')
    expect(runtPositions(result)).toEqual([])
  })
})

describe('singular', () => {
  it('is true for a body that fits in one message', () => {
    // Not a failure: a chain of one is what the platforms call a post, and
    // `demotedFrom` is what moves the slug for it.
    expect(plan('Just the one thing to say').singular).toBe(true)
  })

  it('is true for an empty body', () => {
    expect(plan('').singular).toBe(true)
  })

  it('is false once there is a second message', () => {
    expect(plan('One\n\nTwo').singular).toBe(false)
  })
})

describe('threadSegments', () => {
  it('is the chain the author was shown, message for message', () => {
    // Built from the plan rather than from the body a second time, so what
    // goes to the server is by construction what the preview drew.
    const result = plan('One\n\nTwo\n\nThree')
    expect(threadSegments(result)).toEqual([
      { content: 'One' },
      { content: 'Two' },
      { content: 'Three' },
    ])
  })

  it('sends nothing for a post that came to one message', () => {
    // `[]` is what the server stores for anything that is not a thread, so it
    // is both "no chain" and the tidy-up after a demotion.
    expect(threadSegments(plan('Just the one'))).toEqual([])
  })

  it('carries the cut copy, not the uncut body', () => {
    const result = plan('word '.repeat(300).trim())
    const segments = threadSegments(result)
    expect(segments.length).toBe(result.posts.length)
    for (const segment of segments) {
      expect(segment.content.length).toBeLessThanOrEqual(280)
    }
  })
})
