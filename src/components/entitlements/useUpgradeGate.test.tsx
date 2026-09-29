import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, render, renderHook, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { i18next, loadLocaleResources } from '@/i18n'
import { DEFAULT_LOCALE } from '@/i18n/config'
import { UpgradeDialog } from './UpgradeDialog'
import { useUpgradeGate } from './useUpgradeGate'
import type { Entitlement } from '@/types/entitlements'
import type { Tier } from '@/types/tiers'

/**
 * The *sell* half of the gating seam (CON-232), asserted at the two places it
 * can go quietly wrong.
 *
 * The first is the pending answer. A plan that has not arrived is not a
 * refusal, and the failure mode is invisible in a screenshot — everything looks
 * right, and a paying customer is shown an upgrade wall because a request was
 * in flight. The second is what happens to the user's work: `intent` reports
 * whether it ran so the composer can keep a draft it was about to throw away,
 * and nothing about that shows up in a render.
 */

const answer = vi.hoisted(() => ({ current: null as Entitlement | null }))

/** The plan the workspace holds — the dialog waits for it before offering. */
const held = vi.hoisted(() => ({ current: null as unknown }))
vi.mock('@/hooks/useEntitlements', () => ({
  useEntitlement: () => answer.current,
  useWorkspacePlan: () => ({ data: held.current }),
}))

/** Who is reading — the half of this the plan itself cannot answer. */
const owner = vi.hoisted(() => ({ current: true }))
vi.mock('@/hooks/useWorkspaces', () => ({
  useCanChangePlan: () => owner.current,
}))

const catalogue = vi.hoisted(() => ({ current: [] as unknown[] }))
vi.mock('@/hooks/useTiers', () => ({
  useTiers: () => ({ data: catalogue.current, isLoading: false }),
}))

// `/plans` is somewhere the dialog sends people; where it lands is the router's
// business and not this file's.
const navigate = vi.hoisted(() => vi.fn())
vi.mock('@tanstack/react-router', () => ({ useNavigate: () => navigate }))

beforeEach(() => {
  answer.current = { state: 'allowed', usage: null }
  owner.current = true
  catalogue.current = []
  held.current = TRIAL
  navigate.mockClear()
})

afterEach(async () => {
  await i18next.changeLanguage(DEFAULT_LOCALE)
})

const SPENT: Entitlement = {
  state: 'denied',
  reason: 'limit',
  usage: { limit: 3, used: 3, reset: null, resetsAt: null },
}

describe('useUpgradeGate', () => {
  it('performs the action when the plan allows it', () => {
    const run = vi.fn()
    const { result } = renderHook(() => useUpgradeGate('active_campaigns'))

    let ran = false
    act(() => {
      ran = result.current.intent(run)()
    })

    expect(run).toHaveBeenCalledOnce()
    expect(ran).toBe(true)
    expect(result.current.selling).toBe(false)
  })

  it('performs it while the plan is still in flight', () => {
    // The rule the rest of the seam is built on, at its one enforcement point.
    // `pending` is not a soft no — deciding anything from it means a workspace
    // that has paid is refused for as long as its own plan takes to load.
    answer.current = { state: 'pending' }
    const run = vi.fn()
    const { result } = renderHook(() => useUpgradeGate('active_campaigns'))

    act(() => {
      result.current.intent(run)()
    })

    expect(run).toHaveBeenCalledOnce()
    expect(result.current.selling).toBe(false)
  })

  it('sells instead of acting, and says it did not act', () => {
    answer.current = SPENT
    const run = vi.fn()
    const { result } = renderHook(() => useUpgradeGate('active_campaigns'))

    let ran = true
    act(() => {
      ran = result.current.intent(run)()
    })

    expect(run).not.toHaveBeenCalled()
    // The half a composer needs: false is what keeps the draft in the box.
    expect(ran).toBe(false)
    expect(result.current.selling).toBe(true)

    act(() => result.current.dismiss())
    expect(result.current.selling).toBe(false)
  })
})

const eur = (amount: number, interval: 'month' | 'year') => ({
  amount,
  currency: 'EUR',
  interval,
  countryCode: null,
})

/** Where the workspace stands: one campaign, and every one of them used. */
const TRIAL = {
  tier: {
    id: 'trial-v1',
    tierId: 'trial',
    name: 'Trial',
    purchasable: true,
    changeReason: 'Launch.',
    prices: [],
    effectiveFrom: null,
    billingPeriod: null,
    renewsAt: null,
    scheduled: null,
  },
  entitlements: {
    active_campaigns: { limit: 1, reset: 'standing' },
    team_seats: { limit: 1, reset: 'standing' },
  },
}

/** The plan the dialog should put forward from Trial. */
const PRO: Tier = {
  id: 'pro-v1',
  tierId: 'pro',
  name: 'Pro',
  purchasable: true,
  changeReason: 'Launch.',
  prices: [eur(2900, 'month'), eur(29000, 'year')],
  entitlements: {
    active_campaigns: { limit: 5, reset: 'standing' },
    team_seats: { limit: 3, reset: 'standing' },
  },
}

/** Bigger and dearer — offered only when Pro would not clear the wall. */
const MAX: Tier = {
  ...PRO,
  id: 'max-v1',
  tierId: 'max',
  name: 'Max',
  prices: [eur(7900, 'month')],
  entitlements: {
    active_campaigns: { limit: null, reset: 'standing' },
    team_seats: { limit: null, reset: 'standing' },
  },
}

/** A gate stuck open, so the dialog can be rendered without a click. */
function OpenGate() {
  const gate = useUpgradeGate('active_campaigns')
  return <UpgradeDialog gate={{ ...gate, selling: true }} />
}

describe('UpgradeDialog', () => {
  it('stays out of the way of an allowance nobody has spent', () => {
    render(<OpenGate />)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('titles the offer, explains the wall without a number, and offers the cheapest way past it', async () => {
    answer.current = SPENT
    catalogue.current = [MAX, PRO]
    render(<OpenGate />)

    expect(
      screen.getByRole('heading', { name: 'Get more with Ogen Pro Plan' }),
    ).toBeInTheDocument()
    expect(
      screen.getByText(
        "You've used all active campaigns on Trial. Everything you've made stays exactly as it is.",
      ),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: 'Ogen Pro' }),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('heading', { name: 'Max' }),
    ).not.toBeInTheDocument()

    await userEvent.click(
      screen.getByRole('button', { name: 'UPGRADE TO PRO' }),
    )
    expect(navigate).toHaveBeenCalledWith({ to: '/plans' })
  })

  it('leads the benefits with the feature that was refused', () => {
    answer.current = SPENT
    catalogue.current = [PRO]
    render(<OpenGate />)

    const tiles = screen.getAllByRole('listitem')
    expect(tiles[0]).toHaveTextContent('5 active campaigns')
    expect(tiles[0]).toHaveTextContent('Run more campaigns at the same time.')
    expect(tiles[1]).toHaveTextContent('3 team members')
  })

  it('opens on the yearly price and switches to the monthly one', async () => {
    answer.current = SPENT
    catalogue.current = [PRO]
    render(<OpenGate />)

    expect(screen.getByText('€24')).toBeInTheDocument()
    expect(screen.getByText('€290 billed yearly, save €58')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('tab', { name: 'Monthly' }))
    expect(screen.getByText('€29')).toBeInTheDocument()
  })

  it('shows a member the offer and no way to take it', async () => {
    // A plan is bought for the whole workspace, so most people reading this
    // cannot act on it. Sending them to a screen of inert buttons is the
    // version of this that teaches them the app is broken.
    answer.current = SPENT
    owner.current = false
    catalogue.current = [PRO]
    render(<OpenGate />)

    // The price is not an owner's privilege — only the decision is.
    expect(screen.getByText('€24')).toBeInTheDocument()
    expect(
      screen.getByText(
        'Only a workspace owner can change the plan for everyone here.',
      ),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'UPGRADE TO PRO' }),
    ).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Close' }))
    expect(navigate).not.toHaveBeenCalled()
  })

  it('says so when the offered plan has no published price', () => {
    answer.current = SPENT
    catalogue.current = [{ ...PRO, prices: [] }]
    render(<OpenGate />)

    expect(
      screen.getByText('Pricing is not published yet.'),
    ).toBeInTheDocument()
    expect(screen.queryByRole('tab')).not.toBeInTheDocument()
    expect(
      screen.getByText('Everything on Trial, with more room to grow.'),
    ).toBeInTheDocument()
  })

  it('invents no offer when nothing on sale beats the plan held', () => {
    answer.current = SPENT
    catalogue.current = []
    render(<OpenGate />)

    expect(
      screen.getByRole('heading', { name: 'Trial is as far as this goes' }),
    ).toBeInTheDocument()
    expect(
      screen.getByText(/No plan on sale offers more of this/),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Compare every plan' }),
    ).toBeInTheDocument()
  })

  it('reads in the language the app is set to', async () => {
    // The assertion an English-only suite cannot make: every string here comes
    // from the catalogue, and in English a literal and a catalogue entry are
    // the same characters.
    answer.current = SPENT
    catalogue.current = [PRO]
    await loadLocaleResources('es')
    await i18next.changeLanguage('es')
    render(<OpenGate />)

    expect(
      screen.getByText(/^Has usado todas las campañas activas de Trial\./),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('heading', {
        name: 'Consigue más con el plan Pro de Ogen',
      }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'PASAR A PRO' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Anual' })).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Comparar todos los planes' }),
    ).toBeInTheDocument()
    expect(screen.queryByText('Compare every plan')).not.toBeInTheDocument()
  })
})
