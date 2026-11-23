import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  bootstrapFlagOverrides,
  clearFlagOverrides,
  readFlagOverrides,
  serializeFlagOverrides,
  setFlagOverride,
} from './flagOverrides'
import { buildFlagValue, FLAG_IDS, isFeatureEnabled } from './featureFlags'

/**
 * Most of these run with `DEV_TOOLS` on, because vitest runs in dev mode. The
 * production half — the same code with dev tools off, as the production
 * container serves it — is the last block: see
 * `docs/technical-decisions.md#staging-flag-overrides`.
 */
const KNOWN = ['tasks', 'help-center', 'series']

/**
 * Forcing a flag *off* is only testable against a flag the build has on, and
 * on-flags are retired as their features settle — so the resolver's second case
 * finds one rather than naming it, and reports itself skipped in a build that
 * has none on at all.
 */
const ON_IN_BUILD = FLAG_IDS.find(buildFlagValue)

function visit(url: string) {
  window.history.replaceState(null, '', url)
}

beforeEach(() => {
  localStorage.clear()
  clearFlagOverrides()
  visit('/campaigns')
})

describe('setFlagOverride', () => {
  it('forces a flag on and off, and hands it back with null', () => {
    setFlagOverride('tasks', true)
    expect(readFlagOverrides()).toEqual({ tasks: true })

    setFlagOverride('tasks', false)
    expect(readFlagOverrides()).toEqual({ tasks: false })

    setFlagOverride('tasks', null)
    expect(readFlagOverrides()).toEqual({})
  })

  it('survives a reload', () => {
    setFlagOverride('tasks', true)
    // What the next page load would read back.
    expect(JSON.parse(localStorage.getItem('ogen.flagOverrides')!)).toEqual({
      tasks: true,
    })
  })

  it('leaves nothing behind once the last override is dropped', () => {
    setFlagOverride('tasks', true)
    setFlagOverride('tasks', null)
    expect(localStorage.getItem('ogen.flagOverrides')).toBeNull()
  })
})

describe('the resolver', () => {
  it('lets an override win over the build', () => {
    // `tasks` ships off — CON-234 is waiting on a table.
    expect(isFeatureEnabled('tasks')).toBe(false)
    setFlagOverride('tasks', true)
    expect(isFeatureEnabled('tasks')).toBe(true)
  })

  it.skipIf(!ON_IN_BUILD)('can force a flag off that the build has on', () => {
    const flag = ON_IN_BUILD!
    expect(isFeatureEnabled(flag)).toBe(true)
    setFlagOverride(flag, false)
    expect(isFeatureEnabled(flag)).toBe(false)
  })
})

describe('?ff=', () => {
  it('forces the names it lists and strips itself from the address bar', () => {
    visit('/campaigns?ff=tasks,-series')
    bootstrapFlagOverrides(KNOWN)

    expect(readFlagOverrides()).toEqual({
      tasks: true,
      series: false,
    })
    expect(window.location.search).toBe('')
  })

  it('merges into what is already stored, so bookmarks compose', () => {
    setFlagOverride('tasks', true)
    visit('/campaigns?ff=help-center')
    bootstrapFlagOverrides(KNOWN)

    expect(readFlagOverrides()).toEqual({ tasks: true, 'help-center': true })
  })

  it('clears everything when given no names', () => {
    setFlagOverride('tasks', true)
    visit('/campaigns?ff=')
    bootstrapFlagOverrides(KNOWN)

    expect(readFlagOverrides()).toEqual({})
  })

  it('refuses a name this build does not declare, and says so', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    visit('/campaigns?ff=taks')
    bootstrapFlagOverrides(KNOWN)

    expect(readFlagOverrides()).toEqual({})
    expect(warn).toHaveBeenCalled()
    warn.mockRestore()
  })

  it('keeps the rest of the query string', () => {
    visit('/campaigns?ff=tasks&redirect=%2Fposts')
    bootstrapFlagOverrides(KNOWN)

    expect(window.location.search).toBe('?redirect=%2Fposts')
  })

  it('does nothing at all when absent', () => {
    setFlagOverride('tasks', true)
    visit('/campaigns')
    bootstrapFlagOverrides(KNOWN)

    expect(readFlagOverrides()).toEqual({ tasks: true })
  })
})

describe('a corrupted key', () => {
  it('is ignored rather than throwing', () => {
    localStorage.setItem('ogen.flagOverrides', 'not json')
    // The read happens at module load, so assert the recovery path directly:
    // a write still lands and the bad value is replaced.
    setFlagOverride('tasks', true)
    expect(readFlagOverrides()).toEqual({ tasks: true })
  })
})

describe('serializeFlagOverrides', () => {
  it('round-trips through the query parameter', () => {
    const set = { tasks: true, 'help-center': false }
    visit(`/campaigns?ff=${serializeFlagOverrides(set)}`)
    bootstrapFlagOverrides(KNOWN)

    expect(readFlagOverrides()).toEqual(set)
  })
})

describe('with dev tools off, as production serves it', () => {
  /** A fresh copy of the module, loaded the way the production image loads it. */
  async function loadOff() {
    vi.stubEnv('DEV', false)
    window.__OGEN_CONFIG__ = {}
    vi.resetModules()
    return import('./flagOverrides')
  }

  afterEach(() => {
    delete window.__OGEN_CONFIG__
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
  })

  it('never reads a stored override', async () => {
    localStorage.setItem('ogen.flagOverrides', JSON.stringify({ tasks: true }))
    const getItem = vi.spyOn(Storage.prototype, 'getItem')

    const mod = await loadOff()

    expect(mod.DEV_TOOLS).toBe(false)
    expect(mod.readFlagOverrides()).toEqual({})
    expect(getItem).not.toHaveBeenCalled()
  })

  it('leaves the resolver on the build’s value', async () => {
    localStorage.setItem('ogen.flagOverrides', JSON.stringify({ tasks: true }))
    await loadOff()
    const { isFeatureEnabled: resolve } = await import('./featureFlags')

    // `tasks` ships off; the stored override must not turn it on.
    expect(resolve('tasks')).toBe(false)
  })

  it('refuses to write, from code or from a link', async () => {
    const mod = await loadOff()
    const setItem = vi.spyOn(Storage.prototype, 'setItem')

    mod.setFlagOverride('tasks', true)
    visit('/campaigns?ff=tasks')
    mod.bootstrapFlagOverrides(KNOWN)

    expect(mod.readFlagOverrides()).toEqual({})
    expect(setItem).not.toHaveBeenCalled()
    // Not an instruction it acts on, so not one it strips either.
    expect(window.location.search).toBe('?ff=tasks')
  })
})
