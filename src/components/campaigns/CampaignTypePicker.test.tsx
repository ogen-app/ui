import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

import { CampaignTypePicker } from './CampaignTypePicker'
import type { CampaignType } from '@/types/campaigns'
import type { Entitlement } from '@/types/entitlements'

/**
 * The *hide* disposition, which is the one of the three that cannot be checked
 * by looking at the screen it applies to — its whole effect is that something
 * is not there.
 *
 * Two rules, and the second is the one worth a test. A tier limited to
 * evergreen shortens the list rather than locking rows in it. But the type a
 * campaign already holds survives the filter regardless: entitlements govern
 * what may be *picked* and never what exists, and a picker that dropped its own
 * current value would render a campaign with nothing selected and then offer to
 * change it on the next save.
 */

const answer = vi.hoisted(() => ({ current: null as Entitlement | null }))

vi.mock('@/hooks/useEntitlements', () => ({
  useEntitlement: () => answer.current,
}))

const type = (id: string, name: string): CampaignType => ({
  id,
  name,
  is_system: true,
})

const TYPES = [
  type('t-launch', 'launch'),
  type('t-evergreen', 'evergreen'),
  type('t-seasonal', 'seasonal'),
]

beforeEach(() => {
  answer.current = { state: 'allowed', usage: null }
})

describe('CampaignTypePicker', () => {
  it('offers every type the API sent when nothing is gated', () => {
    render(
      <CampaignTypePicker
        types={TYPES}
        value="t-evergreen"
        onChange={vi.fn()}
      />,
    )
    expect(screen.getAllByRole('radio')).toHaveLength(3)
  })

  it('shortens the list rather than locking rows in it', () => {
    answer.current = { state: 'denied', reason: 'tier' }
    render(
      <CampaignTypePicker
        types={TYPES}
        value="t-evergreen"
        onChange={vi.fn()}
      />,
    )

    expect(screen.getAllByRole('radio')).toHaveLength(1)
    // No lock, no upgrade: somebody is mid-decision, and a row they cannot pick
    // is noise laid across the one they can.
    expect(screen.queryByText('Not in your plan')).not.toBeInTheDocument()
  })

  it('keeps the type the campaign already holds', () => {
    // A campaign on a type its tier no longer includes is not broken and is not
    // quietly converted. It keeps it, and the picker keeps showing it.
    answer.current = { state: 'denied', reason: 'tier' }
    render(
      <CampaignTypePicker
        types={TYPES}
        value="t-seasonal"
        onChange={vi.fn()}
      />,
    )

    const offered = screen.getAllByRole('radio')
    expect(offered).toHaveLength(2)
    expect(
      offered.some((radio) => radio.getAttribute('aria-checked') === 'true'),
    ).toBe(true)
  })

  it('decides nothing while the plan is in flight', () => {
    answer.current = { state: 'pending' }
    render(
      <CampaignTypePicker
        types={TYPES}
        value="t-evergreen"
        onChange={vi.fn()}
      />,
    )
    expect(screen.getAllByRole('radio')).toHaveLength(3)
  })
})
