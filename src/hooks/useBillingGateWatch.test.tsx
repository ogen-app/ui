import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, waitFor } from '@testing-library/react'

import { ENTITLEMENTS_KEY } from '@/hooks/useEntitlements'
import { complimentaryEnded } from '@/lib/complimentaryMemory'
import { renderWithProviders } from '@/test/renderWithProviders'
import type { WorkspacePlan } from '@/types/entitlements'
import { useBillingGateWatch } from './useBillingGateWatch'

/**
 * AC6 of CON-402: an operator ends a tester's access while their tab is open,
 * the stream invalidates the plan, the refetch reads the gate closed — and the
 * tab goes to `/plans` on that, without a reload or a refused click.
 */

vi.mock('@/hooks/useWorkspaces', () => ({
  useWorkspace: () => ({ id: 'ws-1', name: 'Acme Roasters', role: 'owner' }),
}))

const getWorkspacePlan = vi.fn<() => Promise<WorkspacePlan>>()
vi.mock('@/services/api/entitlements', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/services/api/entitlements')>()),
  getWorkspacePlan: () => getWorkspacePlan(),
}))

function plan(billing: Partial<WorkspacePlan['billing']>): WorkspacePlan {
  return {
    tier: { tierId: 'max', name: 'Max' } as WorkspacePlan['tier'],
    billing: {
      required: false,
      trialEligible: true,
      complimentary: false,
      ...billing,
    },
    entitlements: {},
  }
}

function Watcher() {
  useBillingGateWatch()
  return null
}

beforeEach(() => getWorkspacePlan.mockReset())
afterEach(() => localStorage.clear())

describe('useBillingGateWatch', () => {
  it('sends the tab to /plans when a refetch finds the gate closed', async () => {
    getWorkspacePlan.mockResolvedValue(plan({ complimentary: true }))
    const { router, queryClient } = await renderWithProviders(<Watcher />, {
      path: '/workspace-settings',
    })
    await waitFor(() => expect(getWorkspacePlan).toHaveBeenCalled())
    expect(router.state.location.pathname).toBe('/workspace-settings')

    // What `entity:billing` + `entity:entitlements` do: invalidate, refetch.
    getWorkspacePlan.mockResolvedValue(plan({ required: true }))
    await act(() =>
      queryClient.invalidateQueries({ queryKey: ENTITLEMENTS_KEY }),
    )

    await waitFor(() => expect(router.state.location.pathname).toBe('/plans'))
    // …and the gate there knows why it appeared.
    expect(complimentaryEnded('ws-1', plan({ required: true }))).toBe(true)
  })

  it('leaves an ungated workspace where it is', async () => {
    getWorkspacePlan.mockResolvedValue(plan({ complimentary: true }))
    const { router } = await renderWithProviders(<Watcher />, {
      path: '/workspace-settings',
    })
    await waitFor(() => expect(getWorkspacePlan).toHaveBeenCalled())

    expect(router.state.location.pathname).toBe('/workspace-settings')
  })
})
