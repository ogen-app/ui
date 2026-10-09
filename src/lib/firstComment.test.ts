import { describe, expect, it } from 'vitest'
import {
  firstCommentBlocks,
  firstCommentFit,
  firstCommentLength,
  firstCommentStatusLine,
  isPermissionError,
} from './firstComment'
import type { Post } from '@/types/posts'

const PUBLISHED_AT = '2026-10-09T14:00:00Z'
const at = (iso: string) => new Date(iso).getTime()

function post(overrides: Partial<Post>): Post {
  return {
    status: 'published',
    published_at: PUBLISHED_AT,
    first_comment: 'Full guide → https://ogen.app/guides',
    first_comment_delay_minutes: 3,
    first_comment_status: null,
    ...overrides,
  } as Post
}

describe('firstCommentLength', () => {
  /**
   * The server trims what it stores and counts the flattened text, so a
   * client that counted the raw field would show a number the gate disagrees
   * with — and refuse a comment the server would take.
   */
  it('counts what the server stores and the platform receives', () => {
    expect(firstCommentLength('  hello  ')).toBe(5)
    expect(firstCommentLength('**bold**')).toBe(4)
    expect(firstCommentLength('🙂🙂')).toBe(2)
  })
})

describe('firstCommentFit', () => {
  it('claims nothing while the limit is unknown', () => {
    expect(firstCommentFit('hi', undefined).state).toBe('unknown')
  })

  it('reads a zero limit as a type that takes no comment', () => {
    expect(firstCommentFit('hi', 0).state).toBe('unsupported')
  })

  it('measures against a positive limit', () => {
    expect(firstCommentFit('abc', 3)).toEqual({
      state: 'ok',
      length: 3,
      limit: 3,
    })
    expect(firstCommentFit('abcd', 3)).toEqual({
      state: 'over',
      length: 4,
      limit: 3,
    })
  })
})

describe('firstCommentBlocks', () => {
  it('blocks an over-limit comment and one the type cannot take', () => {
    expect(firstCommentBlocks('abcd', 3)).toBe(true)
    expect(firstCommentBlocks('abc', 0)).toBe(true)
  })

  /**
   * The text is kept across a switch to a type that takes none, so an empty
   * field on such a type must not block — there is nothing to refuse.
   */
  it('never blocks an empty comment, or one it cannot measure', () => {
    expect(firstCommentBlocks('   ', 0)).toBe(false)
    expect(firstCommentBlocks('abcd', undefined)).toBe(false)
    expect(firstCommentBlocks('abc', 3)).toBe(false)
  })
})

describe('firstCommentStatusLine', () => {
  const now = at('2026-10-09T14:01:10Z')

  it('states the plan on a scheduled post, before there is a status', () => {
    expect(
      firstCommentStatusLine(
        post({
          status: 'scheduled',
          published_at: null,
          first_comment_delay_minutes: 0,
        }),
        now,
      ),
    ).toMatchObject({ key: 'withPost' })
    expect(
      firstCommentStatusLine(
        post({ status: 'scheduled', published_at: null }),
        now,
      ),
    ).toMatchObject({ key: 'afterPublish', minutes: 3 })
  })

  /** Published with no status: the comment never went with it. */
  it('says nothing about a published post that sent no comment', () => {
    expect(firstCommentStatusLine(post({}), now)).toBeNull()
  })

  it('counts a pending comment down from the publish time, rounding up', () => {
    expect(
      firstCommentStatusLine(post({ first_comment_status: 'pending' }), now),
    ).toMatchObject({ key: 'postingIn', minutes: 2, tone: 'progress' })
    expect(
      firstCommentStatusLine(
        post({ first_comment_status: 'pending' }),
        at('2026-10-09T14:04:00Z'),
      ),
    ).toMatchObject({ key: 'postingNow' })
  })

  it('reports each outcome the workers write', () => {
    expect(
      firstCommentStatusLine(post({ first_comment_status: 'delegated' }), now),
    ).toMatchObject({ key: 'delegated', tone: 'positive' })
    expect(
      firstCommentStatusLine(
        post({
          first_comment_status: 'posted',
          first_comment_posted_at: '2026-10-09T14:03:05Z',
        }),
        now,
      ),
    ).toMatchObject({ key: 'posted', at: '2026-10-09T14:03:05Z' })
    expect(
      firstCommentStatusLine(post({ first_comment_status: 'skipped' }), now),
    ).toMatchObject({ key: 'skipped', tone: 'neutral' })
  })

  it('offers a reconnect only when the failure is about permission', () => {
    expect(
      firstCommentStatusLine(
        post({
          first_comment_status: 'failed',
          first_comment_error:
            'the account lacks permission to comment; reconnect it and allow comments',
        }),
        now,
      ),
    ).toMatchObject({ key: 'failed', tone: 'destructive', reconnect: true })
    expect(
      firstCommentStatusLine(
        post({
          first_comment_status: 'failed',
          first_comment_error: 'zernio: 500 internal error',
        }),
        now,
      ),
    ).toMatchObject({ key: 'failed', reconnect: false })
  })
})

describe('isPermissionError', () => {
  it('reads the sentence the server writes for a 403', () => {
    expect(isPermissionError('the account lacks permission to comment')).toBe(
      true,
    )
    expect(isPermissionError('HTTP 403 Forbidden')).toBe(true)
    expect(isPermissionError('rate limited')).toBe(false)
    expect(isPermissionError(undefined)).toBe(false)
  })
})
