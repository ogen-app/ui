import { describe, expect, it } from 'vitest'

import {
  featureValue,
  formatStorage,
  tierFeatures,
  TIER_FEATURE_ORDER,
} from './tierFeatures'
import type { Tier } from '@/types/tiers'

/**
 * What a tier says about a feature, which is a different question from what a
 * workspace is allowed to do right now — and has to answer the three absences
 * the same way `resolveEntitlement` does, or the price list and the lock
 * disagree.
 */

function tier(entitlements: Tier['entitlements']): Tier {
  return {
    id: 'tier_test',
    name: 'Test',
    tagline: '',
    effectiveFrom: '2026-08-01T00:00:00Z',
    price: null,
    available: true,
    entitlements,
  }
}

describe('featureValue', () => {
  it('counts a key the tier never mentions as included', () => {
    // Same rule as the entitlement seam: a feature the tier list is silent
    // about is one nobody decided to charge for. A price list that promised
    // less than the app allows would be the worse of the two bugs.
    expect(featureValue(undefined)).toEqual({ kind: 'included' })
  })

  it('reads a flat no as an exclusion', () => {
    expect(featureValue({ allowed: false })).toEqual({ kind: 'excluded' })
  })

  it('reads a flat yes as included, with no number to show', () => {
    expect(featureValue({ allowed: true })).toEqual({ kind: 'included' })
  })

  it('tells unlimited apart from unmetered', () => {
    // `limit: null` is a tier that paid to have no ceiling; a missing `limit`
    // is a feature with no ceiling to buy. They read the same to a user and
    // must not be conflated in the data.
    expect(featureValue({ limit: null })).toEqual({ kind: 'unlimited' })
    expect(featureValue({ allowed: true, limit: undefined })).toEqual({
      kind: 'included',
    })
  })

  it('keeps the period with the number', () => {
    expect(featureValue({ limit: 10, period: 'month' })).toEqual({
      kind: 'limit',
      limit: 10,
      period: 'month',
    })
  })

  it('carries a limit with no period as a plain total', () => {
    expect(featureValue({ limit: 3 })).toEqual({
      kind: 'limit',
      limit: 3,
      period: null,
    })
  })

  it('does not treat a spent allowance as an exclusion', () => {
    // `used` belongs to the workspace, not the tier. A plan card showing "0"
    // because this workspace has used everything up would be describing the
    // wrong thing entirely.
    expect(featureValue({ limit: 5, used: 5 })).toEqual({
      kind: 'limit',
      limit: 5,
      period: null,
    })
  })
})

describe('tierFeatures', () => {
  it('answers for every feature in the table, in order', () => {
    const features = tierFeatures(tier({ campaigns: { limit: 5 } }))
    expect(features.map((feature) => feature.key)).toEqual([
      ...TIER_FEATURE_ORDER,
    ])
  })

  it('ignores a key the client has never heard of', () => {
    // The tier list is edited by hand and will grow keys before a deployed
    // client knows them. Rendering an unknown key would mean rendering its
    // raw id as a label.
    const features = tierFeatures(tier({ time_travel: { allowed: true } }))
    expect(
      features.some((feature) => (feature.key as string) === 'time_travel'),
    ).toBe(false)
  })
})

describe('formatStorage', () => {
  const plain = (value: number) => String(value)

  it('uses whole gigabytes rather than four figures of megabytes', () => {
    // The reason this is not `assetStatus`'s formatBytes: that one stops at MB
    // and would print a tier's ten gigabytes as "10240 MB".
    expect(formatStorage(10 * 1024 ** 3, plain)).toBe('10 GB')
  })

  it('writes a sub-gigabyte allowance in megabytes', () => {
    expect(formatStorage(100 * 1024 ** 2, plain)).toBe('100 MB')
  })

  it('rounds to one decimal rather than showing a fraction of a byte', () => {
    expect(formatStorage(1.55 * 1024 ** 3, plain)).toBe('1.6 GB')
  })

  it('formats the digits with what it was handed', () => {
    // The caller brings the app's number formatting; the unit is not
    // translated, and the two are not the same decision.
    expect(formatStorage(2 * 1024 ** 3, (value) => `[${value}]`)).toBe('[2] GB')
  })
})
