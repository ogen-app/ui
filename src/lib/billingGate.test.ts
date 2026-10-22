import { afterEach, describe, expect, it, vi } from 'vitest'

import type { WorkspacePlan } from '@/types/entitlements'

/**
 * `handleBillingRequired` latches — once it has sent the tab away it never
 * fires again — so the tests that exercise it each take a fresh module.
 */
async function freshModule() {
  vi.resetModules()
  return import('./billingGate')
}

function atPath(pathname: string) {
  const assign = vi.fn()
  Object.defineProperty(window, 'location', {
    configurable: true,
    value: { pathname, search: '', assign },
  })
  return assign
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('isGateExempt', () => {
  it('lets a gated workspace reach the plans, auth, invitations and the switcher', async () => {
    const { isGateExempt } = await freshModule()
    for (const path of [
      '/plans',
      '/auth/login',
      '/auth/logout',
      '/invite',
      '/workspaces',
      '/signup',
      '/server-unavailable',
    ]) {
      expect(isGateExempt(path)).toBe(true)
    }
  })

  it('gates the app itself', async () => {
    const { isGateExempt } = await freshModule()
    for (const path of ['/', '/campaigns', '/workspace-settings', '/plansx']) {
      expect(isGateExempt(path)).toBe(false)
    }
  })
})

describe('handleBillingRequired', () => {
  it('sends the tab to /plans, once, however many requests were refused', async () => {
    const assign = atPath('/campaigns')
    const { handleBillingRequired, isBillingRedirecting } = await freshModule()

    handleBillingRequired()
    handleBillingRequired()

    expect(assign).toHaveBeenCalledTimes(1)
    expect(assign).toHaveBeenCalledWith('/plans')
    expect(isBillingRedirecting()).toBe(true)
  })

  it('stays put on a route a gated workspace is allowed', async () => {
    // A request from `/plans` itself refused with 402 must not reload the
    // screen that is the answer to it.
    const assign = atPath('/plans')
    const { handleBillingRequired, isBillingRedirecting } = await freshModule()

    handleBillingRequired()

    expect(assign).not.toHaveBeenCalled()
    expect(isBillingRedirecting()).toBe(false)
  })
})

describe('subscribed', () => {
  const plan = (billingPeriod: 'month' | 'year' | null) =>
    ({ tier: { billingPeriod } }) as unknown as WorkspacePlan

  it('reads a live subscription off the billing period, not the redirect', async () => {
    const { subscribed } = await freshModule()
    expect(subscribed(plan('month'))).toBe(true)
    expect(subscribed(plan('year'))).toBe(true)
    expect(subscribed(plan(null))).toBe(false)
    expect(subscribed(undefined)).toBe(false)
  })
})
