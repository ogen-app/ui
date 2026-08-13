import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * The 403 recovery, and the reason it is allowed to exist at all.
 *
 * A tab pinned to a workspace it has been removed from cannot fix itself: the
 * header it keeps sending is what the server is refusing. But 403 is *also* the
 * ordinary answer to a member calling an owner-only route, and tearing the page
 * down over a permission error would be worse than the bug this fixes. So the
 * whole design is "verify, then act" — and that is what these assert.
 */
const isEnabled = vi.hoisted(() => vi.fn(() => true))
vi.mock('@/config/featureFlags', () => ({ isFeatureEnabled: isEnabled }))

const assign = vi.fn()

/** Fresh module state per test: the recovery latches itself after it fires. */
async function load() {
  vi.resetModules()
  const activeWorkspace = await import('./activeWorkspace')
  const staleWorkspace = await import('./staleWorkspace')
  return { ...activeWorkspace, ...staleWorkspace }
}

function respondWith(workspaces: unknown, ok = true) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => ({ ok, json: async () => workspaces }) as unknown as Response),
  )
}

beforeEach(() => {
  isEnabled.mockReturnValue(true)
  assign.mockClear()
  Object.defineProperty(window, 'location', {
    configurable: true,
    value: { assign, pathname: '/', search: '' },
  })
})

afterEach(() => {
  vi.unstubAllGlobals()
  sessionStorage.clear()
})

describe('handleForbidden', () => {
  it('unpins the tab and reloads when the workspace is no longer the account’s', async () => {
    const { setActiveWorkspaceId, getActiveWorkspaceId, handleForbidden } = await load()
    setActiveWorkspaceId('ws-gone')
    respondWith([{ id: 'ws-a' }, { id: 'ws-b' }])

    handleForbidden()
    await vi.waitFor(() => expect(assign).toHaveBeenCalledWith('/'))
    expect(getActiveWorkspaceId()).toBeNull()
  })

  it('leaves the tab alone when the workspace is still ours — that 403 was a permission', async () => {
    const { setActiveWorkspaceId, getActiveWorkspaceId, handleForbidden } = await load()
    setActiveWorkspaceId('ws-a')
    respondWith([{ id: 'ws-a' }])

    handleForbidden()
    await vi.waitFor(() => expect(fetch).toHaveBeenCalled())
    expect(assign).not.toHaveBeenCalled()
    expect(getActiveWorkspaceId()).toBe('ws-a')
  })

  it('does nothing when the check itself fails — offline is not evidence', async () => {
    const { setActiveWorkspaceId, handleForbidden } = await load()
    setActiveWorkspaceId('ws-a')
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new TypeError('network')
      }),
    )

    handleForbidden()
    await vi.waitFor(() => expect(fetch).toHaveBeenCalled())
    expect(assign).not.toHaveBeenCalled()
  })

  it('does not ask when the tab has nothing pinned, or while the feature is off', async () => {
    const { setActiveWorkspaceId, handleForbidden } = await load()
    respondWith([])

    handleForbidden() // nothing pinned
    setActiveWorkspaceId('ws-a')
    isEnabled.mockReturnValue(false)
    handleForbidden() // flag off

    expect(fetch).not.toHaveBeenCalled()
  })
})
