import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

import { i18next, loadLocaleResources } from '@/i18n'
import { DEFAULT_LOCALE } from '@/i18n/config'
import { UpgradeCallout } from './UpgradeCallout'
import type { Entitlement } from '@/types/entitlements'

/**
 * The shared renderings, asserted where the reasoning is easiest to undo: that
 * the two denials say different things, and that neither of them offers a
 * button there is nowhere to send the user with.
 */

afterEach(async () => {
  await i18next.changeLanguage(DEFAULT_LOCALE)
})

const DENIED_BY_TIER: Entitlement = { state: 'denied', reason: 'tier' }

const DENIED_BY_LIMIT: Entitlement = {
  state: 'denied',
  reason: 'limit',
  usage: { limit: 10, used: 10, period: 'month', resetsAt: '2026-09-01T00:00:00Z' },
}

function denied(entitlement: Entitlement) {
  return entitlement as Extract<Entitlement, { state: 'denied' }>
}

describe('UpgradeCallout', () => {
  it('says the plan does not include it, and offers nothing else', () => {
    render(<UpgradeCallout entitlement={denied(DENIED_BY_TIER)} onUpgrade={() => {}} />)

    expect(screen.getByText('Not in your plan')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'UPGRADE' })).toBeInTheDocument()
    // No count, because there is no allowance involved — this is about what was
    // bought, not about what is left.
    expect(screen.queryByText(/\d+ of \d+/)).not.toBeInTheDocument()
  })

  it('answers a spent allowance with the count and the date it returns', () => {
    // The reason this is a separate rendering: waiting is a real answer here,
    // and a callout that only said "upgrade" would be hiding it.
    render(<UpgradeCallout entitlement={denied(DENIED_BY_LIMIT)} onUpgrade={() => {}} />)

    expect(screen.getByText("You've reached your limit")).toBeInTheDocument()
    expect(screen.getByText('10 of 10 this month')).toBeInTheDocument()
    // Month first, because the app's language is `en` — the same formatter
    // reads "1 de septiembre" under `es` below, which is the point of it.
    expect(
      screen.getByText('Your allowance goes back to full on September 1.'),
    ).toBeInTheDocument()
  })

  it('drops the button when there is nowhere to send them', () => {
    // There is no billing screen yet. A button that explains a limit and then
    // does nothing about it turns an explanation into a dead end.
    render(<UpgradeCallout entitlement={denied(DENIED_BY_LIMIT)} />)

    expect(screen.getByText("You've reached your limit")).toBeInTheDocument()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('groups a large count in the app language by default', () => {
    render(
      <UpgradeCallout
        entitlement={denied({
          state: 'denied',
          reason: 'limit',
          usage: { limit: 12_000, used: 12_000, period: null, resetsAt: null },
        })}
      />,
    )

    expect(screen.getByText('12,000 of 12,000')).toBeInTheDocument()
  })

  it('lets the call site say what the numbers mean', () => {
    // `media_storage_bytes` in raw bytes is a true sentence nobody can use.
    const format = vi.fn((value: number) => `${value / 1_000_000} MB`)
    render(
      <UpgradeCallout
        entitlement={denied({
          state: 'denied',
          reason: 'limit',
          usage: { limit: 100_000_000, used: 100_000_000, period: null, resetsAt: null },
        })}
        format={format}
      />,
    )

    expect(screen.getByText('100 MB of 100 MB')).toBeInTheDocument()
  })

  it('follows a language switch, sentence and date together', async () => {
    // English is the only bundled catalogue; the rest are fetched on demand.
    await loadLocaleResources('es')
    await i18next.changeLanguage('es')
    render(<UpgradeCallout entitlement={denied(DENIED_BY_LIMIT)} onUpgrade={() => {}} />)

    expect(screen.getByText('Has alcanzado tu límite')).toBeInTheDocument()
    expect(screen.getByText('10 de 10 este mes')).toBeInTheDocument()
    // The date is formatted in the app's language, not the browser's — the
    // whole point of not hoisting the formatter.
    expect(
      screen.getByText('Tu cuota vuelve a estar completa el 1 de septiembre.'),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'MEJORAR PLAN' })).toBeInTheDocument()
  })
})
