import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  canBeAutomatic,
  effectivePostType,
  isAutoPostType,
  postShape,
  resolveAutoPostType,
  type AutoResolution,
} from './postTypeAuto'
import { getAllowedNextStatuses } from '@/lib/postStatusMachine'
import type { PostTypeRuleView, ResolvedPostTypeRule } from '@/types/validation'

vi.mock('@/config/featureFlags', () => ({
  isFeatureEnabled: vi.fn(() => false),
}))

const { isFeatureEnabled } = await import('@/config/featureFlags')

afterEach(() => {
  vi.mocked(isFeatureEnabled).mockReturnValue(false)
})

function rule(over: Partial<ResolvedPostTypeRule> = {}): ResolvedPostTypeRule {
  return {
    requires_content: false,
    allowed_kinds: [],
    min_attachments: 0,
    max_attachments: null,
    max_content_chars: null,
    ...over,
  }
}

function view(
  slug: string,
  r: ResolvedPostTypeRule | null = rule(),
): PostTypeRuleView {
  return { slug, label: slug, whitelist_only: r === null, rule: r }
}

function files(...mimes: string[]) {
  return mimes.map((mime_type) => ({ mime_type }))
}

/** X, roughly as the platform row seeds it. */
const X_RULES: PostTypeRuleView[] = [
  view('text-post', rule({ max_attachments: 0, max_content_chars: 280 })),
  view(
    'image-post',
    rule({
      allowed_kinds: ['image'],
      min_attachments: 1,
      max_attachments: 4,
      max_content_chars: 280,
    }),
  ),
  view(
    'video',
    rule({
      allowed_kinds: ['video'],
      min_attachments: 1,
      max_attachments: 1,
      max_content_chars: 280,
    }),
  ),
  view(
    'thread',
    rule({ allowed_kinds: ['image', 'video'], max_content_chars: 280 }),
  ),
]

const X_SLUGS = ['text-post', 'image-post', 'video', 'thread']

function onX(
  content: string,
  attachments: { mime_type: string }[] = [],
  candidates = X_SLUGS,
): AutoResolution {
  return resolveAutoPostType({
    content,
    attachments,
    candidates,
    rules: X_RULES,
    zernioId: 'twitter',
  })
}

describe('postShape', () => {
  it('measures the flattened body, not the Markdown', () => {
    // `**` and `## ` never reach the platform, so counting them would escalate
    // a post that is nowhere near the ceiling.
    expect(postShape('## Hi **there**', []).chars).toBe(
      postShape('Hi there', []).chars,
    )
  })

  it('reduces the attachments to their distinct kinds and a count', () => {
    const shape = postShape('', files('image/png', 'image/jpeg', 'video/mp4'))
    expect(shape.kinds.sort()).toEqual(['image', 'video'])
    expect(shape.count).toBe(3)
  })
})

describe('the ladder', () => {
  it('reads a short body with nothing attached as a text post', () => {
    expect(onX('a'.repeat(100))).toEqual({
      state: 'resolved',
      slug: 'text-post',
    })
  })

  it('escalates to an image post the moment a picture is attached', () => {
    // The whole point of Auto: the author attached a file, not a post type.
    expect(onX('a'.repeat(100), files('image/png'))).toEqual({
      state: 'resolved',
      slug: 'image-post',
    })
  })

  it('takes the loosest rung that fits, not the tightest', () => {
    // An empty post is a text post, not an image post waiting for its image:
    // the walk stops at the first rung whose rule the post already satisfies.
    expect(onX('')).toEqual({ state: 'resolved', slug: 'text-post' })
  })

  it('prefers the plain video type where a platform offers more than one', () => {
    const rules = [
      ...X_RULES,
      view(
        'reel',
        rule({
          allowed_kinds: ['video'],
          min_attachments: 1,
          max_attachments: 1,
        }),
      ),
    ]
    const resolution = resolveAutoPostType({
      content: 'Watch',
      attachments: files('video/mp4'),
      candidates: [...X_SLUGS, 'reel'],
      rules,
      zernioId: 'twitter',
    })
    expect(resolution).toEqual({ state: 'resolved', slug: 'video' })
  })

  it('reaches the short form when it is the only video rung offered', () => {
    // YouTube and Instagram: `video` is never a candidate there, so the rung
    // below it takes the post rather than nothing does.
    const rules = [
      view(
        'reel',
        rule({
          allowed_kinds: ['video'],
          min_attachments: 1,
          max_attachments: 1,
        }),
      ),
      view(
        'image-post',
        rule({ allowed_kinds: ['image'], min_attachments: 1 }),
      ),
    ]
    const resolution = resolveAutoPostType({
      content: '',
      attachments: files('video/mp4'),
      candidates: ['reel', 'image-post'],
      rules,
      zernioId: 'instagram',
    })
    expect(resolution).toEqual({ state: 'resolved', slug: 'reel' })
  })

  it('never chooses a format the content cannot imply', () => {
    // Story, Article and Link post are editorial decisions. Offering them as
    // the only candidates leaves Auto with nothing rather than guessing.
    const rules = [view('article'), view('story'), view('link-post')]
    expect(
      resolveAutoPostType({
        content: 'Words',
        attachments: [],
        candidates: ['article', 'story', 'link-post'],
        rules,
        zernioId: 'linkedin',
      }),
    ).toEqual({ state: 'unfit', reason: 'no-candidates', limit: null })
  })

  it('never chooses a type Ogen enforces no rules for', () => {
    // `whitelist_only` means "we have no idea what this needs", and "we have no
    // idea" is the one answer Auto must not give.
    expect(
      resolveAutoPostType({
        content: 'Words',
        attachments: [],
        candidates: ['text-post'],
        rules: [view('text-post', null)],
        zernioId: 'twitter',
      }),
    ).toEqual({ state: 'unfit', reason: 'no-candidates', limit: null })
  })

  it('is bounded by what the campaign enables, not by what the platform can do', () => {
    // A campaign that was never told about image posts did not ask for one, so
    // X offering the type does not make it an answer. The verdict is about the
    // attachment rather than the count: the one enabled rung takes no files at
    // all, which is a fact about the kind and not about how many.
    expect(onX('Hello', files('image/png'), ['text-post'])).toEqual({
      state: 'unfit',
      reason: 'media-kind',
      limit: null,
    })
  })

  it('holds its verdict while the rules are in flight', () => {
    // A resolution that flickered through "nothing fits" on every page load
    // would put a red row under an editor that is merely still loading.
    expect(
      resolveAutoPostType({
        content: 'Hello',
        attachments: [],
        candidates: X_SLUGS,
        rules: undefined,
        zernioId: 'twitter',
      }),
    ).toEqual({ state: 'pending' })
  })
})

describe('a chain', () => {
  it('is not an answer while a thread still publishes as one post', () => {
    // X has offered `thread` all along, and until the submit path sends
    // `threadItems` the whole body goes out as a single post (CON-196). So
    // resolving to it would quietly publish a truncated post.
    expect(onX('a'.repeat(3000), files('image/png', 'image/png'))).toEqual({
      state: 'unfit',
      reason: 'too-long',
      limit: 280,
    })
  })

  it('takes a body no single post can hold, once it really splits', () => {
    vi.mocked(isFeatureEnabled).mockReturnValue(true)

    expect(onX('a'.repeat(3000), files('image/png', 'image/png'))).toEqual({
      state: 'resolved',
      slug: 'thread',
    })
  })

  it('still loses to a post that fits in one', () => {
    vi.mocked(isFeatureEnabled).mockReturnValue(true)

    // `thread` is last on the ladder for this reason: a chain is the answer to
    // a body no single post can hold, and a hundred characters is not that.
    expect(onX('a'.repeat(100))).toEqual({
      state: 'resolved',
      slug: 'text-post',
    })
  })

  it('is not offered on a network that has no chain', () => {
    vi.mocked(isFeatureEnabled).mockReturnValue(true)

    const resolution = resolveAutoPostType({
      content: 'a'.repeat(3000),
      attachments: [],
      candidates: ['text-post', 'thread'],
      rules: X_RULES,
      zernioId: 'linkedin',
    })
    expect(resolution).toEqual({
      state: 'unfit',
      reason: 'too-long',
      limit: 280,
    })
  })
})

describe('when nothing fits', () => {
  it('quotes the longest body any candidate would have taken', () => {
    // The number the author has to get under. An unbounded candidate would
    // have fitted, so there is always one to quote here.
    expect(onX('a'.repeat(5000))).toEqual({
      state: 'unfit',
      reason: 'too-long',
      limit: 280,
    })
  })

  it('says so when the platform publishes nothing of that kind', () => {
    // A PDF on X: no rung takes it, and no amount of editing the body will
    // change that — a different sentence from "too long".
    expect(onX('Hello', files('application/pdf'))).toEqual({
      state: 'unfit',
      reason: 'media-kind',
      limit: null,
    })
  })

  it('separates too many files from the wrong kind of file', () => {
    expect(
      onX(
        'Hi',
        files('image/png', 'image/png', 'image/png', 'image/png', 'image/png'),
      ),
    ).toEqual({ state: 'unfit', reason: 'too-many', limit: null })
  })
})

describe('effectivePostType', () => {
  it('leaves a pinned post exactly as it is', () => {
    // Choosing a type is what pinning means, and a pinned post must behave
    // precisely as it did before this module existed.
    expect(
      effectivePostType('carousel', { state: 'resolved', slug: 'video' }),
    ).toBe('carousel')
  })

  it('answers with the resolution for an automatic post', () => {
    expect(
      effectivePostType('', { state: 'resolved', slug: 'image-post' }),
    ).toBe('image-post')
  })

  it('falls back to the empty slug while pending or unfit', () => {
    // Which is the value every reader in the app already handles — it is what
    // an unset post type has always been.
    expect(effectivePostType('', { state: 'pending' })).toBe('')
    expect(
      effectivePostType('', { state: 'unfit', reason: 'too-long', limit: 280 }),
    ).toBe('')
  })
})

describe('isAutoPostType', () => {
  it('is the empty slug a new post is already created with', () => {
    expect(isAutoPostType('')).toBe(true)
    expect(isAutoPostType('text-post')).toBe(false)
  })
})

describe('canBeAutomatic', () => {
  // The server's `requirePlatformIfNotDraft` is the whole rule: it refuses a
  // PUT carrying an empty post type under every status but `draft`. A post that
  // left drafting still automatic could not be saved again at all — which is
  // how this was found, as a rejected autosave on a manually-scheduled post.
  it('is a draft, and nothing else', () => {
    expect(canBeAutomatic('draft')).toBe(true)
    for (const status of [
      'ready_for_publish',
      'scheduled',
      'scheduled_for_manual_publishing',
      'published',
      'failed',
      'not_published',
    ] as const) {
      expect(canBeAutomatic(status)).toBe(false)
    }
  })

  // Both halves of the feature read this one predicate, in opposite
  // directions: the picker asks about the status the post is *in*, and the
  // pinning call site about the one it is moving *to*. The manual-publish
  // SCHEDULE is the edge that made the difference — a plain status PUT, unlike
  // its auto-publish twin, and so not covered by pinning "on schedule".
  it('names every edge that has to pin the resolution', () => {
    expect(
      getAllowedNextStatuses('draft').filter((s) => !canBeAutomatic(s)),
    ).toEqual(['ready_for_publish'])
    expect(
      getAllowedNextStatuses('ready_for_publish').filter(
        (s) => !canBeAutomatic(s),
      ),
    ).toEqual(['scheduled', 'scheduled_for_manual_publishing'])
  })
})
