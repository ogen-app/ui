import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Tenant } from '@/types/tenant'
import { putOnboarding, setupOf } from './onboarding'

/**
 * Setup's state on the workspace (CON-513). What is pinned is the translation
 * — no role is `''` on the wire and `null` here — and that a step name this
 * build doesn't know opens on the first.
 */

const tenant = (setup: Tenant['setup']): Tenant => ({
  id: 't1',
  name: 'Acme',
  slug: 'acme',
  created_at: '2026-11-24T10:00:00Z',
  updated_at: '2026-11-24T10:00:00Z',
  setup,
})

afterEach(() => vi.unstubAllGlobals())

describe('setupOf', () => {
  it('is null for a workspace made before setup existed', () => {
    expect(setupOf(tenant(null))).toBeNull()
    expect(setupOf(tenant(undefined))).toBeNull()
  })

  it('reads a role not chosen yet as none, and an unknown step as the first', () => {
    expect(
      setupOf(
        tenant({
          status: 'pending',
          step: 'campaign',
          reached: 'accounts',
          role: '',
          runId: null,
          updatedAt: null,
          finishedBy: null,
          finishedAt: null,
        }),
      ),
    ).toEqual({
      status: 'pending',
      step: 'you',
      reached: 'accounts',
      role: null,
      runId: null,
    })
  })
})

describe('putOnboarding', () => {
  it('writes the workspace’s setup, no role as the empty string', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ status: 'done' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    )
    vi.stubGlobal('fetch', fetchMock)
    await putOnboarding({
      status: 'done',
      step: 'accounts',
      reached: 'accounts',
      role: null,
      runId: 'r1',
    })
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toMatch(/\/api\/tenants\/current\/setup$/)
    expect(init.method).toBe('PUT')
    expect(JSON.parse(String(init.body))).toEqual({
      status: 'done',
      step: 'accounts',
      reached: 'accounts',
      role: '',
      runId: 'r1',
    })
  })
})
