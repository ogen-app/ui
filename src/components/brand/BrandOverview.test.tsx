import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { i18next } from '@/i18n'
import { brandSectionCopy, SHOWN_BRAND_SECTIONS } from '@/lib/brandSections'
import { BrandOverview } from './BrandOverview'
import type { BrandData, BrandVoice } from './types'

/**
 * The hub with its query missing, in the two ways it can be.
 *
 * This is the case the screen used to get wrong, and it is worth a test rather
 * than a look at it because *nothing on the page says so*: a fetch that is
 * never going to land renders exactly the placeholder a fetch in flight
 * renders, and the way you find out is by waiting for a while and noticing that
 * it hasn't. `data ? … : { isPending: true }` collapsed "not here yet" and "not
 * coming" into one state, so a library that answered 404 hid the cards' worth of
 * voices, audiences and guardrails behind a wait with no end. See
 * `lib/fetched`.
 *
 * The documents were the second query that made it visible, and they are their
 * own module now (`/assets`). The distinction outlives them: what this screen
 * shows is decided by the fetch's state rather than by the absence of data, and
 * an unread brand must not be read as an empty one.
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

const unreadable = () => i18next.t('brand.overview.unreadable')
const label = (id: 'voices') => brandSectionCopy(i18next.t, id).label

const skeletons = () =>
  document.querySelectorAll('[data-slot="skeleton"]').length

describe('the Foundation hub', () => {
  it('draws the sections it was given', () => {
    render(<BrandOverview brand={{ status: 'ready', data: BRAND }} />)

    expect(screen.getByText(VOICE.name)).toBeInTheDocument()
    expect(screen.queryByText(unreadable())).not.toBeInTheDocument()
    expect(skeletons()).toBe(0)
  })

  it('admits the failure card by card rather than as a page', () => {
    render(<BrandOverview brand={{ status: 'error' }} />)

    // One line per card, and every card keeps its heading and its caret: the
    // screen behind the door fetches for itself and is the only place anything
    // can be done about it.
    expect(screen.getAllByText(unreadable())).toHaveLength(
      SHOWN_BRAND_SECTIONS.length,
    )
    expect(skeletons()).toBe(0)
  })

  it('is the same screen for a workspace with nothing in it', () => {
    render(
      <BrandOverview
        brand={{
          status: 'ready',
          data: { ...BRAND, voices: [] },
        }}
      />,
    )

    // There is no first-run takeover any more. An empty brand lands on the hub
    // with its cards openable, rather than on a screen whose one working
    // control is a door to this one.
    expect(screen.getByText(label('voices'))).toBeInTheDocument()
    expect(
      screen.getByText(i18next.t('brand.shell.offer.title')),
    ).toBeInTheDocument()
  })

  it('waits as a whole page while the brand itself is in flight', () => {
    render(<BrandOverview brand={{ status: 'pending' }} />)

    // Its five sections are one fetch, so no card here could have drawn
    // sooner, and six cards of skeleton rows is a busier way of saying the
    // same nothing.
    expect(screen.queryByText(label('voices'))).not.toBeInTheDocument()
    expect(skeletons()).toBeGreaterThan(0)
  })
})
