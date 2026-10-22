import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { ChangePlanDialog } from './ChangePlanDialog'
import type { TierSnapshot, TierVersionPrice } from '@/types/entitlements'
import type { Tier } from '@/types/tiers'

/**
 * The dialog is the one place an in-place change is priced before it happens,
 * so what matters is that it says the free month ends — and that a refusal to
 * end it is explained where the reader is, with the date, not in a toast.
 */

const PRICE: TierVersionPrice = {
  id: 'p-max-m',
  amount: 12900,
  currency: 'USD',
  interval: 'month',
  countryCode: null,
  available: true,
}

const MAX: Tier = {
  id: 'ttv-max-v1',
  tierId: 'max',
  name: 'Max',
  purchasable: true,
  changeReason: '',
  prices: [PRICE],
  entitlements: {},
  available: true,
  freeTrial: false,
  trialDays: null,
}

const PRO: TierSnapshot = {
  id: 'ttv-pro-v1',
  tierId: 'pro',
  name: 'Pro',
  purchasable: true,
  changeReason: '',
  prices: [],
  effectiveFrom: null,
  billingPeriod: 'month',
  renewsAt: '2026-11-21T00:00:00Z',
  trialEndsAt: null,
  scheduled: null,
}

function dialog(props: Partial<Parameters<typeof ChangePlanDialog>[0]> = {}) {
  return render(
    <ChangePlanDialog
      target={MAX}
      price={PRICE}
      held={PRO}
      blocked={false}
      busy={false}
      onConfirm={() => {}}
      onClose={() => {}}
      onManage={() => {}}
      {...props}
    />,
  )
}

describe('ChangePlanDialog', () => {
  it('states the price, net, and confirms by name', async () => {
    const onConfirm = vi.fn()
    dialog({ onConfirm })

    expect(screen.getByText('$129.00 / month, excl. VAT')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'MOVE TO MAX' }))
    expect(onConfirm).toHaveBeenCalled()
  })

  it('says the free month ends, during the free month', () => {
    dialog({ held: { ...PRO, trialEndsAt: '2026-11-21T00:00:00Z' } })

    expect(
      screen.getByText(
        'This ends the free month on Pro today, and Max is charged now.',
      ),
    ).toBeInTheDocument()
  })

  it('explains a refusal to end the free month, with its date', () => {
    dialog({
      blocked: true,
      held: { ...PRO, trialEndsAt: '2026-11-21T00:00:00Z' },
    })

    expect(screen.getByText('Not during the free month')).toBeInTheDocument()
    expect(screen.getByText(/ends on November 21, 2026/)).toBeInTheDocument()
    expect(
      screen.getByText("Nothing was charged, and you're still on Pro."),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'MOVE TO MAX' }),
    ).not.toBeInTheDocument()
  })
})
