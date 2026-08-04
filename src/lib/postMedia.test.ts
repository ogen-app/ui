import { describe, expect, it } from 'vitest'
import type { Post } from '@/types/posts'
import type { PostAttachmentWithValidation } from '@/types/attachments'
import type { ResolvedPostTypeRule } from '@/types/validation'
import { mediaPolicy, strandedAttachments } from './postMedia.ts'
import { evaluatePost, hasVisibleProblem, worstStatus } from './postValidation.ts'

// Platform Sqids from platformDictionary.ts.
const INSTAGRAM = 'rzgpTkARLH0L'
const LINKEDIN = 'AXqWG7U2qnpt'

function rule(overrides: Partial<ResolvedPostTypeRule> = {}): ResolvedPostTypeRule {
  return {
    requires_content: false,
    allowed_kinds: ['image'],
    min_attachments: 1,
    max_attachments: null,
    max_content_chars: null,
    ...overrides,
  }
}

function makeAttachment(
  overrides: Partial<PostAttachmentWithValidation> = {},
): PostAttachmentWithValidation {
  return {
    id: Math.random().toString(36).slice(2),
    post_id: 'p1',
    position: 0,
    mime_type: 'image/jpeg',
    size_bytes: 1024,
    width: 1080,
    height: 1080,
    is_animated: false,
    page_count: 0,
    checksum_sha256: 'abc',
    s3_key: 'k',
    created_by: 'u1',
    created_at: '2026-01-01T00:00:00Z',
    platform_validation: [],
    ...overrides,
  }
}

function makePost(overrides: Partial<Post> = {}): Post {
  return {
    id: 'p1',
    campaign_id: 'c1',
    platform_id: INSTAGRAM,
    platform_post_type: 'carousel',
    social_account_id: '',
    title: '',
    content: 'Hello',
    media_urls: [],
    scheduled_at: null,
    published_at: null,
    status: 'draft',
    cta_type: 'none',
    cta_url: '',
    target_audience_notes: '',
    used_asset_ids: [],
    campaign_type_phase_id: null,
    created_by: 'u1',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    campaign: null,
    platform: null,
    used_assets: [],
    campaign_type_phase: null,
    ...overrides,
  }
}

describe('mediaPolicy', () => {
  it('caps an unbounded post-type rule at the platform limit', () => {
    const policy = mediaPolicy(INSTAGRAM, rule({ min_attachments: 2 }))
    expect(policy.accepts).toBe(true)
    expect(policy.required).toBe(true)
    expect(policy.max).toBe(10)
  })

  it('takes the stricter of rule and platform caps', () => {
    const policy = mediaPolicy(INSTAGRAM, rule({ max_attachments: 1 }))
    expect(policy.max).toBe(1)
  })

  it('rejects media for a text post', () => {
    const policy = mediaPolicy(
      LINKEDIN,
      rule({ allowed_kinds: [], min_attachments: 0, max_attachments: 0 }),
    )
    expect(policy.accepts).toBe(false)
    expect(policy.required).toBe(false)
  })

  it('flags video-only post types as unsupported rather than empty', () => {
    const policy = mediaPolicy(LINKEDIN, rule({ allowed_kinds: ['video'] }))
    expect(policy.videoOnly).toBe(true)
    expect(policy.accepts).toBe(false)
    expect(policy.kinds).toEqual([])
  })

  it('falls back to the platform cap while the rule is unknown', () => {
    const policy = mediaPolicy(INSTAGRAM, null)
    expect(policy.accepts).toBe(true)
    expect(policy.required).toBe(false)
    expect(policy.max).toBe(10)
  })
})

describe('strandedAttachments', () => {
  it('lists everything when the post type takes no media', () => {
    const atts = [makeAttachment(), makeAttachment()]
    const policy = mediaPolicy(INSTAGRAM, rule({ max_attachments: 0, allowed_kinds: [] }))
    expect(strandedAttachments(atts, policy)).toHaveLength(2)
  })

  it('lists only the wrong-kind files when the post type takes media', () => {
    const atts = [
      makeAttachment(),
      makeAttachment({ mime_type: 'application/pdf', page_count: 4 }),
    ]
    const policy = mediaPolicy(LINKEDIN, rule({ allowed_kinds: ['image'] }))
    const stranded = strandedAttachments(atts, policy)
    expect(stranded).toHaveLength(1)
    expect(stranded[0].mime_type).toBe('application/pdf')
  })
})

describe('evaluatePost', () => {
  const base = {
    ready: true,
    postValidation: [],
    requiresContent: false,
    // Instagram's caption cap. Injected rather than looked up: the limit is
    // the server's now (CON-91), so the check is tested against a number the
    // caller supplies.
    maxContentChars: 2200 as number | null | undefined,
  }

  it('fails the media check below the minimum', () => {
    const policy = mediaPolicy(INSTAGRAM, rule({ min_attachments: 2 }))
    const checks = evaluatePost({
      ...base,
      post: makePost(),
      policy,
      attachments: [makeAttachment()],
    })
    const media = checks.find((c) => c.id === 'media-count')
    expect(media?.status).toBe('fail')
    expect(worstStatus(checks)).toBe('fail')
  })

  it('passes once the minimum is met', () => {
    const policy = mediaPolicy(INSTAGRAM, rule({ min_attachments: 2 }))
    const checks = evaluatePost({
      ...base,
      post: makePost(),
      policy,
      attachments: [makeAttachment(), makeAttachment()],
    })
    expect(checks.find((c) => c.id === 'media-count')?.status).toBe('pass')
  })

  it('warns, but does not fail, when a text post still carries files', () => {
    const policy = mediaPolicy(INSTAGRAM, rule({ max_attachments: 0, allowed_kinds: [] }))
    const checks = evaluatePost({
      ...base,
      post: makePost({ platform_post_type: 'text-post' }),
      policy,
      attachments: [makeAttachment()],
    })
    expect(checks.find((c) => c.id === 'media-count')?.status).toBe('warn')
    expect(checks.some((c) => c.status === 'fail')).toBe(false)
  })

  it('fails over the platform character limit', () => {
    const checks = evaluatePost({
      ...base,
      post: makePost({ content: 'x'.repeat(2500) }),
      policy: mediaPolicy(INSTAGRAM, rule({ min_attachments: 0 })),
      attachments: [],
    })
    expect(checks.find((c) => c.id === 'char-limit')?.status).toBe('fail')
  })

  it('counts the flattened text, not the Markdown syntax around it', () => {
    // 2200 is Instagram's cap. The bold markers push the raw string over it
    // while the words the platform receives stay under.
    const words = 'x'.repeat(2190)
    const checks = evaluatePost({
      ...base,
      post: makePost({ content: `**${words}**` }),
      policy: mediaPolicy(INSTAGRAM, rule({ min_attachments: 0 })),
      attachments: [],
    })
    const limit = checks.find((c) => c.id === 'char-limit')
    expect(limit?.status).toBe('pass')
    expect(limit?.detail).toContain('2,190')
  })

  it('counts code points, so an emoji is one character', () => {
    const checks = evaluatePost({
      ...base,
      post: makePost({ content: '👍'.repeat(10) }),
      policy: mediaPolicy(INSTAGRAM, rule({ min_attachments: 0 })),
      attachments: [],
    })
    // Ten surrogate pairs are 20 UTF-16 units and 10 characters to the network.
    expect(checks.find((c) => c.id === 'char-limit')?.detail).toContain('10 / 2,200')
  })

  it('holds the length check pending until the limit has loaded', () => {
    const checks = evaluatePost({
      ...base,
      maxContentChars: undefined,
      post: makePost({ content: 'x'.repeat(5000) }),
      policy: mediaPolicy(INSTAGRAM, rule({ min_attachments: 0 })),
      attachments: [],
    })
    expect(checks.find((c) => c.id === 'char-limit')?.status).toBe('pending')
  })

  it('still counts, without failing, on a platform with no limit', () => {
    const checks = evaluatePost({
      ...base,
      maxContentChars: null,
      post: makePost({ content: 'x'.repeat(100000) }),
      policy: mediaPolicy(INSTAGRAM, rule({ min_attachments: 0 })),
      attachments: [],
    })
    const limit = checks.find((c) => c.id === 'char-limit')
    expect(limit?.status).toBe('pass')
    expect(limit?.detail).toContain('no limit')
  })

  it('treats copy that is only formatting as no copy at all', () => {
    const checks = evaluatePost({
      ...base,
      post: makePost({ content: '---' }),
      policy: mediaPolicy(INSTAGRAM, rule({ min_attachments: 0 })),
      attachments: [],
    })
    expect(checks.find((c) => c.id === 'content')?.detail).toBe('No copy yet')
  })

  it('surfaces the server soft warnings for a file', () => {
    const checks = evaluatePost({
      ...base,
      post: makePost(),
      policy: mediaPolicy(INSTAGRAM, rule({ min_attachments: 0 })),
      attachments: [
        makeAttachment({
          platform_validation: [
            {
              platform: INSTAGRAM,
              attachment_id: 'a1',
              rule: 'allowed_format',
              expected: 'jpeg,png',
              actual: 'webp',
              message: 'format "webp" is not allowed for this platform',
            },
          ],
        }),
      ],
    })
    const rules = checks.filter((c) => c.label === 'Media rules')
    expect(rules).toHaveLength(1)
    expect(rules[0].status).toBe('warn')
  })

  it('reports pending while attachments and rules load', () => {
    const checks = evaluatePost({
      ...base,
      ready: false,
      post: makePost(),
      policy: mediaPolicy(INSTAGRAM, null),
      attachments: [],
    })
    expect(checks.find((c) => c.id === 'media-count')?.status).toBe('pending')
  })
})

describe('hasVisibleProblem', () => {
  it('stays quiet on a post that is merely unfinished', () => {
    expect(hasVisibleProblem(makePost({ status: 'draft' }))).toBe(false)
    expect(hasVisibleProblem(makePost({ status: 'scheduled' }))).toBe(false)
    expect(hasVisibleProblem(makePost({ status: 'published' }))).toBe(false)
  })

  it('flags a publish that went wrong or never went out', () => {
    expect(hasVisibleProblem(makePost({ status: 'failed' }))).toBe(true)
    expect(hasVisibleProblem(makePost({ status: 'not_published' }))).toBe(true)
  })

  it('flags a post that has nowhere to go', () => {
    expect(hasVisibleProblem(makePost({ platform_id: '' }))).toBe(true)
    expect(hasVisibleProblem(makePost({ platform_id: 'not-a-platform' }))).toBe(true)
    expect(hasVisibleProblem(makePost({ platform_post_type: '' }))).toBe(true)
  })

  it('reads only the post row — no attachments, no server rules', () => {
    // The guarantee the calendar leans on: hundreds of cards, zero extra
    // requests. A post whose *only* fault needs those fetches stays clean.
    expect(hasVisibleProblem(makePost({ content: '', media_urls: [] }))).toBe(false)
  })
})
