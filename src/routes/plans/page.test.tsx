import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import {
  complimentaryEnded,
  noteComplimentary,
} from '@/lib/complimentaryMemory'
import { renderWithProviders } from '@/test/renderWithProviders'
import { useToastStore } from '@/stores/toastStore'
import type { WorkspacePlan } from '@/types/entitlements'
import type { PlanChange, Tier } from '@/types/tiers'
import { PlansPage } from './page'

/**
 * `/plans` for a tester (CON-402 board 3) and the owner gate once their access
 * ends (board 4B). The paid paths are CON-328's and tested with the Ledger;
 * this is about the branch where nothing is sold.
 */

const plan = vi.fn<() => WorkspacePlan>()
vi.mock('@/hooks/useEntitlements', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/hooks/useEntitlements')>()),
  useWorkspacePlan: () => ({
    data: plan(),
    isError: false,
    isPending: false,
    isFetching: false,
    status: 'success',
    fetchStatus: 'idle',
  }),
}))

/** `null` is a price list that failed to load. */
const tiers = vi.fn<() => Tier[] | null>()
const changePlan = vi.fn<(v: { tierId: string }) => Promise<PlanChange>>()
vi.mock('@/hooks/useTiers', async () => {
  const { useMutation } = await import('@tanstack/react-query')
  return {
    useTiers: () => ({
      data: tiers() ?? undefined,
      isError: tiers() === null,
      isPending: false,
      isFetching: false,
      status: 'success',
      fetchStatus: 'idle',
    }),
    useChangePlan: () =>
      useMutation({ mutationFn: (v: { tierId: string }) => changePlan(v) }),
  }
})

const mayChange = vi.fn(() => true)
vi.mock('@/hooks/useWorkspaces', () => ({
  useWorkspace: () => ({ id: 'ws-1', name: 'Acme Roasters', role: 'owner' }),
  useCanChangePlan: () => mayChange(),
}))
vi.mock('@/hooks/useEventStream', () => ({ useEventStream: () => {} }))
vi.mock('@/hooks/useBilling', () => ({
  useOpenBillingPortal: () => ({ open: vi.fn(), isPending: false }),
}))

function tier(tierId: string, freeTrial = false): Tier {
  return {
    id: `ttv-${tierId}-v1`,
    tierId,
    name: tierId.charAt(0).toUpperCase() + tierId.slice(1),
    purchasable: true,
    changeReason: '',
    prices: [
      {
        id: `p-${tierId}`,
        amount: 4900,
        currency: 'USD',
        interval: 'month',
        countryCode: null,
        available: true,
      },
    ],
    entitlements: { team_seats: { limit: 5, used: null, reset: 'standing' } },
    available: true,
    freeTrial,
    trialDays: freeTrial ? 30 : null,
  }
}

const OFFERED = [tier('starter'), tier('pro', true), tier('max')]

function held(
  tierId: string,
  billing: Partial<WorkspacePlan['billing']> = {},
): WorkspacePlan {
  return {
    tier: {
      id: `ttv-${tierId}-v1`,
      tierId,
      name: tierId.charAt(0).toUpperCase() + tierId.slice(1),
      purchasable: tierId !== 'beta',
      changeReason: '',
      prices: [],
      effectiveFrom: null,
      billingPeriod: null,
      renewsAt: null,
      trialEndsAt: null,
      scheduled: null,
    },
    billing: {
      required: false,
      trialEligible: true,
      complimentary: true,
      ...billing,
    },
    entitlements: {},
  }
}

function open() {
  return renderWithProviders(<PlansPage />, { path: '/plans/' })
}

beforeEach(() => {
  tiers.mockReturnValue(OFFERED)
  changePlan.mockReset()
  mayChange.mockReturnValue(true)
  useToastStore.setState({ toasts: [] })
})
afterEach(() => localStorage.clear())

describe('/plans for a complimentary workspace', () => {
  it('shows the plans with no money anywhere on the page', async () => {
    plan.mockReturnValue(held('pro'))
    await open()

    expect(
      screen.getByRole('heading', { name: 'Select a plan you like' }),
    ).toBeInTheDocument()
    expect(
      screen.getByText('Acme Roasters has complimentary beta access.', {
        exact: false,
      }),
    ).toBeInTheDocument()
    expect(screen.getAllByText('FREE WHILE YOU TEST')).toHaveLength(3)
    expect(screen.queryByText(/\$/)).not.toBeInTheDocument()
    expect(
      screen.queryByRole('tab', { name: /yearly/i }),
    ).not.toBeInTheDocument()
    expect(screen.queryByText('MOST POPULAR')).not.toBeInTheDocument()
    expect(screen.queryByText('START FREE MONTH')).not.toBeInTheDocument()
    expect(screen.queryByText(/Prices exclude VAT/)).not.toBeInTheDocument()
    expect(
      screen.getByText(/Beta access is free while you test/),
    ).toBeInTheDocument()
    // Not a gate: the X back to the app stays.
    expect(screen.getByRole('button', { name: /close/i })).toBeInTheDocument()
  })

  it('switches on the click — 200, no checkout — and confirms with a toast', async () => {
    plan.mockReturnValue(held('pro'))
    changePlan.mockResolvedValue({ kind: 'changed', plan: held('max') })
    await open()

    expect(
      within(screen.getByRole('region', { name: 'Pro' })).getByRole('button', {
        name: 'CURRENT PLAN',
      }),
    ).toBeDisabled()
    await userEvent.click(screen.getByRole('button', { name: 'Switch to Max' }))

    await waitFor(() =>
      expect(changePlan).toHaveBeenCalledWith({ tierId: 'max' }),
    )
    await waitFor(() =>
      expect(useToastStore.getState().toasts[0]).toMatchObject({
        title: 'Switched to Max',
        description: 'New limits apply straight away.',
      }),
    )
  })

  it('names a hidden tier above the plans, and asks before leaving it', async () => {
    plan.mockReturnValue(held('beta'))
    changePlan.mockResolvedValue({ kind: 'changed', plan: held('max') })
    await open()

    expect(
      screen.getByText(
        "You're on Beta, the plan the Ogen team set up for your testing",
      ),
    ).toBeInTheDocument()
    expect(
      screen.getByText(
        /only the Ogen team can move this workspace back to Beta/,
      ),
    ).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Switch to Max' }))
    expect(changePlan).not.toHaveBeenCalled()

    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByText('Leave Beta?')).toBeInTheDocument()
    await userEvent.click(
      within(dialog).getByRole('button', { name: 'SWITCH TO MAX' }),
    )
    await waitFor(() =>
      expect(changePlan).toHaveBeenCalledWith({ tierId: 'max' }),
    )
  })

  it('never opens a payment from a free switch — the plan is read again', async () => {
    // Access ended between the read and the click, so the server answered
    // with a checkout rather than the switch the button promised.
    plan.mockReturnValue(held('pro'))
    changePlan.mockResolvedValue({
      kind: 'checkout',
      checkout: { url: 'https://pay.example/x', expiresAt: null, trial: true },
    })
    const assign = vi.fn()
    const original = window.location
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...original, assign },
    })
    try {
      const { queryClient } = await open()
      const invalidate = vi.spyOn(queryClient, 'invalidateQueries')

      await userEvent.click(
        screen.getByRole('button', { name: 'Switch to Max' }),
      )

      await waitFor(() =>
        expect(invalidate).toHaveBeenCalledWith({
          queryKey: ['entitlements'],
        }),
      )
      expect(assign).not.toHaveBeenCalled()
      expect(useToastStore.getState().toasts).toHaveLength(0)
    } finally {
      Object.defineProperty(window, 'location', {
        configurable: true,
        value: original,
      })
    }
  })

  it('cannot be dismissed while leaving a hidden tier is in flight', async () => {
    plan.mockReturnValue(held('beta'))
    changePlan.mockReturnValue(new Promise(() => {}))
    await open()

    await userEvent.click(screen.getByRole('button', { name: 'Switch to Max' }))
    const dialog = await screen.findByRole('dialog')
    await userEvent.click(
      within(dialog).getByRole('button', { name: 'SWITCH TO MAX' }),
    )
    await userEvent.keyboard('{Escape}')

    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('shows a member the plans with nothing to press', async () => {
    mayChange.mockReturnValue(false)
    plan.mockReturnValue(held('pro'))
    await open()

    expect(
      screen.queryByRole('button', { name: /Switch to/ }),
    ).not.toBeInTheDocument()
    expect(screen.getAllByText('FREE WHILE YOU TEST')).toHaveLength(3)
  })
})

describe('the owner gate after beta access ends', () => {
  const GATED = held('pro', { complimentary: false, required: true })

  it('says why the gate appeared — once — and still offers the free month', async () => {
    noteComplimentary('ws-1', held('pro'))
    plan.mockReturnValue(GATED)
    await open()

    expect(
      screen.getByText('Your complimentary beta access has ended'),
    ).toBeInTheDocument()
    expect(
      screen.getByText(/your first month is free on Pro/),
    ).toBeInTheDocument()
    expect(screen.getByText('START FREE MONTH')).toBeInTheDocument()
  })

  it('names no free month on a tier that cannot be bought right now', async () => {
    noteComplimentary('ws-1', held('pro'))
    tiers.mockReturnValue([
      tier('starter'),
      { ...tier('pro', true), available: false },
    ])
    plan.mockReturnValue(GATED)
    await open()

    expect(
      screen.getByText('Your complimentary beta access has ended'),
    ).toBeInTheDocument()
    expect(screen.queryByText(/first month is free/)).not.toBeInTheDocument()
  })

  it('keeps the notice owed when the page could not show it', async () => {
    noteComplimentary('ws-1', held('pro'))
    plan.mockReturnValue(GATED)
    tiers.mockReturnValue(null)
    await open()

    expect(
      screen.queryByText('Your complimentary beta access has ended'),
    ).not.toBeInTheDocument()
    expect(complimentaryEnded('ws-1', GATED)).toBe(true)
  })

  it('does not say it to a workspace that was never comped', async () => {
    plan.mockReturnValue(GATED)
    await open()

    expect(
      screen.queryByText('Your complimentary beta access has ended'),
    ).not.toBeInTheDocument()
  })
})
