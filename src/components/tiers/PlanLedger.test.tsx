import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { i18next, loadLocaleResources } from '@/i18n'
import { PlanLedger, type LedgerColumn } from './PlanLedger'
import type { TierVersionPrice } from '@/types/entitlements'
import type { Tier } from '@/types/tiers'

/**
 * The ledger is a comparison before it is a set of buttons, so the rule worth
 * pinning first is that every column answers the *same* rows — and that what a
 * button says comes from what the page decided, never from the column guessing.
 */

const usd = (
  amount: number,
  interval: TierVersionPrice['interval'] = 'month',
  available = true,
): TierVersionPrice => ({
  id: `p-${amount}-${interval}`,
  amount,
  currency: 'USD',
  interval,
  countryCode: null,
  available,
})

function tier(
  tierId: string,
  entitlements: Tier['entitlements'],
  prices: TierVersionPrice[],
): Tier {
  return {
    id: `ttv-${tierId}-v1`,
    tierId,
    name: tierId.charAt(0).toUpperCase() + tierId.slice(1),
    purchasable: true,
    changeReason: '',
    prices,
    entitlements,
    available: true,
    freeTrial: false,
    trialDays: null,
  }
}

const STARTER = tier(
  'starter',
  {
    team_seats: { limit: 1, used: null, reset: 'standing' },
    multiple_accounts_per_platform: { allowed: false },
  },
  [usd(1900), usd(19000, 'year')],
)
const PRO = tier(
  'pro',
  {
    team_seats: { limit: 5, used: null, reset: 'standing' },
    multiple_accounts_per_platform: { allowed: true },
  },
  [usd(4900), usd(49000, 'year')],
)

function ledger(
  columns: LedgerColumn[],
  props: Partial<Parameters<typeof PlanLedger>[0]> = {},
) {
  return render(
    <PlanLedger
      columns={columns}
      interval="month"
      popularTierId="pro"
      focusTierId={null}
      onChoose={() => {}}
      busy={false}
      {...props}
    />,
  )
}

describe('PlanLedger', () => {
  it('gives every column the same rows, so a row reads across', () => {
    ledger([
      {
        tier: STARTER,
        label: 'chargedToday',
        action: { kind: 'choose', freeMonth: false },
      },
      {
        tier: PRO,
        label: 'chargedToday',
        action: { kind: 'choose', freeMonth: false },
      },
    ])

    for (const name of ['Starter', 'Pro']) {
      const column = screen.getByRole('region', { name })
      expect(within(column).getByText('Team members')).toBeInTheDocument()
      expect(
        within(column).getByText('Several accounts on one platform'),
      ).toBeInTheDocument()
    }
    // The figure on one side, a dash for what is not included on the other.
    const starter = screen.getByRole('region', { name: 'Starter' })
    expect(within(starter).getByText('Not included')).toBeInTheDocument()
  })

  it('says a free month on its label and its button, and nothing else', () => {
    ledger([
      {
        tier: PRO,
        label: 'freeMonthThen',
        action: { kind: 'choose', freeMonth: true },
      },
    ])

    expect(screen.getByText('FREE FOR A MONTH, THEN')).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Choose Pro' }),
    ).toHaveTextContent('START FREE MONTH')
  })

  it('buys the price for the interval on show', async () => {
    const onChoose = vi.fn()
    ledger(
      [
        {
          tier: PRO,
          label: 'chargedToday',
          action: { kind: 'choose', freeMonth: false },
        },
      ],
      { interval: 'year', onChoose },
    )

    await userEvent.click(screen.getByRole('button', { name: 'Choose Pro' }))

    expect(onChoose).toHaveBeenCalledWith(PRO, usd(49000, 'year'))
    // The year is shown as its monthly equivalent, with the year's total under.
    expect(screen.getByText(/Billed \$490 a year/)).toBeInTheDocument()
  })

  it('draws the held plan and a scheduled one as labels, not choices', () => {
    ledger([
      { tier: STARTER, label: null, action: { kind: 'scheduled' } },
      { tier: PRO, label: 'current', action: { kind: 'held' } },
    ])

    expect(screen.getByRole('button', { name: 'CURRENT PLAN' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'SCHEDULED' })).toBeDisabled()
  })

  it('offers no button to a reader who cannot choose', () => {
    ledger([{ tier: PRO, label: 'chargedToday', action: { kind: 'none' } }])

    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('focuses the plan the visitor came for', () => {
    ledger(
      [
        {
          tier: STARTER,
          label: 'chargedToday',
          action: { kind: 'choose', freeMonth: false },
        },
        {
          tier: PRO,
          label: 'chargedToday',
          action: { kind: 'choose', freeMonth: false },
        },
      ],
      { focusTierId: 'pro' },
    )

    expect(screen.getByRole('button', { name: 'Choose Pro' })).toHaveFocus()
  })
})

describe('PlanLedger for a complimentary workspace (CON-402)', () => {
  const free = (
    t: Tier,
    action: LedgerColumn['action'] = { kind: 'switch' },
  ): LedgerColumn => ({ tier: t, label: 'freeWhileTesting', action })

  it('shows no price at all, only that it is free while testing', () => {
    ledger([free(STARTER), free(PRO, { kind: 'held' })], {
      popularTierId: null,
    })

    expect(screen.getAllByText('FREE WHILE YOU TEST')).toHaveLength(2)
    expect(screen.queryByText(/\$/)).not.toBeInTheDocument()
    expect(screen.queryByText(/excl\. VAT/)).not.toBeInTheDocument()
    expect(screen.queryByText('MOST POPULAR')).not.toBeInTheDocument()
  })

  it('switches without a price, and states the tier held', async () => {
    const onChoose = vi.fn()
    ledger([free(STARTER), free(PRO, { kind: 'held' })], {
      popularTierId: null,
      onChoose,
    })

    expect(
      within(screen.getByRole('region', { name: 'Pro' })).getByRole('button', {
        name: 'CURRENT PLAN',
      }),
    ).toBeDisabled()
    await userEvent.click(
      screen.getByRole('button', { name: 'Switch to Starter' }),
    )
    expect(onChoose).toHaveBeenCalledWith(STARTER, null)
    expect(screen.getByText('SWITCH TO STARTER')).toBeInTheDocument()
  })
})

describe('PlanLedger in Spanish', () => {
  beforeAll(async () => {
    await loadLocaleResources('es')
    await i18next.changeLanguage('es')
  })
  afterAll(async () => {
    await i18next.changeLanguage('en')
  })

  it('takes every word from the catalogue', () => {
    ledger([
      {
        tier: PRO,
        label: 'freeMonthThen',
        action: { kind: 'choose', freeMonth: true },
      },
    ])

    expect(screen.getByText('UN MES GRATIS, LUEGO')).toBeInTheDocument()
    expect(screen.getByText('EMPEZAR EL MES GRATIS')).toBeInTheDocument()
    expect(screen.getByText('INCLUYE')).toBeInTheDocument()
    expect(screen.queryByText('ALLOWANCES')).not.toBeInTheDocument()
    expect(screen.queryByText('START FREE MONTH')).not.toBeInTheDocument()
  })
})
