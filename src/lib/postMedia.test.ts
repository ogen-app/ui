import { describe, expect, it } from 'vitest'
import type { Post } from '@/types/posts'
import type { Platform, VideoConstraints } from '@/types/campaigns'
import type { PostAttachmentWithValidation } from '@/types/attachments'
import type { ResolvedPostTypeRule } from '@/types/validation'
import { makePlatform, videoConstraints } from './platformFixtures.ts'
import { MAX_VIDEO_UPLOAD_BYTES } from './platformVideo.ts'
import { checkFile, mediaPolicy, strandedAttachments } from './postMedia.ts'
import {
  evaluatePost,
  hasVisibleProblem,
  worstStatus,
} from './postValidation.ts'

// Platform Sqids from platformDictionary.ts.
const INSTAGRAM = 'rzgpTkARLH0L'
const LINKEDIN = 'AXqWG7U2qnpt'
const YOUTUBE = '8S8bWQTG6qD'

/** The seeded LinkedIn video rules, verbatim from the CON-148 migration. */
const linkedInVideo: VideoConstraints = {
  max_file_size_bytes: 5368709120,
  allowed_formats: ['mp4'],
  max_duration_seconds: 900,
  min_duration_seconds: 3,
  max_width: 4096,
  max_height: 2304,
  allowed_aspect_ratios: ['16:9', '1:1', '9:16'],
  max_attachments_per_post: 1,
  requires_video_title: false,
}

function platform(
  video_constraints: VideoConstraints = videoConstraints(),
): Platform {
  return makePlatform({
    id: LINKEDIN,
    text_constraints: { max_content_chars: 3000, max_title_chars: 0 },
    video_constraints,
  })
}

function rule(
  overrides: Partial<ResolvedPostTypeRule> = {},
): ResolvedPostTypeRule {
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
    duration_ms: 0,
    codec: '',
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
    // A publishable post by default, so a test that asserts "nothing fails"
    // is asserting the thing it is about rather than the account check.
    social_account_id: 'acc-1',
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

  it('accepts a video post type once the platform carries video rules', () => {
    const policy = mediaPolicy(
      LINKEDIN,
      rule({ allowed_kinds: ['video'] }),
      platform(linkedInVideo),
    )
    expect(policy.accepts).toBe(true)
    expect(policy.kinds).toEqual(['video'])
    expect(policy.videoUnsupported).toBe(false)
    expect(policy.video?.allowedMimes).toEqual(['video/mp4'])
    // The platform's cap, not the rule's — the video rule set says one.
    expect(policy.max).toBe(1)
  })

  it('flags a video post type against a platform with no video rules', () => {
    const policy = mediaPolicy(
      LINKEDIN,
      rule({ allowed_kinds: ['video'] }),
      platform(),
    )
    expect(policy.videoUnsupported).toBe(true)
    expect(policy.video).toBeUndefined()
  })

  it('does not call video unsupported while the platform is still loading', () => {
    // `undefined` is "not fetched yet". Treating it as a verdict would flash a
    // "this platform doesn't publish video" warning on every editor open.
    const policy = mediaPolicy(LINKEDIN, rule({ allowed_kinds: ['video'] }))
    expect(policy.videoUnsupported).toBe(false)
  })

  it('caps video at Ogen’s own budget, not the platform’s ceiling', () => {
    // LinkedIn is seeded at 5 GB; we upload at most MAX_VIDEO_UPLOAD_BYTES.
    const policy = mediaPolicy(
      LINKEDIN,
      rule({ allowed_kinds: ['video'] }),
      platform(linkedInVideo),
    )
    expect(policy.video?.maxFileSizeBytes).toBe(MAX_VIDEO_UPLOAD_BYTES)
    expect(policy.video?.cappedByOgen).toBe(true)
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
    const policy = mediaPolicy(
      INSTAGRAM,
      rule({ max_attachments: 0, allowed_kinds: [] }),
    )
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

describe('checkFile', () => {
  const X = '81mUCmc2xsKd'
  const imageRule = rule({ min_attachments: 0, allowed_kinds: ['image'] })

  function file(name: string, type: string, bytes: number): File {
    return new File([new Uint8Array(bytes)], name, { type })
  }

  // X caps still images at 1 MB and Zernio enforces it strictly. This used to
  // read 5 MB, matching the (equally wrong) seeded platform row, so an
  // oversized image passed the client check and the server's and only failed
  // at publish. CON-123.
  it('rejects a still image over 1 MB on X', () => {
    const result = checkFile(
      file('photo.jpg', 'image/jpeg', 3 * 1024 * 1024),
      mediaPolicy(X, imageRule),
    )
    expect(result.ok).toBe(false)
  })

  it('accepts a still image under 1 MB on X', () => {
    expect(
      checkFile(
        file('photo.jpg', 'image/jpeg', 900 * 1024),
        mediaPolicy(X, imageRule),
      ).ok,
    ).toBe(true)
  })

  // GIFs are a separate upload path on X and go to 15 MB, so the 1 MB still
  // limit must not be applied to them.
  it('lets a GIF past the still-image limit, up to its own', () => {
    const policy = mediaPolicy(X, imageRule)
    expect(
      checkFile(file('loop.gif', 'image/gif', 5 * 1024 * 1024), policy).ok,
    ).toBe(true)
    expect(
      checkFile(file('loop.gif', 'image/gif', 20 * 1024 * 1024), policy).ok,
    ).toBe(false)
  })

  it('leaves platforms without a separate GIF ceiling alone', () => {
    // Instagram is 8 MB for everything it takes.
    const policy = mediaPolicy(INSTAGRAM, imageRule)
    expect(
      checkFile(file('photo.jpg', 'image/jpeg', 3 * 1024 * 1024), policy).ok,
    ).toBe(true)
    expect(
      checkFile(file('photo.jpg', 'image/jpeg', 9 * 1024 * 1024), policy).ok,
    ).toBe(false)
  })

  const videoPolicy = () =>
    mediaPolicy(
      LINKEDIN,
      rule({ allowed_kinds: ['video'] }),
      platform(linkedInVideo),
    )

  it('rejects video over Ogen’s budget before the upload starts', () => {
    // The platform would take 5 GB; refusing here saves the user a 600 MB
    // upload that finalize would answer 400 to.
    const tooBig = file('clip.mp4', 'video/mp4', 0)
    Object.defineProperty(tooBig, 'size', { value: MAX_VIDEO_UPLOAD_BYTES + 1 })
    const result = checkFile(tooBig, videoPolicy())
    expect(result.ok).toBe(false)
    expect(result.ok === false && result.reason).toContain('500 MB')
  })

  it('accepts video inside the budget', () => {
    expect(
      checkFile(file('clip.mp4', 'video/mp4', 1024), videoPolicy()).ok,
    ).toBe(true)
  })

  it('rejects a container the platform does not list', () => {
    // LinkedIn is seeded mp4-only.
    const result = checkFile(
      file('clip.mov', 'video/quicktime', 1024),
      videoPolicy(),
    )
    expect(result.ok).toBe(false)
    expect(result.ok === false && result.reason).toContain('MOV')
  })

  it('rejects video on a post type that takes none', () => {
    const result = checkFile(
      file('clip.mp4', 'video/mp4', 1024),
      mediaPolicy(X, imageRule),
    )
    expect(result.ok).toBe(false)
    expect(result.ok === false && result.reason).toContain("doesn't take video")
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
    // Instagram publishes no title, which is the common case.
    maxTitleChars: null as number | null | undefined,
    // Not a thread sequence — Instagram has none, and the length check these
    // cases exercise is the one a sequence replaces (CON-196).
    sequence: false,
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
    const policy = mediaPolicy(
      INSTAGRAM,
      rule({ max_attachments: 0, allowed_kinds: [] }),
    )
    const checks = evaluatePost({
      ...base,
      post: makePost({ platform_post_type: 'text-post' }),
      policy,
      attachments: [makeAttachment()],
    })
    expect(checks.find((c) => c.id === 'media-count')?.status).toBe('warn')
    expect(checks.some((c) => c.status === 'fail')).toBe(false)
  })

  // Mirrors `platforms.ValidatePostType`'s requires_video_title branch. Ogen
  // has no separate video-metadata form — the post's own title is the field,
  // because `SubmitRequest` carries nothing else today.
  const youTubeVideo = {
    ...linkedInVideo,
    allowed_formats: ['mp4', 'mov', 'webm'],
    requires_video_title: true,
  }
  const youTubePolicy = () =>
    mediaPolicy(YOUTUBE, rule({ allowed_kinds: ['video'] }), {
      ...platform(youTubeVideo),
      id: YOUTUBE,
      name: 'YouTube',
    })

  it('fails a video post with no title where the platform demands one', () => {
    const checks = evaluatePost({
      ...base,
      post: makePost({
        platform_id: YOUTUBE,
        platform_post_type: 'video',
        title: '  ',
      }),
      policy: youTubePolicy(),
      attachments: [makeAttachment({ mime_type: 'video/mp4' })],
    })
    expect(checks.find((c) => c.id === 'video-title')?.status).toBe('fail')
  })

  it('passes once the video post has a title', () => {
    const checks = evaluatePost({
      ...base,
      post: makePost({
        platform_id: YOUTUBE,
        platform_post_type: 'video',
        title: 'How we ship',
      }),
      policy: youTubePolicy(),
      attachments: [makeAttachment({ mime_type: 'video/mp4' })],
    })
    expect(checks.find((c) => c.id === 'video-title')?.status).toBe('pass')
  })

  it('raises no title check on a platform that derives one from the caption', () => {
    const checks = evaluatePost({
      ...base,
      post: makePost({
        platform_id: LINKEDIN,
        platform_post_type: 'video',
        title: '',
      }),
      policy: mediaPolicy(
        LINKEDIN,
        rule({ allowed_kinds: ['video'] }),
        platform(linkedInVideo),
      ),
      attachments: [makeAttachment({ mime_type: 'video/mp4' })],
    })
    expect(checks.some((c) => c.id === 'video-title')).toBe(false)
  })

  it('fails a title over the platform’s cap', () => {
    const checks = evaluatePost({
      ...base,
      post: makePost({ platform_id: YOUTUBE, title: 'x'.repeat(101) }),
      policy: youTubePolicy(),
      attachments: [makeAttachment({ mime_type: 'video/mp4' })],
      maxTitleChars: 100,
    })
    const check = checks.find((c) => c.id === 'title-limit')
    expect(check?.status).toBe('fail')
    expect(check?.detail).toContain('1 over')
  })

  it('counts a title in code points, not UTF-16 units', () => {
    // Two-unit emoji: 50 of them are 50 characters to YouTube's counter, not
    // 100 — measuring in `.length` would fail a title that fits.
    const checks = evaluatePost({
      ...base,
      post: makePost({ platform_id: YOUTUBE, title: '🎬'.repeat(50) }),
      policy: youTubePolicy(),
      attachments: [makeAttachment({ mime_type: 'video/mp4' })],
      maxTitleChars: 100,
    })
    expect(checks.find((c) => c.id === 'title-limit')?.status).toBe('pass')
  })

  it('raises no title-length check where the platform publishes no title', () => {
    const checks = evaluatePost({
      ...base,
      post: makePost({ title: 'x'.repeat(500) }),
      policy: mediaPolicy(INSTAGRAM, rule({ min_attachments: 0 })),
      attachments: [],
    })
    expect(checks.some((c) => c.id === 'title-limit')).toBe(false)
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
    expect(checks.find((c) => c.id === 'char-limit')?.detail).toContain(
      '10 / 2,200',
    )
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
  // A platform whose account resolution raises no objection — the common case.
  const resolved = { ambiguous: false, mismatched: false }

  it('stays quiet on a post that is merely unfinished', () => {
    expect(hasVisibleProblem(makePost({ status: 'draft' }), resolved)).toBe(
      false,
    )
    expect(hasVisibleProblem(makePost({ status: 'scheduled' }), resolved)).toBe(
      false,
    )
    expect(hasVisibleProblem(makePost({ status: 'published' }), resolved)).toBe(
      false,
    )
  })

  it('flags a publish that went wrong or never went out', () => {
    expect(hasVisibleProblem(makePost({ status: 'failed' }), resolved)).toBe(
      true,
    )
    expect(
      hasVisibleProblem(makePost({ status: 'not_published' }), resolved),
    ).toBe(true)
  })

  it('flags a post that has nowhere to go', () => {
    expect(hasVisibleProblem(makePost({ platform_id: '' }), resolved)).toBe(
      true,
    )
    expect(
      hasVisibleProblem(makePost({ platform_id: 'not-a-platform' }), resolved),
    ).toBe(true)
    expect(
      hasVisibleProblem(makePost({ platform_post_type: '' }), resolved),
    ).toBe(true)
  })

  it('follows the status machine on accounts: resolution, not presence', () => {
    // Same rule as `getTransitionBlockers` and the server's
    // `checkAccountSelection`: an empty id on a single-account platform
    // auto-resolves and publishes fine, so the card must not flag it.
    const empty = makePost({ social_account_id: '' })
    expect(hasVisibleProblem(empty, resolved)).toBe(false)
    expect(
      hasVisibleProblem(empty, { ambiguous: true, mismatched: false }),
    ).toBe(true)
    // A chosen account the platform no longer has.
    expect(
      hasVisibleProblem(makePost({ social_account_id: 'gone' }), {
        ambiguous: false,
        mismatched: true,
      }),
    ).toBe(true)
  })

  it('reads only the post row — no attachments, no server rules', () => {
    // The guarantee the calendar leans on: hundreds of cards, zero extra
    // requests. A post whose *only* fault needs those fetches stays clean.
    expect(
      hasVisibleProblem(makePost({ content: '', media_urls: [] }), resolved),
    ).toBe(false)
  })
})
