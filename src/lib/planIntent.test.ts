import { afterEach, describe, expect, it } from 'vitest'

import {
  afterSignupPath,
  clearPlanIntent,
  readPlanIntent,
  rememberPlanIntent,
} from './planIntent'

afterEach(() => {
  sessionStorage.clear()
})

describe('the plan picked on the pricing page', () => {
  it('survives signup and lands on /plans with that tier', () => {
    rememberPlanIntent('pro')

    expect(readPlanIntent()).toBe('pro')
    expect(afterSignupPath()).toBe('/plans?plan=pro')
  })

  it('carries nothing that is not a tier slug', () => {
    // It ends up in a URL and a `return_to`; anything else is not worth the
    // risk of carrying.
    for (const junk of ['', 'Pro Plan', '../x', '<script>', 7, null]) {
      rememberPlanIntent(junk)
      expect(readPlanIntent()).toBeNull()
    }
  })

  it('goes to the app when no plan was picked', () => {
    expect(afterSignupPath()).toBe('/')
  })

  it('is spent once /plans has read it', () => {
    rememberPlanIntent('max')
    clearPlanIntent()

    expect(readPlanIntent()).toBeNull()
  })
})
