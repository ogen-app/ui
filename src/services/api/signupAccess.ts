import { apiJson } from './http'
import { ApiError } from './errors'

/**
 * Who may sign up, and the tester invite somebody arrived with (CON-333 §6.9,
 * CON-402).
 *
 *     GET /api/signup-config          → 200 {"mode": "open" | "invite_only"}
 *     GET /api/tenant-invites/:token  → 200 {"email", "expires_at"} | 410
 *
 * Both are public and carry no workspace header (`base.ts`). The mode governs
 * **self-registration only**: a tester invite works in either, which is why the
 * invite screen never asks for the mode at all.
 *
 * Neither read is the enforcement. The server refuses a token-less signup with
 * 403 `invite_required` whatever this file said, so a read that fails is taken
 * as `open` — the form shows, and a refusal still lands on the private-beta
 * screen — rather than locking a stranger out of an open product on a blip.
 */

export type SignupMode = 'open' | 'invite_only'

type SignupConfigBody = { mode?: string | null }

/** What the server answers for a usable tester invite. */
export type TenantInvitePreview = {
  /** The invited address. The signup form locks its email field to this. */
  email: string
  expiresAt: string | null
}

type TenantInviteBody = { email: string; expires_at?: string | null }

/**
 * The refusals the signup routes answer with a `code` (CON-333 §7) — on
 * `POST /api/tenants`, `POST /api/auth/google/complete` and, for the last one,
 * `POST /api/workspaces`. A 410 carries no code: every unusable invite gets
 * the same one, and `isInviteGone` reads it by status.
 */
export const INVITE_REQUIRED = 'invite_required'
export const INVITE_EMAIL_MISMATCH = 'invite_email_mismatch'
export const WORKSPACE_LIMIT = 'workspace_limit'

export function signupModeFromWire(body: SignupConfigBody): SignupMode {
  return body.mode === 'invite_only' ? 'invite_only' : 'open'
}

export function getSignupConfig(): Promise<SignupMode> {
  return apiJson<SignupConfigBody>(
    '/api/signup-config',
    'Unable to read the signup settings',
  )
    .then(signupModeFromWire)
    .catch(() => 'open' as const)
}

/**
 * The invite behind a `/signup?invite=` link, or `null` when it cannot be
 * used — unknown, expired, revoked, replaced or already redeemed, which the
 * server deliberately does not tell apart. Anything other than a 410 still
 * throws, so a network failure is not mistaken for a dead invite.
 */
export async function getTenantInvite(
  token: string,
): Promise<TenantInvitePreview | null> {
  try {
    const body = await apiJson<TenantInviteBody>(
      `/api/tenant-invites/${encodeURIComponent(token)}`,
      'Unable to read this invite',
    )
    return { email: body.email, expiresAt: body.expires_at ?? null }
  } catch (error) {
    if (isInviteGone(error)) return null
    throw error
  }
}

/** The invite was spent or withdrawn — on the preview, or on a submit that lost a race. */
export function isInviteGone(error: unknown): boolean {
  return error instanceof ApiError && error.status === 410
}

export function isInviteRequired(error: unknown): boolean {
  return (
    error instanceof ApiError &&
    error.status === 403 &&
    error.code === INVITE_REQUIRED
  )
}

export function isInviteEmailMismatch(error: unknown): boolean {
  return (
    error instanceof ApiError &&
    error.status === 403 &&
    error.code === INVITE_EMAIL_MISMATCH
  )
}

export function isWorkspaceLimit(error: unknown): boolean {
  return (
    error instanceof ApiError &&
    error.status === 403 &&
    error.code === WORKSPACE_LIMIT
  )
}
