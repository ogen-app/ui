import { describe, expect, it } from 'vitest'
import {
  EMPTY_CAMPAIGN_BRAND,
  EMPTY_POST_BRAND,
  castOf,
  resolveAudience,
  resolveVoice,
} from './binding'
import type { BrandAudience, BrandData, BrandVoice } from './types'

function voice(id: string, over: Partial<BrandVoice> = {}): BrandVoice {
  return {
    id,
    name: id,
    whenToUse: '',
    summary: '',
    isDefault: false,
    usage: { drafts: 0, published: 0 },
    samples: [],
    rules: {
      emoji: 'never',
      hashtags: 'never',
      formality: 'neutral',
      person: 'we',
      length: 'medium',
      opening: '',
      closing: '',
    },
    channelNotes: {},
    origin: { kind: 'blank' },
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...over,
  }
}

function audience(
  id: string,
  over: Partial<BrandAudience> = {},
): BrandAudience {
  return {
    id,
    name: id,
    who: '',
    summary: '',
    usage: { drafts: 0, published: 0 },
    readsOn: '',
    scrollsPastWhen: '',
    believesWhen: '',
    origin: { kind: 'blank' },
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...over,
  }
}

function brandWith(over: Partial<BrandData> = {}): BrandData {
  return {
    voices: [],
    audiences: [],
    guardrails: null,
    look: null,
    templates: [],
    ...over,
  }
}

describe('castOf', () => {
  it('keeps the order the voices were picked in, not the library order', () => {
    const brand = brandWith({ voices: [voice('a'), voice('b'), voice('c')] })
    const cast = castOf(brand, {
      ...EMPTY_CAMPAIGN_BRAND,
      voiceIds: ['c', 'a'],
    })
    expect(cast.map((v) => v.id)).toEqual(['c', 'a'])
  })

  it('drops a reference to a deleted voice rather than reporting a gap', () => {
    const brand = brandWith({ voices: [voice('a')] })
    const cast = castOf(brand, {
      ...EMPTY_CAMPAIGN_BRAND,
      voiceIds: ['a', 'gone'],
    })
    expect(cast.map((v) => v.id)).toEqual(['a'])
  })
})

describe('resolveVoice', () => {
  const brand = brandWith({
    voices: [
      voice('house', { isDefault: true }),
      voice('friday'),
      voice('formal'),
    ],
  })

  it('takes the post’s own choice first, and says so', () => {
    const got = resolveVoice(
      brand,
      { voiceIds: ['friday'], defaultVoiceId: 'friday', audienceId: null },
      { voice: { id: 'formal', delta: null }, audienceId: null },
    )
    expect(got.voice?.id).toBe('formal')
    expect(got.source).toBe('post')
  })

  it('falls back to the campaign default when the post has not chosen', () => {
    const got = resolveVoice(
      brand,
      {
        voiceIds: ['friday', 'formal'],
        defaultVoiceId: 'friday',
        audienceId: null,
      },
      EMPTY_POST_BRAND,
    )
    expect(got.voice?.id).toBe('friday')
    expect(got.source).toBe('campaign')
  })

  it('treats a cast of one as the campaign’s default even unstated', () => {
    const got = resolveVoice(
      brand,
      { voiceIds: ['formal'], defaultVoiceId: null, audienceId: null },
      EMPTY_POST_BRAND,
    )
    expect(got.voice?.id).toBe('formal')
    expect(got.source).toBe('campaign')
  })

  it('hands a cast of two with no stated default to the library', () => {
    const got = resolveVoice(
      brand,
      {
        voiceIds: ['friday', 'formal'],
        defaultVoiceId: null,
        audienceId: null,
      },
      EMPTY_POST_BRAND,
    )
    expect(got.voice?.id).toBe('house')
    expect(got.source).toBe('library')
  })

  it('falls through a campaign pointing at a deleted voice', () => {
    const got = resolveVoice(
      brand,
      { voiceIds: [], defaultVoiceId: 'gone', audienceId: null },
      EMPTY_POST_BRAND,
    )
    expect(got.voice?.id).toBe('house')
    expect(got.source).toBe('library')
  })

  it('resolves to nothing when the library is empty', () => {
    const got = resolveVoice(
      brandWith(),
      EMPTY_CAMPAIGN_BRAND,
      EMPTY_POST_BRAND,
    )
    expect(got.voice).toBeNull()
    expect(got.source).toBe('none')
  })

  it('keeps a delta that names no voice, as the post’s own', () => {
    const got = resolveVoice(brandWith(), EMPTY_CAMPAIGN_BRAND, {
      voice: { id: null, delta: 'Drier than usual.' },
      audienceId: null,
    })
    expect(got.voice).toBeNull()
    expect(got.delta).toBe('Drier than usual.')
    expect(got.source).toBe('post')
  })

  it('carries the post’s delta over an inherited voice', () => {
    const got = resolveVoice(
      brand,
      { voiceIds: ['friday'], defaultVoiceId: 'friday', audienceId: null },
      { voice: { id: null, delta: 'Shorter.' }, audienceId: null },
    )
    // The delta is the post's, the voice is the campaign's — the two levels do
    // not have to agree on where they came from.
    expect(got.delta).toBe('Shorter.')
  })

  it('marks a voice edited after the post was written as stale', () => {
    const edited = brandWith({
      voices: [
        voice('house', {
          isDefault: true,
          updatedAt: '2026-03-01T00:00:00.000Z',
        }),
      ],
    })
    const got = resolveVoice(
      edited,
      EMPTY_CAMPAIGN_BRAND,
      EMPTY_POST_BRAND,
      '2026-02-01T00:00:00.000Z',
    )
    expect(got.stale).toBe(true)
  })

  it('is not stale when the post is the newer of the two', () => {
    const got = resolveVoice(
      brand,
      EMPTY_CAMPAIGN_BRAND,
      EMPTY_POST_BRAND,
      '2026-06-01T00:00:00.000Z',
    )
    expect(got.stale).toBe(false)
  })

  it('claims nothing about staleness without the post’s date', () => {
    const edited = brandWith({
      voices: [
        voice('house', {
          isDefault: true,
          updatedAt: '2099-01-01T00:00:00.000Z',
        }),
      ],
    })
    expect(
      resolveVoice(edited, EMPTY_CAMPAIGN_BRAND, EMPTY_POST_BRAND).stale,
    ).toBe(false)
  })
})

describe('resolveAudience', () => {
  const brand = brandWith({
    audiences: [audience('founders'), audience('cfos')],
  })

  it('prefers the post’s override', () => {
    const got = resolveAudience(
      brand,
      { ...EMPTY_CAMPAIGN_BRAND, audienceId: 'founders' },
      { voice: null, audienceId: 'cfos' },
    )
    expect(got.audience?.id).toBe('cfos')
    expect(got.source).toBe('post')
  })

  it('inherits the campaign’s otherwise', () => {
    const got = resolveAudience(
      brand,
      { ...EMPTY_CAMPAIGN_BRAND, audienceId: 'cfos' },
      EMPTY_POST_BRAND,
    )
    expect(got.audience?.id).toBe('cfos')
    expect(got.source).toBe('campaign')
  })

  // The asymmetry with `resolveVoice`, asserted so it cannot be reintroduced by
  // accident: a full library and nobody having chosen still resolves to nobody,
  // because the workspace step is voices-only. See CON-245 §5.
  it('has no library fallback — a campaign that has chosen nobody writes to nobody', () => {
    const got = resolveAudience(brand, EMPTY_CAMPAIGN_BRAND, EMPTY_POST_BRAND)
    expect(got.audience).toBeNull()
    expect(got.source).toBe('none')
  })
})
