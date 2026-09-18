/**
 * Session API — login / logout / session probe.
 *
 * The backend sets an HTTPOnly session cookie on success, so the frontend
 * never handles the token directly. The probe hits `GET /api/current_user`,
 * which doubles as the reachability check *and* returns the authenticated
 * user (with the embedded tenant) in the same round-trip — the root guard
 * hydrates the auth store straight from it.
 */

import type { LoginPayload, Session } from '@/types/session'
import type { User } from '@/types/user'
import { apiUrl } from './base'
import {
  ServerUnavailableError,
  errorMessage,
  fetchOrThrowUnavailable,
} from './errors'
import { rawUserToUser, type RawUser } from './users'

/** `POST /api/sessions` — opens a session; the cookie is set by the server. */
export async function login(payload: LoginPayload): Promise<Session> {
  const res = await fetch(apiUrl('/api/sessions'), {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    throw new Error(await errorMessage(res, 'Unable to log in'))
  }
  return (await res.json()) as Session
}

/** `DELETE /api/sessions` — ends the current session. */
export async function logout(): Promise<void> {
  const res = await fetch(apiUrl('/api/sessions'), {
    method: 'DELETE',
    credentials: 'include',
  })
  if (!res.ok) {
    throw new Error(await errorMessage(res, 'Unable to log out'))
  }
}

let sessionCached: Promise<User | null> | null = null

/**
 * Resolves the authenticated user (with tenant) or `null` when there is no
 * valid session. The result is cached module-wide so the root guard's probe
 * runs once per page load; call `invalidateSession()` after login/logout/
 * signup to force a re-probe.
 */
export function checkSession(): Promise<User | null> {
  if (sessionCached === null) {
    sessionCached = fetchSession()
    // Never cache a server-unreachable failure — a later retry must re-probe.
    void sessionCached.catch(() => {
      sessionCached = null
    })
  }
  return sessionCached
}

/** Drops the cached probe so the next `checkSession()` hits the server. */
export function invalidateSession(): void {
  sessionCached = null
}

/** The uncached probe behind `checkSession()` — see the module docstring. */
async function fetchSession(): Promise<User | null> {
  // A network rejection surfaces as `ServerUnavailableError` (server down)
  // rather than being flattened into "not authenticated".
  const res = await fetchOrThrowUnavailable('/api/current_user', {
    method: 'GET',
    credentials: 'include',
  })
  // A 5xx (incl. the dev proxy's 500 when the backend is down) is an outage,
  // not a "logged out" signal — let it surface as ServerUnavailableError.
  if (res.status >= 500) throw new ServerUnavailableError()
  if (!res.ok) return null
  return rawUserToUser((await res.json()) as RawUser)
}
