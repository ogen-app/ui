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
 * Which one applies is not something the preview can tell the UI (it returns
 * the address, not whether that address is taken), so the credentials path is
 * the default and a `403` is the server saying "this is the other one, sign in
 * as them first". The invitation stays pending through that refusal, which is
 * what makes the round trip safe to use as the branch.
 *
 * The password is validated before the token is spent, so a rejected one also
 * leaves the invitation usable.
 */
export async function acceptInvitation(
  token: string,
  payload?: { name: string; password: string },
): Promise<User> {
  const body = await apiJson<{ user: RawUser; tenant?: User['tenant'] }>(
    `/api/invitations/accept/${encodeURIComponent(token)}`,
    'Unable to accept the invitation',
    // No body at all for the existing-account path: the server reads a present
    // body as "create an account" and would answer 409 for one that exists.
    payload ? { method: 'POST', body: payload } : { method: 'POST' },
  )
  return rawUserToUser({ ...body.user, tenant: body.tenant })
}
