import { describe, expect, it } from 'vitest'
import { googleErrorMessage } from './googleSignInError'
// The real, initialised instance — English is bundled, so `t` resolves
// synchronously and the assertions double as a catalogue check.
import { i18next } from '@/i18n'

const t = i18next.t

describe('googleErrorMessage', () => {
  it('says nothing when there is no code', () => {
    expect(googleErrorMessage(t, undefined)).toBeUndefined()
    expect(googleErrorMessage(t, '')).toBeUndefined()
  })

  it('words a known code by the code, with the way forward in it', () => {
    expect(googleErrorMessage(t, 'google_link_requires_password')).toMatch(
      /log in with your password, then connect google/i,
    )
    expect(googleErrorMessage(t, 'invite_email_mismatch')).toMatch(
      /continue with the google account it was sent to/i,
    )
  })

  it('never shows a raw code this build predates', () => {
    const message = googleErrorMessage(t, 'google_something_new')
    expect(message).toMatch(/didn't finish/i)
    expect(message).not.toContain('google_something_new')
  })

  it('has a sentence for every code the server sends', () => {
    // The list in CON-395 §9 plus the two the review added. A missing key
    // would render as the key itself.
    for (const code of [
      'google_cancelled',
      'google_state_invalid',
      'google_email_unverified',
      'google_unavailable',
      'google_link_requires_password',
      'google_already_connected',
      'google_linked_elsewhere',
      'no_active_workspace',
      'signup_invite_only',
      'invite_invalid',
      'invite_email_mismatch',
      'invite_seats_full',
      'throttled',
    ]) {
      const message = googleErrorMessage(t, code)
      expect(message, code).toBeTruthy()
      expect(message, code).not.toContain('auth.google.errors')
    }
  })
})
