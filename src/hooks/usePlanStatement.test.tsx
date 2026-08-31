import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

import { i18next, loadLocaleResources } from '@/i18n'
import { DEFAULT_LOCALE } from '@/i18n/config'
import { usePlanStatement } from './usePlanStatement'
import type { TierSnapshot } from '@/types/entitlements'

/**
 * Two sentences with one rule between them: **a scheduled change outranks a
 * renewal.** Get that backwards and a workspace about to drop a tier is told
 * its plan auto-renews, which is the opposite of what happens next — and it is
 * exactly the kind of ordering a refactor can invert while every test that
 * checks the words individually still passes.
 *
 * The clock is faked because the distance ("in 31 days") is read off it. That
 * is the *only* thing the clock is allowed to decide here; which sentence gets
 * chosen comes off the plan.
 */

const PAID: TierSnapshot = {
  id: 'tier_max_2026_08_01',
  name: 'Ogen Max',
  effectiveFrom: '2026-08-22T00:00:00Z',
  billingPeriod: 'month',
  renewsAt: '2026-09-22T00:00:00Z',
  scheduled: null,
}

const FREE: TierSnapshot = {
  id: 'tier_trial_2026_08_01',
  name: 'Ogen Trial',
  effectiveFrom: '2026-08-01T00:00:00Z',
  billingPeriod: null,
  renewsAt: null,
  scheduled: null,
}

function Statement({ tier }: { tier: TierSnapshot | undefined }) {
  const { headline, timing } = usePlanStatement(tier)
  return (
    <div>
      <p>{headline}</p>
      <p>{timing}</p>
    </div>
  )
}

afterEach(async () => {
  vi.useRealTimers()
  await i18next.changeLanguage(DEFAULT_LOCALE)
})

function at(iso: string) {
  vi.useFakeTimers()
  vi.setSystemTime(new Date(iso))
}

describe('usePlanStatement', () => {
  it('names the plan and how often it bills', () => {
    at('2026-08-22T12:00:00Z')
    render(<Statement tier={PAID} />)

    expect(
      screen.getByText("You're on the Ogen Max plan, billed monthly."),
    ).toBeInTheDocument()
    expect(
      screen.getByText('It auto-renews in 31 days, on September 22, 2026.'),
    ).toBeInTheDocument()
  })

  it('leaves the cadence out of a plan nobody pays for', () => {
    // A free tier has no billing period to name and no renewal to promise, so
    // the only honest second line is the day it started.
    at('2026-08-22T12:00:00Z')
    render(<Statement tier={FREE} />)

    expect(
      screen.getByText("You're on the Ogen Trial plan."),
    ).toBeInTheDocument()
    expect(
      screen.getByText('On this plan since August 1, 2026.'),
    ).toBeInTheDocument()
  })

  it('lets a pending downgrade outrank the renewal date', () => {
    // The rule. The tier still renews — `renewsAt` is set — and saying so would
    // be true and useless, because what actually happens on that date is the
    // drop to Trial.
    at('2026-08-22T12:00:00Z')
    render(
      <Statement
        tier={{
          ...PAID,
          scheduled: {
            id: 'tier_trial_2026_08_01',
            name: 'Ogen Trial',
            effectiveFrom: '2026-09-22T00:00:00Z',
            direction: 'downgrade',
          },
        }}
      />,
    )

    expect(
      screen.getByText(
        'You move to Ogen Trial in 31 days, on September 22, 2026.',
      ),
    ).toBeInTheDocument()
    expect(screen.queryByText(/auto-renews/)).not.toBeInTheDocument()
  })

  it('words an upgrade as an arrival, not a loss', () => {
    // The server says which direction this is; the two readings want opposite
    // tones and the dates alone cannot tell them apart.
    at('2026-08-22T12:00:00Z')
    render(
      <Statement
        tier={{
          ...PAID,
          scheduled: {
            id: 'tier_max_2027_01_01',
            name: 'Ogen Max',
            effectiveFrom: '2026-09-22T00:00:00Z',
            direction: 'upgrade',
          },
        }}
      />,
    )

    expect(
      screen.getByText('Ogen Max starts in 31 days, on September 22, 2026.'),
    ).toBeInTheDocument()
  })

  it('says nothing at all before the plan arrives', () => {
    // Same reason `resolveEntitlement` answers `pending`: a screen that filled
    // this in from nothing would be guessing about money.
    render(<Statement tier={undefined} />)

    expect(screen.queryByText(/plan/)).not.toBeInTheDocument()
  })

  it('follows a language switch, sentence and date together', async () => {
    at('2026-08-22T12:00:00Z')
    await loadLocaleResources('es')
    await i18next.changeLanguage('es')
    render(<Statement tier={PAID} />)

    expect(
      screen.getByText('Estás en el plan Ogen Max, con facturación mensual.'),
    ).toBeInTheDocument()
    expect(
      screen.getByText(
        'Se renueva automáticamente dentro de 31 días, el 22 de septiembre de 2026.',
      ),
    ).toBeInTheDocument()
  })
})
