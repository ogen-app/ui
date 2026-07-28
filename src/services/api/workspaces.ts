/**
 * Workspaces API — multi-workspace membership, people and preferences.
 *
 * ⚠️ **None of these endpoints exist on the Go API yet.** They are served in
 * development by the stub handlers in `src/mocks/handlers.ts`, which is
 * deliberately written as request/response pairs so it doubles as the spec
 * handed to the backend. See `docs/workspace-api.md`.
 *
 * The load-bearing decision here is `activate()`: the workspace a request
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
 * whether to follow with `activate`.
 */
export function createWorkspace(payload: CreateWorkspacePayload): Promise<Workspace> {
  return apiJson<Workspace>(BASE, 'Unable to create the workspace', {
    method: 'POST',
    body: payload,
  })
}

/** `PUT /api/workspaces/:id` — rename / re-zone. Admin or owner. */
export function updateWorkspace(
  id: string,
  payload: UpdateWorkspacePayload,
): Promise<Workspace> {
  return apiJson<Workspace>(`${BASE}/${id}`, 'Unable to update the workspace', {
    method: 'PUT',
    body: payload,
  })
}

/**
 * `DELETE /api/workspaces/:id` — owner only, and irreversible: campaigns,
 * posts, assets and connected accounts go with it.
 */
export function deleteWorkspace(id: string): Promise<void> {
  return apiVoid(`${BASE}/${id}`, 'Unable to delete the workspace', { method: 'DELETE' })
}

/**
 * `POST /api/workspaces/:id/activate` — rebinds the session to this workspace.
 *
 * Everything the app has cached belongs to the *previous* workspace, so the
 * caller must clear the query cache on success. `useSwitchWorkspace` does it.
 */
export function activateWorkspace(id: string): Promise<void> {
  return apiVoid(`${BASE}/${id}/activate`, 'Unable to switch workspace', {
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
 * `PUT /api/workspaces/:id/members/:userId` — change someone's role.
 *
 * Promoting to `owner` is a **transfer**: the server demotes the current owner
 * to admin in the same transaction, because a workspace has exactly one.
 */
export function updateMemberRole(
  workspaceId: string,
  userId: string,
  role: WorkspaceRole,
): Promise<WorkspaceMember> {
  return apiJson<WorkspaceMember>(
    `${BASE}/${workspaceId}/members/${userId}`,
    'Unable to change the role',
    { method: 'PUT', body: { role } },
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
 * 409 when the email already has a membership or a pending invitation; the UI
 * surfaces the server's message rather than pre-checking, since the list it
 * holds can be stale.
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

/** `POST /api/workspaces/:id/invitations/:invitationId/resend` — re-sends the mail and extends the expiry. */
export function resendInvitation(
  workspaceId: string,
  invitationId: string,
): Promise<WorkspaceInvitation> {
  return apiJson<WorkspaceInvitation>(
    `${BASE}/${workspaceId}/invitations/${invitationId}/resend`,
    'Unable to resend the invitation',
    { method: 'POST' },
  )
}
