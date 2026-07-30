/**
 * Workspaces — the multi-workspace model (CON-26, CON-94).
 *
 * Today a workspace *is* the tenant of CON-97, and a user belongs to exactly
 * one (`users.tenant_id NOT NULL`). This model breaks that: a user holds a
 * **membership** in many workspaces and works inside one at a time. The
 * server-side tenant boundary is unchanged and still fail-closed — what
 * changes is only which tenant the session is currently bound to.
 *
 * Nothing here is implemented on the API yet. The shapes are served by the
 * stub handlers in `src/mocks/` and exist to pin the contract down before the
 * Go side is written; see `docs/workspace-api.md` for the endpoint list and
 * the open questions the backend has to answer.
 */

/** A member's authority inside one workspace. Not global — a user can own one workspace and be a plain member of another. */
export type WorkspaceRole = 'owner' | 'admin' | 'member' | 'viewer'

/** Ordered weakest→strongest, so `ROLE_RANK[a] >= ROLE_RANK[b]` answers "can a do what b can". */
export const ROLE_RANK: Record<WorkspaceRole, number> = {
  viewer: 0,
  member: 1,
  admin: 2,
  owner: 3,
}

/** Strongest first — the order the UI offers them in. */
export const WORKSPACE_ROLES: WorkspaceRole[] = ['owner', 'admin', 'member', 'viewer']

/**
 * Two rank rules cover the whole permission matrix, so no screen has to
 * enumerate roles:
 *
 * - you may act on someone **below** your rank,
 * - you may grant a role **at or below** your own.
 *
 * Together they reproduce CON-147 §8: an admin manages members and viewers and
 * can promote to admin, but cannot touch another admin or an owner.
 *
 * Owners are the exception, and they have to be. Nobody outranks an owner, so
 * under the strict rule an owner row could never be edited by anyone — and
 * since a workspace may have several, an owner appointed by mistake would be
 * permanent. Owners therefore act on each other as peers, which also lets one
 * step down.
 *
 * What ranks *can't* express is the last-owner invariant — a workspace always
 * keeps at least one owner — because that depends on the whole member list, not
 * on two roles. The server owns it and answers 409; the UI counts owners to
 * grey the control out first.
 */
export function canActOnMember(actor: WorkspaceRole, target: WorkspaceRole): boolean {
  if (ROLE_RANK[actor] > ROLE_RANK[target]) return true
  return actor === 'owner' && target === 'owner'
}

export function canGrantRole(actor: WorkspaceRole, role: WorkspaceRole): boolean {
  return ROLE_RANK[actor] >= ROLE_RANK[role]
}

/** The roles `actor` is allowed to hand out, strongest first. */
export function grantableRoles(actor: WorkspaceRole): WorkspaceRole[] {
  return WORKSPACE_ROLES.filter((role) => canGrantRole(actor, role))
}

/** Invites, member management and workspace settings all sit behind this one line. */
export function canManageWorkspace(actor: WorkspaceRole): boolean {
  return ROLE_RANK[actor] >= ROLE_RANK.admin
}

export const ROLE_LABELS: Record<WorkspaceRole, string> = {
  owner: 'Owner',
  admin: 'Admin',
  member: 'Member',
  viewer: 'Viewer',
}

/**
 * What each role can do, phrased to complete "…will be able to ___" so the UI
 * can name the person and the permission in one sentence.
 */
export const ROLE_ABILITIES: Record<WorkspaceRole, string> = {
  owner:
    'do everything here, including billing, deleting the workspace and appointing other owners.',
  admin: 'invite people, connect social accounts and change workspace settings.',
  member: 'plan, write and publish content, but not change workspace settings.',
  viewer: 'read campaigns, posts and assets, but not change or publish anything.',
}

/**
 * A workspace as the caller sees it. `role` and `is_active` are
 * caller-relative — they come from the membership, not the workspace row —
 * which is why the list endpoint can't be a plain `SELECT * FROM workspaces`.
 */
export type Workspace = {
  id: string
  name: string
  /** Assigned at creation from the name, stable across renames (CON-97). */
  slug: string
  /** The caller's role in this workspace. */
  role: WorkspaceRole
  member_count: number
  /** Whether the caller's session is currently bound to this workspace. */
  is_active: boolean
  created_at: string
  updated_at: string
}

/** One person's membership of a workspace, flattened with their user record for display. */
export type WorkspaceMember = {
  /** Membership id, not user id — a user has one of these per workspace. */
  id: string
  user_id: string
  name: string
  email: string
  role: WorkspaceRole
  joined_at: string
  /** True for the caller's own row, so the UI can label it and block self-removal. */
  is_self: boolean
}

export type InvitationStatus = 'pending' | 'accepted' | 'expired' | 'revoked'

/**
 * An outstanding invitation. Invitations are addressed to an **email**, not a
 * user id: the invitee may not have an Ogen account yet, and accepting is what
 * creates the membership (and, for a new email, the user).
 */
export type WorkspaceInvitation = {
  id: string
  email: string
  role: WorkspaceRole
  /** Display name of whoever sent it. */
  invited_by: string
  status: InvitationStatus
  created_at: string
  expires_at: string
}

/**
 * No `timezone`: everything is UTC until CON-94 lands, and a field the UI can't
 * set is a field the API shouldn't have to accept. The zone arrives with the
 * scheduling surfaces that read it, as one piece of work.
 */
export type CreateWorkspacePayload = {
  name: string
}

export type UpdateWorkspacePayload = {
  name?: string
}

export type InvitePayload = {
  email: string
  role: WorkspaceRole
}
