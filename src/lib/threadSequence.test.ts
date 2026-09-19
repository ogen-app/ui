import { describe, expect, it } from 'vitest'

import {
  MAX_THREAD_POSTS,
  planThread,
  publishesAsChain,
  runtPositions,
  splitRuleFor,
  threadHasIssues,
} from './threadSequence.ts'
import type { PlatformValidationError } from '@/types/attachments'
import type { ThreadPreview } from '@/types/posts'
import type { ResolvedPostTypeRule } from '@/types/validation'

/**
 * Note what is *not* tested here any more: where a body breaks.
 *
 * That moved to the server with CON-284 R2 (`platforms.SplitThread`, covered by
 * its own 16 cases in `split_test.go`), and the suite it used to have here went
 * with it. Keeping a copy would have been worse than useless — it would have
 * gone on passing against rules the publisher had stopped following. What is
 * left is the part that is genuinely this client's: placing files on the
 * messages the server sends back, and reading its verdict.
 */

/** An attachment, optionally pinned to a message of the chain. */
function att(id: string, mime = 'image/jpeg', segment: number | null = null) {
  return { id, mime_type: mime, segment_index: segment }
}

/** A preview answer, as the endpoint would return it. */
function preview(
  texts: string[],
  extra: { limit?: number; errors?: PlatformValidationError[] } = {},
): ThreadPreview {
  const errors = extra.errors ?? []
  return {
    segments: texts.map((content) => ({
      content,
      char_count: [...content].length,
    })),
    limit: extra.limit ?? 280,
    valid: errors.length === 0,
    errors,
  }
}

function err(rule: string, segment?: number): PlatformValidationError {
  return {
    platform: 'x',
    attachment_id: '',
    rule,
    expected: '',
    actual: '',
    message: '',
    ...(segment == null ? {} : { segment }),
  }
}

function plan(
  texts: string[],
  extra: {
    attachments?: ReturnType<typeof att>[]
    content?: string
    limit?: number
    errors?: PlatformValidationError[]
  } = {},
) {
  return planThread({
    chain: true,
    content: extra.content ?? texts.join('\n\n'),
    preview: preview(texts, { limit: extra.limit, errors: extra.errors }),
    attachments: extra.attachments ?? [],
    imageCap: 4,
    videoCap: 1,
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

describe('splitRuleFor', () => {
  it('reads a thematic break as the author breaking the body', () => {
    expect(splitRuleFor('One\n\n---\n\nTwo')).toBe('divider')
    expect(splitRuleFor('-----')).toBe('divider')
  })

  it('takes the other two markers, which is what the editor writes', () => {
    // BlockNote serialises every divider — including a typed `---` — as `***`,
    // so this is the case every real body hits. `isRuleLine` read hyphens only
    // until ogen#156, which is why no authored thread ever split; the two
    // widened together and must stay in step.
    expect(splitRuleFor('One\n\n***\n\nTwo')).toBe('divider')
    expect(splitRuleFor('One\n\n___\n\nTwo')).toBe('divider')
  })

  it('allows spaces between the markers, as CommonMark does', () => {
    expect(splitRuleFor('One\n\n- - -\n\nTwo')).toBe('divider')
  })

  it('refuses mixed markers', () => {
    // The server requires one repeated character; `-*-` is ordinary text to it.
    expect(splitRuleFor('One\n\n-*-\n\nTwo')).toBe('auto')
  })

  it('does not read a rule with anything else on the line', () => {
    expect(splitRuleFor('--- and then')).toBe('auto')
    expect(splitRuleFor('--')).toBe('auto')
    expect(splitRuleFor('**bold**')).toBe('auto')
  })

  it('calls a body with no rule line a packed one', () => {
    expect(splitRuleFor('One\n\nTwo\n\nThree')).toBe('auto')
    expect(splitRuleFor('')).toBe('auto')
  })
})

describe('planThread', () => {
  it('numbers the posts the way the reader reads them', () => {
    const result = plan(['One', 'Two', 'Three'])
    expect(result.posts.map((p) => p.position)).toEqual([1, 2, 3])
    expect(result.posts.map((p) => p.text)).toEqual(['One', 'Two', 'Three'])
  })

  it('takes the character count from the server rather than recounting', () => {
    // The gate measures code points; a recount here that disagreed would show
    // a number the publish gate does not hold.
    const result = plan(['👍👍'])
    expect(result.posts[0].count).toBe(2)
  })

  it('flattens the Markdown for display but counts the raw segment', () => {
    // The server splits and measures the body as typed, and publishes it that
    // way too — `**bold**` is eight characters against the ceiling. The card
    // draws plain text like every other post type, so the two differ on
    // purpose: `text` is what it looks like, `count` is what the gate said.
    const result = plan(['**bold**'])
    expect(result.posts[0].text).toBe('bold')
    expect(result.posts[0].count).toBe(8)
  })

  it('judges a runt on what a reader sees, not on the markup', () => {
    // `**x**` is five characters to the ceiling and one to a reader, and it is
    // the reader's view that decides whether a message looks like a slip.
    const result = plan(['A real first message', '**x**'])
    expect(runtPositions(result)).toEqual([2])
  })

  it('is empty and settled for a post that is not a chain', () => {
    // Not pending: nothing is waiting on an answer nobody asked for, and a
    // pending plan would stall `demotedFrom` for every ordinary post.
    const result = planThread({
      chain: false,
      content: 'anything',
      preview: undefined,
      attachments: [],
      imageCap: 4,
      videoCap: 1,
    })
    expect(result.pending).toBe(false)
    expect(result.posts).toEqual([])
  })

  it('is pending while the server has not answered yet', () => {
    const result = planThread({
      chain: true,
      content: 'One\n\n---\n\nTwo',
      preview: undefined,
      attachments: [],
      imageCap: 4,
      videoCap: 1,
    })
    expect(result.pending).toBe(true)
    expect(result.posts).toEqual([])
  })

  it('gives every unassigned file to the root', () => {
    // R2 made NULL mean "root" on the server too, so this is agreement rather
    // than a client-side convention.
    const result = plan(['One', 'Two'], { attachments: [att('1'), att('2')] })
    expect(result.posts[0].attachments.map((a) => a.id)).toEqual(['1', '2'])
    expect(result.posts[1].attachments).toEqual([])
  })

  it('honours the segment_index stored on the attachment', () => {
    const result = plan(['One', 'Two'], {
      attachments: [att('1'), att('2', 'image/jpeg', 1)],
    })
    expect(result.posts[0].attachments.map((a) => a.id)).toEqual(['1'])
    expect(result.posts[1].attachments.map((a) => a.id)).toEqual(['2'])
  })

  it('gives a file the last post when the post it named is gone', () => {
    // The author deleted a paragraph and the index outlived it. Riding the
    // last post is where the reader last saw the file.
    const result = plan(['Only one post now'], {
      attachments: [att('1', 'image/jpeg', 6)],
    })
    expect(result.posts[0].attachments.map((a) => a.id)).toEqual(['1'])
  })

  it('applies the image cap per post, not to the thread', () => {
    const attachments = ['1', '2', '3', '4', '5'].map((id, i) =>
      att(id, 'image/jpeg', i >= 3 ? 1 : 0),
    )
    const spread = plan(['One', 'Two'], { attachments })
    expect(spread.posts.every((p) => p.issues.length === 0)).toBe(true)

    const piled = plan(['One', 'Two'], {
      attachments: ['1', '2', '3', '4', '5'].map((id) => att(id)),
    })
    expect(piled.posts[0].issues).toContain('too-many-images')
  })

  it('applies the one-video cap per post', () => {
    const result = plan(['One'], {
      attachments: [att('1', 'video/mp4'), att('2', 'video/mp4')],
    })
    expect(result.posts[0].videos).toBe(2)
    expect(result.posts[0].issues).toContain('too-many-videos')
  })

  it('reports a body that needs more posts than a thread holds', () => {
    const result = plan(
      Array.from({ length: MAX_THREAD_POSTS + 5 }, (_, i) => `p${i}`),
    )
    expect(result.overflowed).toBe(true)
    expect(threadHasIssues(result)).toBe(true)
  })

  it('reads the server as the only limit it knows', () => {
    expect(plan(['One', 'Two'], { limit: 500 }).charLimit).toBe(500)
  })

  it('treats a zero limit as no limit rather than a limit of nothing', () => {
    // `0` is the server saying it had no platform to take a ceiling from.
    expect(plan(['One', 'Two'], { limit: 0 }).charLimit).toBe(null)
  })
})

describe('over-length messages', () => {
  it("takes the gate's word for which message is too long", () => {
    // Back as a reportable state under R2: in manual mode `SplitThread` obeys
    // the author's breaks and does not apply the ceiling, so a long message
    // survives the split and is refused at the gate instead of being cut. The
    // splitter this client used to run always cut to fit, which is why this
    // could not happen before.
    const result = plan(['Short', 'x'.repeat(400)], {
      content: 'Short\n\n---\n\n' + 'x'.repeat(400),
      errors: [err('max_content_chars', 1)],
    })
    expect(result.posts[0].issues).toEqual([])
    expect(result.posts[1].issues).toContain('too-long')
    expect(threadHasIssues(result)).toBe(true)
  })

  it('ignores a whole-post failure that names no message', () => {
    // A `segment`-less error is about the thread rather than one message, so
    // pinning it to a post would point the author at the wrong one.
    const result = plan(['One', 'Two'], {
      errors: [err('thread_segment_count')],
    })
    expect(result.posts.every((p) => p.issues.length === 0)).toBe(true)
  })
})

describe('runts', () => {
  it('names a message too short to have been meant', () => {
    // A divider typed a line early. The server drops an *empty* chunk, so this
    // is the accident that survives it.
    const result = plan(['A real first message', 'x', 'And a third'])
    expect(runtPositions(result)).toEqual([2])
  })

  it('does not flag a short closing line', () => {
    // "Thanks for reading." is a thing people write, and refusing it would be
    // worse than the slip the check is for.
    const result = plan(['A real first message', 'Thanks for reading.'])
    expect(runtPositions(result)).toEqual([])
  })
})

describe('singular', () => {
  it('is true for a body that came to one message', () => {
    // Not a failure: a chain of one is what the platforms call a post, and
    // `demotedFrom` is what moves the slug for it.
    expect(plan(['Just the one thing to say']).singular).toBe(true)
  })

  it('is true when the body split to nothing at all', () => {
    expect(plan([]).singular).toBe(true)
  })

  it('is false once there is a second message', () => {
    expect(plan(['One', 'Two']).singular).toBe(false)
  })
})
