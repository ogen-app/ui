import { describe, expect, it } from 'vitest'
import { loginSubtitle } from './page'

describe('loginSubtitle', () => {
  it('explains an arrival the user did not ask for', () => {
    // Without this, a session that expired mid-edit reads as the app having
    // randomly logged you out.
    expect(loginSubtitle({ expired: true })).toMatch(/session expired/i)
  })

  it('explains an arrival from a finished reset', () => {
    expect(loginSubtitle({ reset: true })).toMatch(/password has been changed/i)
  })

  it('prefers the expiry when both flags somehow arrive', () => {
    // Only reachable by a hand-written URL, but the two are not equally
    // urgent: one says you are locked out, the other says you succeeded.
    expect(loginSubtitle({ expired: true, reset: true })).toMatch(/session expired/i)
  })

  it('says the ordinary thing on an ordinary visit', () => {
    expect(loginSubtitle({})).toBe('Log in to continue managing your content')
  })
})
