/**
 * New-device login alerts — the two public endpoints behind
 * `/auth/secure-account`, where the "This wasn't me" link in the
 * `new_device_login` email lands (CON-317/318).
 *
 * The capability is the emailed token, not a session: the page has to work in
 * whatever browser the email was opened in, signed in or not.
 *
 * The split between the two calls is the whole design. Mail scanners (Outlook
 * Safe Links, Gmail's prefetcher) `GET` every link in an email, so the `GET`
 * is read-only and only the `POST` — sent from an explicit click, never on
 * load — revokes anything.
 *
 * These go through `scopedFetch` rather than `apiJson` for two reasons: a 429
 * has to surface its `Retry-After` header, and a refusal is a *state of the
 * token* the page renders, so it is typed here (`LoginAlertError`) instead of
 * being left as prose for the caller to match on.
 */

import { scopedFetch } from './base'

export type LoginAlertStatus = 'pending' | 'used' | 'expired'

/** `GET /api/security/login-alerts/:token` — what the email was about. */
export type LoginAlert = {
  status: LoginAlertStatus
  /** ISO timestamp of the sign-in. */
  login_at: string
  /** "Chrome on macOS". */
  device: string
  ip: string
  /** Approximate, from the IP; `""` when the server could not place it. */
  location: string
  /** Masked by the server — `j***@acme.com`. */
  email: string
}

/** `POST …/:token/secure` — every session is gone by the time this arrives. */
export type SecureAccountResult = {
  /** A ready-made `/auth/reset?token=…` link; the user sets a password next. */
  reset_url: string
  sessions_revoked: number
}

/**
 * Why a call was refused, as the page names it.
 *
 * `invalid` is a 404 — a token the server has never issued, or one cut short
 * by a mail client. `unavailable` covers everything that says nothing about
 * the token (network, 5xx), which is why it is the one the page offers a retry
 * for.
 */
export type LoginAlertFailure =
  'invalid' | 'used' | 'expired' | 'rate_limited' | 'unavailable'

export class LoginAlertError extends Error {
  readonly reason: LoginAlertFailure
  /** Only on `rate_limited`: how long the server asked us to wait. */
  readonly retryAfterSeconds?: number

  constructor(reason: LoginAlertFailure, retryAfterSeconds?: number) {
    // Deliberately no URL or token in the message — this can reach Sentry.
    super(`login alert: ${reason}`)
    this.name = 'LoginAlertError'
    this.reason = reason
    this.retryAfterSeconds = retryAfterSeconds
  }
}

/**
 * Used when a 429 arrives without a readable `Retry-After`. A minute is the
 * shortest wait the page can state in its "try again in N minutes" copy.
 */
const DEFAULT_RETRY_AFTER_SECONDS = 60

/** `Retry-After` is either delta-seconds or an HTTP date (RFC 9110 §10.2.3). */
export function parseRetryAfter(
  value: string | null,
  now: number = Date.now(),
): number {
  if (!value) return DEFAULT_RETRY_AFTER_SECONDS
  const seconds = Number(value)
  if (Number.isFinite(seconds) && seconds > 0) return Math.ceil(seconds)
  const at = Date.parse(value)
  if (Number.isFinite(at) && at > now) return Math.ceil((at - now) / 1000)
  return DEFAULT_RETRY_AFTER_SECONDS
}

async function refusal(res: Response): Promise<LoginAlertError> {
  if (res.status === 404) return new LoginAlertError('invalid')
  if (res.status === 429) {
    return new LoginAlertError(
      'rate_limited',
      parseRetryAfter(res.headers.get('Retry-After')),
    )
  }
  if (res.status === 410) {
    let code: unknown
    try {
      code = ((await res.json()) as { error?: unknown }).error
    } catch {
      // A 410 with no readable body is still a spent token.
    }
    if (code === 'token_used') return new LoginAlertError('used')
    // `token_expired`, and any 410 this build predates: the link is dead
    // either way, and the expired screen's way out (a password reset) is the
    // one that works for both.
    return new LoginAlertError('expired')
  }
  return new LoginAlertError('unavailable')
}

async function send(
  path: string,
  init: Parameters<typeof scopedFetch>[1] = {},
): Promise<Response> {
  let res: Response
  try {
    res = await scopedFetch(path, init)
  } catch {
    throw new LoginAlertError('unavailable')
  }
  if (!res.ok) throw await refusal(res)
  return res
}

function alertPath(token: string): string {
  return `/api/security/login-alerts/${encodeURIComponent(token)}`
}

/** `GET /api/security/login-alerts/:token` — read-only; safe for a scanner to hit. */
export async function getLoginAlert(token: string): Promise<LoginAlert> {
  const res = await send(alertPath(token))
  return (await res.json()) as LoginAlert
}

/**
 * `POST /api/security/login-alerts/:token/secure` — signs out every session on
 * every device, this browser's included, and spends the token.
 */
export async function secureAccount(
  token: string,
): Promise<SecureAccountResult> {
  const res = await send(`${alertPath(token)}/secure`, { method: 'POST' })
  return (await res.json()) as SecureAccountResult
}
