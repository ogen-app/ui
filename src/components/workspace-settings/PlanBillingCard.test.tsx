import { afterEach, describe, expect, it, vi } from 'vitest'
import { screen } from '@testing-library/react'

import { renderWithProviders } from '@/test/renderWithProviders'
import { PlanBillingCard } from './PlanBillingCard'
import type { BillingAccount, BillingStatus } from '@/types/billing'
import type { TierSnapshot } from '@/types/entitlements'

/**
 * The card states two things that can contradict each other — what the plan
 * does next, and what the provider says about the subscription paying for it —
 * and they arrive on separate payloads. These tests are about the seam between
 * them.
 *
 * The one that matters most: a cancelled subscription keeps the tier's
 * `renewsAt`, because that date is still the boundary. Reading it as a promise
 * printed "It auto-renews in 8 days, on August 31. Access ends on August 31."
 * — a renewal that is not coming, contradicted in the same breath.
 */

const NOW = '2026-08-23T12:00:00Z'
const BOUNDARY = '2026-08-31T00:00:00Z'

const MONTHLY: TierSnapshot = {
  id: 'tier_max_2026_08_01',
  name: 'Ogen Max',
  effectiveFrom: '2026-08-01T00:00:00Z',
  billingPeriod: 'month',
  renewsAt: BOUNDARY,
  scheduled: null,
}

function billed(status: BillingStatus, endsAt: string | null = null): BillingAccount {
  return {
    subscription: {
      status,
      renewsAt: endsAt ? null : BOUNDARY,
      endsAt,
      card: { brand: 'visa', last4: '4242' },
      price: null,
    },
    portal: true,
  }
}

function render(props: Partial<Parameters<typeof PlanBillingCard>[0]> = {}) {
  return renderWithProviders(
    <PlanBillingCard
      tier={MONTHLY}
      billing={billed('active')}
      mayManage
      onManage={() => {}}
      {...props}
    />,
    { path: '/workspace-settings' },
  )
}

afterEach(() => {
  vi.useRealTimers()
})

function at(iso: string) {
  // `shouldAdvanceTime` because the router these render through waits on real
  // timers to settle; freezing the clock outright deadlocks the render before
  // a single assertion runs. Only the date matters here, not the standstill.
  vi.useFakeTimers({ shouldAdvanceTime: true })
  vi.setSystemTime(new Date(iso))
}

describe('PlanBillingCard', () => {
  it('promises the renewal while the subscription is healthy', async () => {
    at(NOW)
    await render()

    expect(screen.getByText('It auto-renews in 8 days, on August 31, 2026.')).toBeInTheDocument()
  })

  it('stops promising a renewal once the subscription is cancelled', async () => {
    at(NOW)
    await render({ billing: billed('cancelled', BOUNDARY) })

    expect(screen.getByText('Access ends on August 31, 2026.')).toBeInTheDocument()
    expect(screen.queryByText(/auto-renews/)).not.toBeInTheDocument()
  })

  it('takes the tense from the provider, not from the clock', async () => {
    // A wrong system clock must not be able to reword this. `expired` is over
    // and `cancelled` is paid up; only the server knows which.
    at(NOW)
    await render({ billing: billed('expired', '2026-08-20T00:00:00Z') })

    expect(screen.getByText('Access ended on August 20, 2026.')).toBeInTheDocument()
  })

  it('lets a scheduled tier change outrank even an ending subscription', async () => {
    at(NOW)
    await render({
      tier: {
        ...MONTHLY,
        scheduled: {
          id: 'tier_trial_2026_08_01',
          name: 'Ogen Trial',
          effectiveFrom: BOUNDARY,
          direction: 'downgrade',
        },
      },
      billing: billed('cancelled', BOUNDARY),
    })

    expect(
      screen.getByText('You move to Ogen Trial in 8 days, on August 31, 2026.'),
    ).toBeInTheDocument()
    expect(screen.queryByText(/Access ends/)).not.toBeInTheDocument()
  })

  it('tells a failed payment apart from an exhausted one', async () => {
    // The instruction is the whole point of the third line, and it is opposite
    // in the two states: `past_due` is still being retried, so telling someone
    // to re-enter a card the provider is about to charge is how a card gets
    // changed for no reason.
    at(NOW)
    const retrying = await render({ billing: billed('past_due') })
    expect(screen.getByText(/Lemon Squeezy will try it again/)).toBeInTheDocument()
    retrying.unmount()

    await render({ billing: billed('unpaid') })
    expect(screen.getByText(/will not be retried/)).toBeInTheDocument()
  })

  it('keeps the third line off states that are decisions rather than failures', async () => {
    at(NOW)
    await render({ billing: billed('cancelled', BOUNDARY) })

    expect(screen.queryByText(/payment failed/i)).not.toBeInTheDocument()
  })

  it('never reports a live subscription as having no payment method', async () => {
    // "No payment method on file" under a plan somebody is paying for reads as
    // "we lost your card". A renewing subscription has one; we just have not
    // been sent it.
    at(NOW)
    await render({ billing: { ...billed('active'), subscription: { ...billed('active').subscription!, card: null } } })

    expect(screen.getByText('Your payment method is held by Lemon Squeezy.')).toBeInTheDocument()
    expect(screen.queryByText(/on file/)).not.toBeInTheDocument()
  })

  it('keeps MANAGE on the screen and dead until there is a portal', async () => {
    // Absent until the endpoint lands would make its arrival read as a new
    // feature rather than a connection completing.
    at(NOW)
    await render({ billing: { subscription: null, portal: false } })

    expect(screen.getByRole('button', { name: /MANAGE/ })).toBeDisabled()
  })

  it('explains itself to a member rather than failing at them', async () => {
    at(NOW)
    await render({ mayManage: false, billing: undefined })

    expect(screen.getByText('Only workspace owners can see billing details.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /MANAGE/ })).not.toBeInTheDocument()
  })
})
