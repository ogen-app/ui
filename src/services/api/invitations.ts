/**
 * Accepting an invitation (CON-26) — the two public routes.
 *
 * Both are unauthenticated on purpose: the emailed token *is* the capability,
 * and the person holding it has no account yet. Managing invitations from
 * inside a workspace is the other half, and lives in `workspaces.ts`.
 *
 * Every unusable token — unknown, expired, revoked, already accepted — answers
 * the same `410` with the same sentence, so neither route is an oracle for
 * which tokens exist. The UI must not try to be more specific than that.
 */

import type { User } from '@/types/user'
import type { WorkspaceRole } from '@/types/workspace'
import { apiJson } from './http'
import { rawUserToUser, type RawUser } from './users'

/** What the accept screen may say before anything is typed: enough to know what is being joined. */
export type InvitationPreview = {
  workspace_name: string
  inviter_name: string
  /** The address the invitation was sent to. The account is created with it, so it is not editable. */
  email: string
  role: WorkspaceRole
  /**
   * Whether the invited address already holds an Ogen account — which of the
   * two accept modes applies, told up front so the screen never collects a
   * password the server would refuse. The invitee holds the token and is
   * looking at their own address, so this discloses nothing to anyone else.
   */
  has_account: boolean
  expires_at: string
}

/** `GET /api/invitations/accept/:token` — public. */
export function previewInvitation(token: string): Promise<InvitationPreview> {
  return apiJson<InvitationPreview>(
    `/api/invitations/accept/${encodeURIComponent(token)}`,
    'This invitation link is invalid or has expired.',
  )
}

/**
 * `POST /api/invitations/accept/:token` — public, and **two acts behind one
 * route** (CON-147 §10).
 *
 * - **The address has no Ogen account.** Send `{name, password}`: the account,
 *   the membership and a session are created together, the cookie is set, and
 *   the caller is signed in on return. `201`.
 * - **The address already has one.** Send nothing. The server requires the
 *   caller to *be* that account already and adds the membership to it — no
 *   second set of credentials, no new cookie. `200`.
 *
 * The server picks the path itself, from whether the address has an account —
 * the body does not choose (credentials sent to the existing-account path are
 * ignored). The preview's `has_account` says which applies, so the screen
 * branches before anything is typed; a `403` remains the backstop for the race
 * where the account appears between preview and accept ("sign in as them
 * first"). The invitation stays pending through every refusal — a rejected
 * password or a signed-out accept leaves it usable.
 */
export async function acceptInvitation(
  token: string,
  payload?: { name: string; password: string },
): Promise<User> {
  const body = await apiJson<{ user: RawUser; tenant?: User['tenant'] }>(
    `/api/invitations/accept/${encodeURIComponent(token)}`,
    'Unable to accept the invitation',
    // The existing-account path sends no body — the server would ignore one,
    // but not sending credentials that cannot matter is the honest request.
    payload ? { method: 'POST', body: payload } : { method: 'POST' },
  )
  return rawUserToUser({ ...body.user, tenant: body.tenant })
}
