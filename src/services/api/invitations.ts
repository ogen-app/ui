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
 * `POST /api/invitations/accept/:token` — public. Creates the invited user
 * with the invited role, opens a session and sets the cookie, so the caller is
 * signed in on return and should go straight into the app.
 *
 * The password is validated before the token is spent, so a rejected one
 * leaves the invitation usable. A `409` means the address gained an account
 * between the invite and now — the only failure with a different fix (log in).
 */
export async function acceptInvitation(
  token: string,
  payload: { name: string; password: string },
): Promise<User> {
  const body = await apiJson<{ user: RawUser; tenant?: User['tenant'] }>(
    `/api/invitations/accept/${encodeURIComponent(token)}`,
    'Unable to accept the invitation',
    { method: 'POST', body: payload },
  )
  return rawUserToUser({ ...body.user, tenant: body.tenant })
}
