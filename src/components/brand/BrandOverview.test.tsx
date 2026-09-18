import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { i18next } from '@/i18n'
import { brandSectionCopy, SHOWN_BRAND_SECTIONS } from '@/lib/brandSections'
import { BrandOverview } from './BrandOverview'
import type { BrandData, BrandVoice } from './types'
import type { Asset } from '@/types/content'

/**
 * The hub with one of its two queries missing.
 *
 * This is the case the screen used to get wrong, and it is worth a test rather
 * than a look at it because *nothing on the page says so*: it renders exactly
 * the placeholder it renders while a fetch is in flight, and the way you find
 * out that the fetch is never going to land is by waiting for a while and
 * noticing that it hasn't. `data && assets ? … : { isPending: true }` collapsed
 * "not here yet" and "not coming" into one state, so a document library that
 * answered 404 hid five cards' worth of voices, audiences, guardrails and facts
 * that had arrived intact. See `lib/fetched`.
 */

const VOICE: BrandVoice = {
  id: 'v1',
  name: 'Sharp and opinionated',
  whenToUse: '',
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

const ASSET = {
  id: 'a1',
  name: 'Pricing one-pager',
  kind: 'pdf',
  status: 'ready',
} as unknown as Asset

const unreadable = () => i18next.t('brand.overview.unreadable')
const label = (id: 'sources' | 'voices') =>
  brandSectionCopy(i18next.t, id).label

const skeletons = () =>
  document.querySelectorAll('[data-slot="skeleton"]').length

describe('the Foundation hub', () => {
  it('draws the five written sections while Sources is still coming', () => {
    render(
      <BrandOverview
        brand={{ status: 'ready', data: BRAND }}
        sources={{ status: 'pending' }}
      />,
    )

    expect(screen.getByText(VOICE.name)).toBeInTheDocument()
    expect(screen.getByText(label('sources'))).toBeInTheDocument()
    // Card-sized, not screen-sized: the placeholder is inside the one card
    // that is waiting.
    expect(skeletons()).toBeGreaterThan(0)
    expect(screen.queryByText(unreadable())).not.toBeInTheDocument()
  })

  it('keeps them when Sources fails, and says so in that card only', () => {
    render(
      <BrandOverview
        brand={{ status: 'ready', data: BRAND }}
        sources={{ status: 'error' }}
      />,
    )

    expect(screen.getByText(VOICE.name)).toBeInTheDocument()
    expect(screen.getAllByText(unreadable())).toHaveLength(1)
    expect(skeletons()).toBe(0)
  })

  it('draws Sources when it is the brand that failed', () => {
    render(
      <BrandOverview
        brand={{ status: 'error' }}
        sources={{ status: 'ready', data: [ASSET] }}
      />,
    )

    // One line per card that shares the failed query, and the sixth card —
    // fed by the other one — is unaffected.
    expect(screen.getAllByText(unreadable())).toHaveLength(
      SHOWN_BRAND_SECTIONS.length - 1,
    )
    expect(screen.getByText(label('sources'))).toBeInTheDocument()
    expect(screen.getByText('1')).toBeInTheDocument()
  })

  it('does not offer to write a brand from scratch when it could not read one', () => {
    render(
      <BrandOverview
        brand={{ status: 'error' }}
        sources={{ status: 'ready', data: [] }}
      />,
    )

    // `FirstRun`'s own heading. An unread brand is not an empty one, and the
    // takeover would be answering a question the fetch never asked.
    expect(
      screen.queryByText(i18next.t('brand.firstRun.title')),
    ).not.toBeInTheDocument()
    expect(screen.getByText(label('voices'))).toBeInTheDocument()
  })

  it('waits as a whole page while the brand itself is in flight', () => {
    render(
      <BrandOverview
        brand={{ status: 'pending' }}
        sources={{ status: 'ready', data: [ASSET] }}
      />,
    )

    // The one query that decides *which screen this is* — six labelled cards
    // appearing for a moment before the first-run takeover replaces them is
    // worse than a placeholder that promises nothing.
    expect(screen.queryByText(label('sources'))).not.toBeInTheDocument()
    expect(skeletons()).toBeGreaterThan(0)
  })
})
