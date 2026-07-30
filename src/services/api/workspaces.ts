/**
 * Workspaces API — multi-workspace membership, people and preferences.
 *
 * ⚠️ **None of these endpoints exist on the Go API yet.** They are served in
 * development by the stub handlers in `src/mocks/handlers.ts`, which is
 * deliberately written as request/response pairs so it doubles as the spec
 * handed to the backend. See `docs/workspace-api.md`.
 *
 * The load-bearing decision here is `switchWorkspace()`: the workspace a request
 * reads is **bound to the session**, not passed per-request. Every existing
 * endpoint already resolves its tenant from the session cookie and fails
 * closed, so switching workspaces means rebinding that one value — no other
 * route changes, and no route can be tricked into reading the wrong workspace
 * by a client that forgets a header. The cost is that a session is one
 * workspace at a time; two browser tabs cannot sit in two workspaces. That
 * trade-off, and the header-based escape hatch, are written up in the doc.
 */

import type {
  CreateWorkspacePayload,
  InvitePayload,
  UpdateWorkspacePayload,
  Workspace,
  WorkspaceInvitation,
  WorkspaceMember,
  WorkspaceRole,
} from '@/types/workspace'
import { apiJson, apiVoid } from './http'

const BASE = '/api/workspaces'

/** `GET /api/workspaces` — every workspace the caller is a member of, with their role in each. */
export function listWorkspaces(): Promise<Workspace[]> {
  return apiJson<Workspace[]>(BASE, 'Unable to load workspaces')
}

/**
 * `POST /api/workspaces` — creates a workspace with the caller as owner.
 *
 * Provisions a Zernio profile of its own, which is the point: one profile per
 * workspace is what lets the same person hold two accounts on the same
 * platform (one per workspace). Does **not** switch to it — the caller decides
 * whether to follow with `switchWorkspace`.
 */
export function createWorkspace(payload: CreateWorkspacePayload): Promise<Workspace> {
  return apiJson<Workspace>(BASE, 'Unable to create the workspace', {
    method: 'POST',
    body: payload,
  })
}

/** `PATCH /api/workspaces/:id` — rename. Admin or owner. */
export function updateWorkspace(
  id: string,
  payload: UpdateWorkspacePayload,
): Promise<Workspace> {
  return apiJson<Workspace>(`${BASE}/${id}`, 'Unable to update the workspace', {
    method: 'PATCH',
    body: payload,
  })
}

/**
 * `DELETE /api/workspaces/:id` — owner only.
 *
 * The server soft-deletes (the row survives, writes are blocked, the workspace
 * leaves every member's list), but that is an operational safety net, not a
 * feature: there is no self-serve restore, so from the UI's point of view this
 * is gone. The copy says so.
 */
export function deleteWorkspace(id: string): Promise<void> {
  return apiVoid(`${BASE}/${id}`, 'Unable to delete the workspace', { method: 'DELETE' })
}

/**
 * `POST /api/workspaces/:id/switch` — rebinds the session to this workspace.
 *
 * Everything the app has cached belongs to the *previous* workspace, so the
 * caller must clear the query cache on success. `useSwitchWorkspace` does it.
 */
export function switchWorkspace(id: string): Promise<void> {
  return apiVoid(`${BASE}/${id}/switch`, 'Unable to switch workspace', {
    method: 'POST',
  })
}

/** `GET /api/workspaces/:id/members` */
export function listMembers(workspaceId: string): Promise<WorkspaceMember[]> {
  return apiJson<WorkspaceMember[]>(
    `${BASE}/${workspaceId}/members`,
    'Unable to load members',
  )
}

/**
 * `PATCH /api/workspaces/:id/members/:userId` — change someone's role.
 *
 * A workspace may have several owners, so promoting to `owner` grants it rather
 * than transferring it — nobody is demoted. The one thing the server refuses is
 * demoting the last owner (409): every workspace keeps at least one.
 */
export function updateMemberRole(
  workspaceId: string,
  userId: string,
  role: WorkspaceRole,
): Promise<WorkspaceMember> {
  return apiJson<WorkspaceMember>(
    `${BASE}/${workspaceId}/members/${userId}`,
    'Unable to change the role',
    { method: 'PATCH', body: { role } },
  )
}

/**
 * `DELETE /api/workspaces/:id/members/:userId` — removes a member; passing
 * one's own id is "leave workspace". The last owner cannot be removed.
 */
export function removeMember(workspaceId: string, userId: string): Promise<void> {
  return apiVoid(
    `${BASE}/${workspaceId}/members/${userId}`,
    'Unable to remove the member',
    { method: 'DELETE' },
  )
}

/** `GET /api/workspaces/:id/invitations` — outstanding invitations, newest first. */
export function listInvitations(workspaceId: string): Promise<WorkspaceInvitation[]> {
  return apiJson<WorkspaceInvitation[]>(
    `${BASE}/${workspaceId}/invitations`,
    'Unable to load invitations',
  )
}

/**
 * `POST /api/workspaces/:id/invitations` — invites by email and sends the mail.
 *
 * **Idempotent per email.** Posting an address that already has a live
 * invitation re-issues it: fresh token, fresh expiry, mail sent again, `200`
 * instead of `201`. That is deliberate — "resend" is the same act as "send",
 * and giving it its own endpoint would mean two routes that differ only in
 * whether the client already knew the invitation's id. It also removes a
 * failure mode: an invite that 409s because a pending one exists forces the
 * user to find and cancel it before they can do the obvious thing.
 *
 * 409 is still returned when the email is already a **member** — that is a
 * different situation with a different fix. The UI shows the server's message
 * rather than pre-checking against a list that can be stale.
 */
export function inviteMember(
  workspaceId: string,
  payload: InvitePayload,
): Promise<WorkspaceInvitation> {
  return apiJson<WorkspaceInvitation>(
    `${BASE}/${workspaceId}/invitations`,
    'Unable to send the invitation',
    { method: 'POST', body: payload },
  )
}

/** `DELETE /api/workspaces/:id/invitations/:invitationId` — revokes it; the link stops working. */
export function revokeInvitation(
  workspaceId: string,
  invitationId: string,
): Promise<void> {
  return apiVoid(
    `${BASE}/${workspaceId}/invitations/${invitationId}`,
    'Unable to revoke the invitation',
    { method: 'DELETE' },
  )
}
