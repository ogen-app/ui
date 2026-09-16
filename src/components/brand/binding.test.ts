import { describe, expect, it } from 'vitest'
import {
  EMPTY_CAMPAIGN_BRAND,
  EMPTY_POST_BRAND,
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
      { voiceId: 'friday', audienceId: null },
      { voiceId: 'formal', audienceId: null },
    )
    expect(got.voice?.id).toBe('formal')
    expect(got.source).toBe('post')
  })

  it('falls back to the campaign’s when the post has not chosen', () => {
    const got = resolveVoice(
      brand,
      { voiceId: 'friday', audienceId: null },
      EMPTY_POST_BRAND,
    )
    expect(got.voice?.id).toBe('friday')
    expect(got.source).toBe('campaign')
  })

  it('falls back to the library’s default when neither has chosen', () => {
    const got = resolveVoice(brand, EMPTY_CAMPAIGN_BRAND, EMPTY_POST_BRAND)
    expect(got.voice?.id).toBe('house')
    expect(got.source).toBe('library')
  })

  // Both levels fall *through* a dead reference rather than resolving to
  // nothing. The server never sees this state — its FKs are ON DELETE SET NULL
  // — so this is the window between a voice being deleted and the campaign or
  // post being refetched, and behaving like "never chose" is what keeps that
  // window from reading as a broken campaign.
  it('falls through a campaign pointing at a deleted voice', () => {
    const got = resolveVoice(
      brand,
      { voiceId: 'gone', audienceId: null },
      EMPTY_POST_BRAND,
    )
    expect(got.voice?.id).toBe('house')
    expect(got.source).toBe('library')
  })

  it('falls through a post pointing at a deleted voice, to the campaign', () => {
    const got = resolveVoice(
      brand,
      { voiceId: 'friday', audienceId: null },
      { voiceId: 'gone', audienceId: null },
    )
    expect(got.voice?.id).toBe('friday')
    expect(got.source).toBe('campaign')
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

  it('resolves to nothing when a library with voices has no default', () => {
    const got = resolveVoice(
      brandWith({ voices: [voice('friday'), voice('formal')] }),
      EMPTY_CAMPAIGN_BRAND,
      EMPTY_POST_BRAND,
    )
    expect(got.voice).toBeNull()
    expect(got.source).toBe('none')
  })

  // The pin is the whole point of an override: a post that names the same
  // voice its campaign happens to name today is *not* in the same state as one
  // that inherited it, and only the first survives the campaign moving on.
  it('reports a post pinned to the campaign’s own voice as the post’s', () => {
    const got = resolveVoice(
      brand,
      { voiceId: 'friday', audienceId: null },
      { voiceId: 'friday', audienceId: null },
    )
    expect(got.voice?.id).toBe('friday')
    expect(got.source).toBe('post')
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
      { voiceId: null, audienceId: 'cfos' },
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
