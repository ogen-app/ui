import type { TFunction } from 'i18next'

/**
 * The codes a Google sign-in comes back with as `?error=` (CON-395 §9).
 *
 * The callback is a browser navigation, so a refusal can't be a JSON body: the
 * server redirects to the login page (or, for connecting from Profile, back to
 * Profile) with one of these. Each is worded by its code — never by prose, of
 * which there is none — and one this build predates falls back to a generic
 * sentence rather than showing the raw code.
 */
const GOOGLE_ERROR_CODES = [
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
] as const

export type GoogleErrorCode = (typeof GOOGLE_ERROR_CODES)[number]

function isKnown(code: string): code is GoogleErrorCode {
  return (GOOGLE_ERROR_CODES as readonly string[]).includes(code)
}

/**
 * The sentence for an `?error=` code, or `undefined` when there is none.
 *
 * Plain, one sentence, no blame, and the next step included — it is shown in
 * the login subtitle, uncoloured, exactly where "your session expired" goes,
 * because none of these is the person's fault and the form under it is the way
 * forward.
 */
export function googleErrorMessage(
  t: TFunction,
  code: string | undefined,
): string | undefined {
  if (!code) return undefined
  return isKnown(code)
    ? t(`auth.google.errors.${code}`)
    : t('auth.google.errors.unknown')
}
