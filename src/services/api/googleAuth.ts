/**
 * Sign in with Google (CON-395/396) and the account's sign-in methods.
 *
 * The OpenID Connect flow runs entirely on the server: the browser is *sent* to
 * `/api/auth/google/start` and comes back to the app through
 * `/api/auth/google/callback`, which sets the session cookie and redirects. So
 * there is no Google script here and nothing to `fetch` for the sign-in itself
 * — `googleStartUrl` builds the address and the caller navigates to it. A
 * failed sign-in lands on `?error=<code>` (`lib/googleSignInError`).
 *
 * The calls that *are* requests: whether Google is configured at all, the
 * one-field workspace step a newcomer finishes on, and the account's methods
 * in Profile.
 */

import type { User } from '@/types/user'
import type { Tenant } from '@/types/tenant'
import { apiUrl } from './base'
import { ApiError } from './errors'
import { apiJson, apiVoid } from './http'
import { rawUserToUser, type RawUser } from './users'

/** What a Google sign-in was started for — the server's `intent`. */
export type GoogleIntent = 'signin' | 'link' | 'invite'

/**
 * The address that starts a Google sign-in. Navigate to it — it answers with a
 * redirect to Google, not with JSON.
 *
 * `returnTo` is where the callback lands after signing in; the server keeps it
 * only when it is a same-site path, so an attacker-supplied value is harmless,
 * but callers still pass `safeRedirect`'s answer rather than raw input.
 */
export function googleStartUrl({
  intent = 'signin',
  returnTo,
  inviteToken,
}: {
  intent?: GoogleIntent
  returnTo?: string
  inviteToken?: string
} = {}): string {
  const q = new URLSearchParams()
  if (intent !== 'signin') q.set('intent', intent)
  if (returnTo && returnTo !== '/') q.set('return_to', returnTo)
  if (inviteToken) q.set('invite_token', inviteToken)
  const qs = q.toString()
  return apiUrl(`/api/auth/google/start${qs ? `?${qs}` : ''}`)
}

/** `GET /api/auth/providers` — which external sign-ins this server offers. */
export type AuthProviders = { google: { enabled: boolean } }

/**
 * Whether Google is configured on this server.
 *
 * A server that predates the endpoint answers 404; that is a real "no", not an
 * error worth showing. Anything else — a 5xx, the network — is rethrown rather
 * than turned into "disabled", so it is retried instead of cached for the
 * query's long stale time; the button stays hidden while it is unanswered.
 * A body that leaves a provider out is a "no" too — read here, once, so no
 * caller can trip over the missing key.
 */
export async function getAuthProviders(): Promise<AuthProviders> {
  try {
    const body = await apiJson<{ google?: { enabled?: boolean } } | null>(
      '/api/auth/providers',
      'Unable to check sign-in options',
    )
    return { google: { enabled: body?.google?.enabled === true } }
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) {
      return { google: { enabled: false } }
    }
    throw err
  }
}

/** `GET /api/auth/google/pending/:token` — who is finishing a Google sign-up. */
export type PendingGoogleSignup = {
  email: string
  /** Google's display name; `""` when the account shares none. */
  name: string
  expires_at: string
}

function pendingPath(token: string): string {
  return `/api/auth/google/pending/${encodeURIComponent(token)}`
}

/**
 * The pending sign-up behind the callback's `?token=`. Unknown, used and
 * expired tokens all answer 404 — the caller renders one "expired" screen for
 * all three.
 */
export function getPendingGoogleSignup(
  token: string,
): Promise<PendingGoogleSignup> {
  return apiJson<PendingGoogleSignup>(
    pendingPath(token),
    'Unable to load this sign-up',
  )
}

type RawCompleteResponse = {
  tenant: Tenant
  user: RawUser
  session: { id: string; user_id: string; expires_at: string }
  /** Where the person was headed when they started — a same-site path. */
  return_to: string
}

/**
 * `POST /api/auth/google/complete` — spends the pending sign-up and creates the
 * workspace, a passwordless account linked to the Google identity, and a
 * session (the cookie arrives on this response).
 *
 * Refusals keep their `code` on the thrown `ApiError`: `email_in_use` and
 * `google_already_linked` (409) both mean "this person already has an account —
 * continue with Google to sign in", 404 means the token is spent.
 */
export async function completeGoogleSignup(
  token: string,
  tenantName: string,
  /** A tester invite to redeem (CON-333) — refused with the same codes as `POST /api/tenants`. */
  inviteToken?: string,
): Promise<{ user: User; returnTo: string }> {
  const body = await apiJson<RawCompleteResponse>(
    '/api/auth/google/complete',
    'Unable to create the workspace',
    {
      method: 'POST',
      body: {
        token,
        tenant_name: tenantName.trim(),
        ...(inviteToken ? { invite_token: inviteToken } : {}),
      },
    },
  )
  return {
    user: rawUserToUser({ ...body.user, tenant: body.tenant }),
    returnTo: body.return_to || '/',
  }
}

/** One external sign-in linked to the account. */
export type AccountIdentity = {
  provider: 'google'
  /** The provider's address — may differ from the Ogen login email. */
  email: string
  linked_at: string
  last_used_at?: string
}

/** `GET /api/account/auth-methods` — every way into this account. */
export type AuthMethods = {
  has_password: boolean
  identities: AccountIdentity[]
}

export function getAuthMethods(): Promise<AuthMethods> {
  return apiJson<AuthMethods>(
    '/api/account/auth-methods',
    'Unable to load sign-in methods',
  )
}

/**
 * `DELETE /api/account/identities/:provider` — disconnects it and signs the
 * account's *other* sessions out. 409 `last_sign_in_method` when the account
 * has no password, which would leave it with no way in.
 */
export function disconnectIdentity(provider: 'google'): Promise<void> {
  return apiVoid(
    `/api/account/identities/${provider}`,
    'Unable to disconnect',
    { method: 'DELETE' },
  )
}
