import { render, screen } from '@testing-library/react'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { i18next, loadLocaleResources } from '@/i18n'
import { brandSectionCopy } from '@/lib/brandSections'
import type { Campaign } from '@/types/campaigns'
import type { Post } from '@/types/posts'
import {
  VoicesSection,
  voiceStarterDraft,
  VOICE_STARTERS,
} from './VoicesSection'
import type { BrandData, BrandVoice } from './types'

/**
 * Brand in a language that is not English.
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
 * **It used to cover the two binding pickers and say so**, because they were
 * the only converted components in the module and a test asserting Spanish on
 * the rest would have failed for the honest reason. The library screens are
 * converted now, and the cases below are chosen for the four shapes that break
 * differently rather than for coverage of every string:
 *
 * - a **section's own words**, which moved off `BRAND_SECTIONS` into the
 *   catalogue — the case a module-level `const` would fail;
 * - a **pure function that produces words** (`format.ts`, `rulesLine`), which
 *   only works because it takes `t` rather than closing over a label map;
 * - a **starter's draft**, which is material the workspace keeps — the case
 *   where an untranslated string is not merely displayed but saved;
 * - a **plural with a count**, which is the shape a fragment-splicing helper
 *   used to get wrong.
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

describe('the voices library in Spanish', () => {
  /**
   * The card's foot is three pure functions' output in a row — `rulesLine`,
   * `sampleCount` and `usageLine` — and all three used to hold English in a
   * module-level table or a template literal. Asserting one string from each
   * is what proves the `t`-as-first-argument rule is actually being followed
   * rather than merely declared.
   */
  it('describes a voice from the catalogue, not from a frozen label map', () => {
    render(<VoicesSection voices={[VOICE]} />)

    // `rulesLine`: five enums, none of which is printed raw any more.
    expect(screen.getByText(/neutra, nosotros, sin emojis/)).toBeInTheDocument()
    expect(screen.queryByText(/neutral, we, no emoji/)).not.toBeInTheDocument()

    // `sampleCount` + `usageLine`, joined by the catalogue's own separator.
    expect(screen.getByText(/sin ejemplos, nunca usada/)).toBeInTheDocument()
    expect(screen.queryByText(/no samples, never used/)).not.toBeInTheDocument()
  })

  it('offers the starters in Spanish', () => {
    render(<VoicesSection voices={[]} />)

    expect(screen.getByText('Clara y directa')).toBeInTheDocument()
    expect(screen.getByText('ESCRIBIR UNA DESDE CERO')).toBeInTheDocument()
    expect(screen.queryByText('Plain and direct')).not.toBeInTheDocument()
    expect(screen.queryByText('WRITE ONE FROM SCRATCH')).not.toBeInTheDocument()
  })

  /**
   * The one case where an untranslated string would be *saved* rather than
   * merely displayed: forking a starter writes its name, its use and its two
   * prose habits into the workspace's own library. A Spanish workspace handed
   * the English draft has been given material it must rewrite before it can
   * use it, and nothing on screen would say so.
   */
  it("hands a fork the starter's draft in Spanish", () => {
    const draft = voiceStarterDraft(i18next.t, VOICE_STARTERS[0])

    expect(draft.name).toBe('Clara y directa')
    expect(draft.rules.opening).toBe('Dice a qué viene en la primera frase.')
    // The enums ride through untranslated — they are stored values, not words.
    expect(draft.rules.formality).toBe('neutral')
  })
})

describe('the section table in Spanish', () => {
  /**
   * `BRAND_SECTIONS` carried these three strings inline until the conversion,
   * which made it a module-level constant holding copy — evaluated once at
   * import, so the first language loaded was the one every workspace got
   * thereafter. This is the assertion that would have failed then and passes
   * now for a reason rather than by accident.
   */
  it('names a section from the catalogue rather than from the table', () => {
    const copy = brandSectionCopy(i18next.t, 'guardrails')

    expect(copy.label).toBe('Límites')
    expect(copy.whenEmpty).toMatch(/Nada está prohibido/)
    expect(copy.description).not.toMatch(/What is true/)
  })
})

describe('counted facts in Spanish', () => {
  /**
   * The shape a fragment-splicing helper used to get wrong: the English chose
   * between `post was` and `posts were` in code, which is a rule about English
   * grammar living in a component. Each form is now a whole sentence in the
   * catalogue, and the plural is i18next's to pick.
   */
  it('picks the plural form from the catalogue', () => {
    expect(i18next.t('brand.facts.samples', { count: 1 })).toBe('1 ejemplo')
    expect(i18next.t('brand.facts.samples', { count: 4 })).toBe('4 ejemplos')
    expect(
      i18next.t('brand.voices.editor.deleteCostPublished', { count: 1 }),
    ).toMatch(/^Se escribió 1 publicación publicada/)
    expect(
      i18next.t('brand.voices.editor.deleteCostPublished', { count: 3 }),
    ).toMatch(/^Se escribieron 3 publicaciones publicadas/)
  })
})
