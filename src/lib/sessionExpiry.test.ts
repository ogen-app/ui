import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AUTH_STORE_PERSIST_KEY } from '@/stores/constants'

/**
 * `handleUnauthorized` latches — once fired it never fires again for the life
 * of the module — so every test needs a fresh copy of it.
 */
async function freshModule() {
  vi.resetModules()
  return import('./sessionExpiry.ts')
}

/** Point jsdom's location at `path` and capture what the module navigates to. */
function atPath(path: string) {
  const assign = vi.fn()
  const [pathname, search = ''] = path.split(/(?=\?)/)
  Object.defineProperty(window, 'location', {
    configurable: true,
    value: { pathname, search, assign },
  })
  return assign
}

beforeEach(() => {
  localStorage.clear()
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('handleUnauthorized', () => {
  it('sends an expired session to login, carrying where it was', async () => {
    const assign = atPath('/campaigns/abc?tab=posts')
    const { handleUnauthorized } = await freshModule()

    handleUnauthorized()

    expect(assign).toHaveBeenCalledTimes(1)
    const url = assign.mock.calls[0][0] as string
    expect(url).toContain('/auth/login')
    expect(url).toContain('expired=1')
    // Round-trips: the guard reads this back out of the search param, so an
    // unescaped `?tab=` would silently truncate the return path.
    const back = new URLSearchParams(url.split('?')[1]).get('redirect')
    expect(back).toBe('/campaigns/abc?tab=posts')
  })

  it('drops the persisted user before reloading', async () => {
    // Otherwise the reloaded app paints a signed-in sidebar for the instant
    // before the root guard resolves.
    localStorage.setItem(AUTH_STORE_PERSIST_KEY, '{"state":{"user":{"id":"u1"}}}')
    atPath('/campaigns')
    const { handleUnauthorized } = await freshModule()

    handleUnauthorized()

    expect(localStorage.getItem(AUTH_STORE_PERSIST_KEY)).toBeNull()
  })

  it('redirects even when storage refuses', async () => {
    // Private mode and quota failures must not strand the user on a screen
    // where every request 401s.
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
      throw new Error('QuotaExceededError')
    })
    const assign = atPath('/campaigns')
    const { handleUnauthorized } = await freshModule()

    expect(() => handleUnauthorized()).not.toThrow()
    expect(assign).toHaveBeenCalledTimes(1)
  })

  it('fires once however many 401s arrive', async () => {
    // A screen with four queries produces four 401s in one tick; each must not
    // schedule its own navigation.
    const assign = atPath('/campaigns')
    const { handleUnauthorized } = await freshModule()

    handleUnauthorized()
    handleUnauthorized()
    handleUnauthorized()

    expect(assign).toHaveBeenCalledTimes(1)
  })

  it('ignores a 401 on the auth routes, where it is just the answer', async () => {
    const assign = atPath('/auth/login')
    const { handleUnauthorized } = await freshModule()

    handleUnauthorized()

    expect(assign).not.toHaveBeenCalled()
  })

  it('leaves the latch unset when it declines, so a later 401 still works', async () => {
    // Wrong login → 401 on /auth/login → declined. If that had latched, the
    // session expiring after a successful login would never redirect.
    atPath('/auth/login')
    const mod = await freshModule()
    mod.handleUnauthorized()
    expect(mod.isSessionExpiring()).toBe(false)

    const assign = atPath('/campaigns')
    mod.handleUnauthorized()
    expect(assign).toHaveBeenCalledTimes(1)
  })

  it('reports itself as expiring only after it has fired', async () => {
    // `lib/queryClient.ts` reads this to suppress the pile of mutation errors
    // that a 401 produces on the way out.
    atPath('/campaigns')
    const mod = await freshModule()

    expect(mod.isSessionExpiring()).toBe(false)
    mod.handleUnauthorized()
    expect(mod.isSessionExpiring()).toBe(true)
  })
})
