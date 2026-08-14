/**
 * Workspace API — the workspace itself, its people and its invitations.
 *
 * A workspace **is** the tenant and a member **is** a user, so this module is a
 * façade: the screens ask it workspace questions and it asks the server tenant
 * and user ones.
 *
 * - `/api/tenants/current` and `PUT /api/tenants/:id` — read and rename,
 * - `/api/users` — the member list, roles and removal,
 * - `/api/invitations` — invite, list, revoke (CON-26).
 *
 * **None of those take a workspace id.** They are flat routes that act on
 * whichever workspace the request names in its `X-Workspace-Id` header — so
 * managing the people of workspace B means being pinned to B, not passing B in
 * a path (CON-147 §10). `services/api/base.ts` attaches the header; nothing
 * here has to think about it.
 *
 * The one thing the façade must not hide is what removal costs. See
 * `removeMember`.
 *
 * The account-level calls at the bottom (list, create, delete, switch) are the
 * exception: they belong to the login rather than to a workspace.
 */

import type { Tenant } from '@/types/tenant'
import type {
  CreateWorkspacePayload,
  InvitePayload,
  UpdateWorkspacePayload,
  Workspace,
  WorkspaceChoice,
  WorkspaceInvitation,
  WorkspaceMember,
  WorkspaceRole,
} from '@/types/workspace'
import { apiJson, apiVoid } from './http'
import type { RawUser } from './users'

/**
 * `GET /api/tenants/current` — the workspace the session is bound to.
 *
 * Carries no role: the tenant row knows nothing about the caller. The role
 * comes off `GET /api/current_user`, and `useWorkspace` puts the two together.
 */
export function getWorkspace(): Promise<Tenant> {
  return apiJson<Tenant>('/api/tenants/current', 'Unable to load the workspace')
}

/**
 * `PUT /api/tenants/:id` — rename. Any id but the caller's own answers 404.
 *
 * `name` is required by the server even though it is the only field, so this
 * takes the whole value rather than a patch. The slug does not follow a rename
 * (CON-97 §7.3).
 */
export function updateWorkspace(
  id: string,
  payload: UpdateWorkspacePayload,
): Promise<Tenant> {
  return apiJson<Tenant>(`/api/tenants/${id}`, 'Unable to update the workspace', {
    method: 'PUT',
    body: payload,
  })
}

/**
 * `GET /api/users` — everyone in the workspace, oldest first.
 *
 * Readable by any member: knowing who you work with is not an owner's
 * privilege. `is_self` is stamped here from the caller's id, since the server
 * doesn't mark the row.
 */
export async function listMembers(callerId: string): Promise<WorkspaceMember[]> {
  const raw = await apiJson<RawUser[]>('/api/users', 'Unable to load members')
  return raw.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role ?? 'member',
    joined_at: u.created_at,
    is_self: u.id === callerId,
  }))
}

/**
 * `PATCH /api/users/:id/role` — owner only.
 *
 * A workspace may have several owners, so promoting grants ownership rather
 * than transferring it — nobody is demoted. The one thing the server refuses is
 * demoting the last owner (409).
 */
export async function updateMemberRole(
  userId: string,
  role: WorkspaceRole,
  callerId: string,
): Promise<WorkspaceMember> {
  const u = await apiJson<RawUser>(
    `/api/users/${userId}/role`,
    'Unable to change the role',
    { method: 'PATCH', body: { role } },
  )
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    joined_at: u.created_at,
    is_self: u.id === callerId,
  }
}

/**
 * `DELETE /api/users/:id` — **deletes the person, not a membership.**
 *
 * There is no membership row to detach: one user belongs to one tenant, so the
 * server hard-deletes the `users` row, and the schema cascades from `users.id`
 * into `sessions`, `tags`, `campaigns`, `assets`, `posts` and
 * `post_attachments` via `ON DELETE CASCADE` on `created_by`. Removing a
 * teammate therefore destroys everything they ever made, for everybody.
 *
 * Callers must say that in the confirmation, in those terms. When CON-147
 * splits memberships from users this becomes the detach it currently pretends
 * to be — until then the copy carries the difference.
 *
 * Owner-gated for anyone else's id; a member may pass their own (which is
 * account deletion, and lives on Profile). The last owner cannot go, 409.
 */
export function removeMember(userId: string): Promise<void> {
  return apiVoid(`/api/users/${userId}`, 'Unable to remove the member', {
    method: 'DELETE',
  })
}

/**
 * `GET /api/invitations` — every invitation ever issued, newest first, owner
 * only.
 *
 * Accepted and revoked rows come back too, and expiry is not a status: a
 * pending row whose `expires_at` has passed *is* the expired one. Filtering is
 * the caller's (`invitationState`).
 */
export function listInvitations(): Promise<WorkspaceInvitation[]> {
  return apiJson<WorkspaceInvitation[]>('/api/invitations', 'Unable to load invitations')
}

/**
 * `POST /api/invitations` — invites by email and sends the mail. Owner only.
 *
 * **Idempotent per email, which makes it the resend too** (CON-147 §7.3): a
 * pending invitation for the address — live or expired — is replaced in the
 * minting transaction with a fresh token, expiry, role and email (200); a
 * brand-new one answers 201. There is no separate resend endpoint. An address
 * that already holds an Ogen account may still be invited — accepting attaches
 * the workspace to that account — and the one refusal is 409 for an address
 * already a member of *this* workspace. Rate-limited per workspace and per IP:
 * 429 carries `Retry-After`.
 *
 * The UI shows the server's message rather than pre-checking against a list
 * that can be stale.
 */
export function inviteMember(payload: InvitePayload): Promise<WorkspaceInvitation> {
  return apiJson<WorkspaceInvitation>('/api/invitations', 'Unable to send the invitation', {
    method: 'POST',
    body: payload,
  })
}

/** `DELETE /api/invitations/:id` — revokes it; the emailed link stops working. Owner only. */
export function revokeInvitation(invitationId: string): Promise<void> {
  return apiVoid(`/api/invitations/${invitationId}`, 'Unable to revoke the invitation', {
    method: 'DELETE',
  })
}

/* ------------------------------------------------------------------------ *
 * Multi-workspace (CON-147). These four are **account-level**: they carry no
 * `X-Workspace-Id`, which is what keeps them answerable from a tab whose own
 * workspace has just been deleted or revoked. Behind the `multi-workspace`
 * flag until ogen#109 ships — see `docs/workspace-api.md`.
 * ------------------------------------------------------------------------ */

const CHOICES = '/api/workspaces'

/**
 * `GET /api/workspaces` — every workspace the account belongs to, with the
 * account's role and the member count in each.
 *
 * Also the authority on *this* tab's role: `GET /api/current_user` answers for
 * the default workspace, not for wherever the tab has moved (`useWorkspace`).
 * And it is the recovery call — a tab that starts getting 403s asks this to
 * find out whether its workspace is still its own (`lib/staleWorkspace`).
 */
export function listWorkspaces(): Promise<WorkspaceChoice[]> {
  return apiJson<WorkspaceChoice[]>(CHOICES, 'Unable to load workspaces')
}

/**
 * `POST /api/workspaces` — creates a workspace with the caller as owner.
 *
 * Provisions a Zernio profile of its own, which is the point: one profile per
 * workspace is what lets the same person hold two accounts on the same
 * platform. Does not move any tab into it.
 */
export function createWorkspace(payload: CreateWorkspacePayload): Promise<Workspace> {
  return apiJson<Workspace>(CHOICES, 'Unable to create the workspace', {
    method: 'POST',
    body: payload,
  })
}

/**
 * `DELETE /api/workspaces/:id` — owner only, 204, and gone as far as the UI is
 * concerned (the server soft-deletes; there is no self-serve restore).
 *
 * Two refusals worth knowing: **409** when it is the account's only workspace —
 * the server will not leave you with nowhere to work — and 404 for a workspace
 * the account isn't a member of, which is how it avoids confirming that other
 * people's workspaces exist.
 */
export function deleteWorkspace(id: string): Promise<void> {
  return apiVoid(`${CHOICES}/${id}`, 'Unable to delete the workspace', { method: 'DELETE' })
}

/**
 * `POST /api/workspaces/:id/switch` — sets the account's **default** workspace.
 *
 * Not the switch itself. Since CON-147 the active workspace is per request and
 * per tab (`lib/activeWorkspace`); this only decides where the *next* fresh tab
 * or login starts. Nothing on screen depends on it, which is why
 * `useSwitchWorkspace` fires it without waiting and swallows a failure.
 */
export function switchWorkspace(id: string): Promise<void> {
  return apiVoid(`${CHOICES}/${id}/switch`, 'Unable to remember this workspace', {
    method: 'POST',
  })
}
