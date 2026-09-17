import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, render, renderHook, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { i18next, loadLocaleResources } from '@/i18n'
import { DEFAULT_LOCALE } from '@/i18n/config'
import { UpgradeDialog } from './UpgradeDialog'
import { useUpgradeGate } from './useUpgradeGate'
import type { Entitlement } from '@/types/entitlements'

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

vi.mock('@/hooks/useEntitlements', () => ({
  useEntitlement: () => answer.current,
}))

// `/plans` is somewhere the dialog sends people; where it lands is the router's
// business and not this file's.
const navigate = vi.hoisted(() => vi.fn())
vi.mock('@tanstack/react-router', () => ({ useNavigate: () => navigate }))

beforeEach(() => {
  answer.current = { state: 'allowed', usage: null }
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

/** A gate stuck open, so the dialog can be rendered without a click. */
function OpenGate({ hideUsage }: { hideUsage?: boolean } = {}) {
  const gate = useUpgradeGate('active_campaigns')
  return (
    <UpgradeDialog gate={{ ...gate, selling: true }} hideUsage={hideUsage} />
  )
}

describe('UpgradeDialog', () => {
  it('stays out of the way of an allowance nobody has spent', () => {
    render(<OpenGate />)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('offers the plan screen and a way past it', async () => {
    answer.current = SPENT
    render(<OpenGate />)

    expect(screen.getByText("You've reached your limit")).toBeInTheDocument()
    expect(screen.getByText('3 of 3')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'UPGRADE' }))
    expect(navigate).toHaveBeenCalledWith({ to: '/plans' })
  })

  it('drops the meter for an allowance whose numbers mean nothing', () => {
    // The assistant's budget is a multiplier: the figures are real and "5 of 5"
    // is not what any of them say.
    answer.current = SPENT
    render(<OpenGate hideUsage />)

    expect(screen.getByText("You've reached your limit")).toBeInTheDocument()
    expect(screen.queryByText('3 of 3')).not.toBeInTheDocument()
  })

  it('reads in the language the app is set to', async () => {
    // The assertion an English-only suite cannot make: every string here comes
    // from the catalogue, and in English a literal and a catalogue entry are
    // the same characters.
    answer.current = SPENT
    await loadLocaleResources('es')
    await i18next.changeLanguage('es')
    render(<OpenGate />)

    expect(screen.getByText('Has alcanzado tu límite')).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'MEJORAR PLAN' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Ahora no' })).toBeInTheDocument()
    expect(screen.queryByText('Not now')).not.toBeInTheDocument()
  })
})
