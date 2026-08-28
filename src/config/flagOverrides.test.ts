import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  bootstrapFlagOverrides,
  clearFlagOverrides,
  readFlagOverrides,
  serializeFlagOverrides,
  setFlagOverride,
} from './flagOverrides'
import { isFeatureEnabled } from './featureFlags'

/**
 * These run with `DEV_TOOLS` on, because vitest runs in dev mode — which is
 * the only configuration in which there is behaviour to test. The production
 * half is a build-time fold, asserted by the build rather than here: see
 * `docs/technical-decisions.md#staging-flag-overrides`.
 */
const KNOWN = ['tasks', 'activity', 'campaign-goals']

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

  it('can force a flag off that the build has on', () => {
    expect(isFeatureEnabled('campaign-goals')).toBe(true)
    setFlagOverride('campaign-goals', false)
    expect(isFeatureEnabled('campaign-goals')).toBe(false)
  })
})

describe('?ff=', () => {
  it('forces the names it lists and strips itself from the address bar', () => {
    visit('/campaigns?ff=tasks,-campaign-goals')
    bootstrapFlagOverrides(KNOWN)

    expect(readFlagOverrides()).toEqual({
      tasks: true,
      'campaign-goals': false,
    })
    expect(window.location.search).toBe('')
  })

  it('merges into what is already stored, so bookmarks compose', () => {
    setFlagOverride('tasks', true)
    visit('/campaigns?ff=activity')
    bootstrapFlagOverrides(KNOWN)

    expect(readFlagOverrides()).toEqual({ tasks: true, activity: true })
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
    const set = { tasks: true, activity: false }
    visit(`/campaigns?ff=${serializeFlagOverrides(set)}`)
    bootstrapFlagOverrides(KNOWN)

    expect(readFlagOverrides()).toEqual(set)
  })
})
