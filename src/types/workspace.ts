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
    'do everything here, including billing, deleting the workspace and transferring ownership.',
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
  /** IANA zone, e.g. "Europe/Berlin". Drives every scheduling display (CON-94). */
  timezone: string
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

export type CreateWorkspacePayload = {
  name: string
  timezone: string
}

export type UpdateWorkspacePayload = {
  name?: string
  timezone?: string
}

export type InvitePayload = {
  email: string
  role: WorkspaceRole
}
