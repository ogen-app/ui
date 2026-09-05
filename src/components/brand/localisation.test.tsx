import { render, screen } from '@testing-library/react'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { i18next, loadLocaleResources } from '@/i18n'
import type { Campaign } from '@/types/campaigns'
import type { Post } from '@/types/posts'
import type { BrandData, BrandVoice } from './types'

/**
 * The binding pickers in a language that is not English.
 *
 * The point of the conversion, asserted the only way it can honestly be: by
 * rendering in Spanish and reading what comes out. Every other test on these
 * components would run in English, where a literal left in a component and a
 * catalogue entry are indistinguishable — this is the one that can tell them
 * apart, which is why it also asserts that the English words that *used* to be
 * literals are gone.
 *
 * Spanish is gated off in `i18n/config.ts` and this does not care: the gate is
 * on the entry points that *choose* a locale, never on `setLocale` or on
 * i18next itself, which is exactly so the machinery stays exercised while
 * nothing but English ships.
 *
 * Only these two components are covered, because only these two are converted.
 * The eleven Brand library screens are still hard-coded English (see the
 * `brand-materials` flag's note) and a test asserting Spanish on them would
 * fail for the honest reason.
 */

const VOICE: BrandVoice = {
  id: 'v1',
  name: 'Voz de casa',
  whenToUse: 'Casi siempre',
  summary: '',
  isDefault: true,
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
}

const BRAND: BrandData = {
  voices: [VOICE],
  audiences: [],
  guardrails: null,
  look: null,
  templates: [],
}

const EMPTY_BRAND: BrandData = { ...BRAND, voices: [] }

const CAMPAIGN = {
  id: 'c1',
  brand_voice_id: 'v1',
  brand_audience_id: null,
} as unknown as Campaign

const POST = {
  id: 'po1',
  campaign_id: 'c1',
  brand_voice_id: null,
  brand_audience_id: null,
} as unknown as Post

const brandQuery = vi.fn()
const campaignQuery = vi.fn()

vi.mock('@/hooks/useBrand', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/hooks/useBrand')>()
  return {
    ...actual,
    useBrand: () => brandQuery(),
    useSetPostBrand: () => ({ mutate: vi.fn() }),
  }
})

vi.mock('@/hooks/useCampaigns', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/hooks/useCampaigns')>()
  return {
    ...actual,
    useCampaign: () => campaignQuery(),
    useUpdateCampaign: () => ({ mutate: vi.fn() }),
  }
})

const { PostBrandSection } = await import('./PostBrandSection')

beforeAll(async () => {
  await loadLocaleResources('es')
  await i18next.changeLanguage('es')
})

afterAll(async () => {
  await i18next.changeLanguage('en')
})

describe('the post binding section in Spanish', () => {
  it('labels both pickers from the catalogue', () => {
    brandQuery.mockReturnValue({ data: BRAND, isLoading: false })
    campaignQuery.mockReturnValue({ data: CAMPAIGN })

    render(<PostBrandSection post={POST} />)

    expect(screen.getByText('Voz')).toBeInTheDocument()
    expect(screen.getByText('Audiencia')).toBeInTheDocument()
    expect(screen.queryByText('Voice')).not.toBeInTheDocument()
    expect(screen.queryByText('Audience')).not.toBeInTheDocument()
  })

  /**
   * The source line is the string this section exists to show — it is what
   * stops an inherited voice reading as no voice — so it is the one worth
   * asserting comes from the catalogue rather than from `SOURCE_LINE`, which
   * now holds keys instead of sentences for exactly this reason.
   */
  it('says which level supplied the voice, in Spanish', () => {
    brandQuery.mockReturnValue({ data: BRAND, isLoading: false })
    campaignQuery.mockReturnValue({ data: CAMPAIGN })

    render(<PostBrandSection post={POST} />)

    expect(screen.getByText('De la campaña')).toBeInTheDocument()
    expect(screen.queryByText('From the campaign')).not.toBeInTheDocument()
  })

  it('says a workspace with no material has none, in Spanish', () => {
    brandQuery.mockReturnValue({ data: EMPTY_BRAND, isLoading: false })
    campaignQuery.mockReturnValue({ data: CAMPAIGN })

    render(<PostBrandSection post={POST} />)

    expect(
      screen.getByText(
        'Este espacio de trabajo aún no tiene voces ni audiencias.',
      ),
    ).toBeInTheDocument()
  })
})
