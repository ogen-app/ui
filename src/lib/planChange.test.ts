import { describe, expect, it } from 'vitest'
import type { TFunction } from 'i18next'

import { planChangeMessage } from './planChange'
import { PlanChangeError } from '@/services/api/tiers'

/** Echoes the key, so a test can say which sentence was chosen. */
const t = ((key: string) => key) as unknown as TFunction

describe('planChangeMessage', () => {
  it('words each refusal the server sends by its code', () => {
    expect(
      planChangeMessage(t, new PlanChangeError(409, 'tier_not_available')),
    ).toBe('tiers.planError.notAvailable')
    expect(
      planChangeMessage(t, new PlanChangeError(502, 'provider_error')),
    ).toBe('tiers.planError.provider')
    expect(
      planChangeMessage(t, new PlanChangeError(400, 'price_mismatch')),
    ).toBe('tiers.planError.stale')
  })

  it('falls back to the generic sentence for anything else', () => {
    expect(planChangeMessage(t, new Error('network'))).toBe(
      'tiers.changeFailed',
    )
  })
})
