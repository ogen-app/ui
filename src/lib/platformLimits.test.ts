import { describe, expect, it } from 'vitest'
import type { Platform, TextConstraints } from '@/types/campaigns'
import type { ResolvedPostTypeRule } from '@/types/validation'
import { contentLimitFor, resolveCharLimit } from './platformLimits.ts'

function platform(text_constraints: TextConstraints): Platform {
  return {
    id: 'AXqWG7U2qnpt',
    name: 'LinkedIn',
    post_types: {},
    cadence: '',
    constraints: '',
    text_constraints,
    created_at: '',
    updated_at: '',
  }
}

function rule(max_content_chars: number | null): ResolvedPostTypeRule {
  return {
    requires_content: false,
    allowed_kinds: [],
    min_attachments: 0,
    max_attachments: null,
    max_content_chars,
  }
}

describe('contentLimitFor', () => {
  it('reads the platform default', () => {
    expect(contentLimitFor({ max_content_chars: 3000, max_title_chars: 0 }, 'text-post')).toBe(
      3000,
    )
  })

  it('prefers a per-post-type override', () => {
    const constraints: TextConstraints = {
      max_content_chars: 3000,
      max_title_chars: 200,
      per_post_type: { article: 110000 },
    }
    expect(contentLimitFor(constraints, 'article')).toBe(110000)
    expect(contentLimitFor(constraints, 'text-post')).toBe(3000)
  })

  // The Go zero value for an unseeded platform. Reading it as a literal zero
  // would fail every post on that platform, which is the worst possible
  // reading of "we don't know".
  it('treats 0 as unbounded, not as a zero-length cap', () => {
    expect(contentLimitFor({ max_content_chars: 0, max_title_chars: 0 }, 'text-post')).toBeNull()
    expect(
      contentLimitFor(
        { max_content_chars: 3000, max_title_chars: 0, per_post_type: { article: 0 } },
        'article',
      ),
    ).toBe(3000)
  })

  it('is unbounded when the platform has not loaded', () => {
    expect(contentLimitFor(undefined, 'text-post')).toBeNull()
  })
})

describe('resolveCharLimit', () => {
  const p = platform({
    max_content_chars: 3000,
    max_title_chars: 0,
    per_post_type: { article: 110000 },
  })

  it('takes the server-resolved rule when there is one', () => {
    expect(resolveCharLimit(p, rule(110000), 'article')).toBe(110000)
  })

  // A whitelist-only type carries no rule, and the rule is null before a type
  // is picked — the platform row still has an answer.
  it('falls back to the platform row without a rule', () => {
    expect(resolveCharLimit(p, null, 'article')).toBe(110000)
    expect(resolveCharLimit(p, null, '')).toBe(3000)
  })

  it('honours an explicitly unbounded rule over the platform default', () => {
    expect(resolveCharLimit(p, rule(null), 'live-video')).toBeNull()
  })
})
