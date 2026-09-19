/**
 * Workspaces — the workspace, its people and its invitations (CON-26).
 *
 * A workspace **is** the tenant of CON-97, and a user belongs to exactly one:
 * `users.tenant_id` is `NOT NULL` and the role is a column on the user row.
 * That is why there is no membership type here — a member *is* a user, read
 * from `GET /api/users`, and "remove from workspace" is `DELETE /api/users/:id`
 * with everything that implies (see `removeMember`).
 *
 * Holding several workspaces and switching between them is CON-147;
 * `WorkspaceChoice` below is what `GET /api/workspaces` lists per membership.
 */

/**
 * A user's authority in their workspace. Two tiers, because that is what the
 * server recognises (`models.IsValidRole`): `owner` manages the workspace and
 * its people, `member` is a full content collaborator that cannot. CON-147
 * inserts `admin` between them — when it does, the server adds it first.
 */
export type WorkspaceRole = 'owner' | 'member'

/** Strongest first — the order the UI offers them in. */
export const WORKSPACE_ROLES: WorkspaceRole[] = ['owner', 'member']

/**
 * With two tiers the whole permission matrix is one question: are you an
 * owner. The three predicates below stay separate anyway because they answer
 * different questions and CON-147's `admin` will pull them apart again — a
 * caller that asks the right one keeps working when it does.
 *
 * Every rule here is the server's (`requireOwner`, CON-26 §7); this is the
 * mirror that greys a control out before the request, never the enforcement.
 */

/** Whether `actor` may change or remove a member holding `target`. */
export function canActOnMember(
  actor: WorkspaceRole,
  _target: WorkspaceRole,
): boolean {
  return actor === 'owner'
}

/** Whether `actor` may hand out `role`. An owner may appoint a co-owner. */
export function canGrantRole(
  actor: WorkspaceRole,
  _role: WorkspaceRole,
): boolean {
  return actor === 'owner'
}

/** The roles `actor` is allowed to hand out, strongest first. */
export function grantableRoles(actor: WorkspaceRole): WorkspaceRole[] {
  return WORKSPACE_ROLES.filter((role) => canGrantRole(actor, role))
}

/** Invites, people management and workspace settings all sit behind this one line. */
export function canManageWorkspace(actor: WorkspaceRole): boolean {
  return actor === 'owner'
}

/**
 * Whether `actor` may see and change what the workspace pays (CON-232).
 *
 * Separate from `canManageWorkspace` even though it answers the same today,
 * because it is a different question with a different answer coming: an admin
 * who runs the workspace is not automatically someone who should see the card
 * on file. The server draws the same line — `/api/billing` is owner-only — and
 * this is the mirror that keeps a member off a screen that would 403.
 */
export function canManageBilling(actor: WorkspaceRole): boolean {
  return actor === 'owner'
}

/**
 * What the server will not do whatever the roles say: leave a workspace with
 * no owner. It answers 409; the UI counts owners to grey the control out
 * first. Not expressible in the predicates above — it depends on the whole
 * member list, not on two roles.
 */
export function isLastOwner(member: WorkspaceMember, owners: number): boolean {
  return member.role === 'owner' && owners <= 1
}

/**
 * The same two roles as catalogue keys. Keys and not strings because this is
 * module scope: a `const` holding translated copy freezes whichever language
 * loaded first, so the lookup has to happen inside a render, through `t`.
 */
export const ROLE_LABEL_KEYS = {
  owner: 'workspace.role.owner',
  member: 'workspace.role.member',
  // `as const` so the values stay literal types — `t` only accepts keys the
  // catalogue actually has, and a `Record<_, string>` would widen them away.
  // `satisfies` keeps the exhaustiveness check the annotation was there for.
} as const satisfies Record<WorkspaceRole, string>

/** What each role can do — a caption under the role picker, one sentence each. */
export const ROLE_ABILITY_KEYS = {
  owner: 'workspace.ability.owner',
  member: 'workspace.ability.member',
} as const satisfies Record<WorkspaceRole, string>

/**
 * The workspace the session is bound to: the tenant, plus the caller's own
 * role in it. The two arrive from different endpoints — `GET
 * /api/tenants/current` and `GET /api/current_user` — because the role belongs
 * to the user, not to the workspace.
 */
export type Workspace = {
  id: string
  name: string
  /** Assigned at signup from the name, stable across renames (CON-97 §7.3). */
  slug: string
  /** The caller's role in this workspace. */
  role: WorkspaceRole
  created_at: string
  updated_at: string
}

/**
 * One person in the workspace, as `GET /api/users` sends them. `is_self` is
 * derived client-side by comparing ids — the endpoint doesn't mark the caller's
 * row, and doesn't need to.
 */
export type WorkspaceMember = {
  /** The user id. There is no separate membership row to have an id of its own. */
  id: string
  name: string
  email: string
  role: WorkspaceRole
  /** `users.created_at` — when the account was made, which for an invitee is when they accepted. */
  joined_at: string
  is_self: boolean
}

/**
 * Wire statuses only. "Expired" is deliberately **not** one of them: an invite
 * is expired iff it is still pending and `expires_at` has passed, so no sweeper
 * has to run for the list to be correct (CON-26 §6.2). Ask `invitationState`.
 */
export type InvitationStatus = 'pending' | 'accepted' | 'revoked'

export type WorkspaceInvitation = {
  id: string
  email: string
  role: WorkspaceRole
  /** The **user id** of whoever sent it, not their name — resolve it against the member list. */
  invited_by: string
  status: InvitationStatus
  expires_at: string
  created_at: string
  accepted_at?: string
}

/** What a row actually is, once `expires_at` is taken into account. */
export type InvitationState = InvitationStatus | 'expired'

export function invitationState(inv: WorkspaceInvitation): InvitationState {
  if (inv.status !== 'pending') return inv.status
  return Date.parse(inv.expires_at) <= Date.now() ? 'expired' : 'pending'
}

export type InvitePayload = {
  email: string
  role: WorkspaceRole
}

export type UpdateWorkspacePayload = {
  /** Required, not optional: `PUT /api/tenants/:id` validates `name` as required. */
  name: string
}

/* ------------------------------------------------------------------------ *
 * Below: the multi-workspace model (CON-147) — the account's workspaces as
 * the chooser and switcher see them.
 * ------------------------------------------------------------------------ */

/**
 * A workspace as `GET /api/workspaces` lists it.
 *
 * There is deliberately no `is_active`: the server cannot know which workspace
 * a given *tab* is working in, because the tab says so per request. Whether a
 * row is the current one is a client-side comparison against
 * `lib/activeWorkspace`. `is_default` is a different fact — the workspace a
 * fresh tab or a new login starts in, which `POST …/switch` sets.
 */
export type WorkspaceChoice = Workspace & {
  member_count: number
  is_default: boolean
}

export type CreateWorkspacePayload = {
  name: string
}
