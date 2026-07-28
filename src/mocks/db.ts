/**
 * In-memory store behind the workspace stubs, mirrored into `localStorage`.
 *
 * Persisting matters for the thing being prototyped: switching workspaces is
 * supposed to survive a reload, because on the real API it lives in the
 * session. Without persistence every refresh would drop you back into the
 * seed workspace and the flow wouldn't be testable.
 *
 * This file is development-only scaffolding — it goes away with the stub
 * handlers the moment the Go endpoints land.
 */

import type {
  Workspace,
  WorkspaceInvitation,
  WorkspaceMember,
  WorkspaceRole,
} from '@/types/workspace'

const STORAGE_KEY = 'ogen.stub.workspaces.v1'

/** The signed-in user, as far as the stubs are concerned. Patched from the real `current_user` on boot. */
export type StubSelf = {
  id: string
  name: string
  email: string
}

type StubState = {
  self: StubSelf
  workspaces: Workspace[]
  activeId: string
  /** Keyed by workspace id. */
  members: Record<string, WorkspaceMember[]>
  invitations: Record<string, WorkspaceInvitation[]>
}

const now = () => new Date().toISOString()

function daysFromNow(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d.toISOString()
}

/** Sqid-ish ids, close enough in shape to the real `models.NewID` output to catch bad assumptions. */
function newId(prefix: string): string {
  return `${prefix}${Math.random().toString(36).slice(2, 10)}`
}

export function slugify(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 40) || 'workspace'
  )
}

/**
 * Two workspaces from the start, because one workspace can't demonstrate the
 * problem this concept exists to solve: the same person holding a LinkedIn
 * account of their own *and* running a client's, which one Zernio profile
 * cannot represent.
 */
function seed(self: StubSelf): StubState {
  const own: Workspace = {
    id: 'wsOwn001',
    name: 'My Workspace',
    slug: 'my-workspace',
    timezone: 'Europe/Berlin',
    role: 'owner',
    member_count: 1,
    is_active: true,
    created_at: daysFromNow(-120),
    updated_at: daysFromNow(-3),
  }
  const client: Workspace = {
    id: 'wsClient02',
    name: 'Northwind Client',
    slug: 'northwind-client',
    timezone: 'America/New_York',
    role: 'admin',
    member_count: 3,
    is_active: false,
    created_at: daysFromNow(-40),
    updated_at: daysFromNow(-1),
  }

  const selfMember = (role: WorkspaceRole, joinedDaysAgo: number): WorkspaceMember => ({
    id: newId('mem'),
    user_id: self.id,
    name: self.name,
    email: self.email,
    role,
    joined_at: daysFromNow(-joinedDaysAgo),
    is_self: true,
  })

  return {
    self,
    workspaces: [own, client],
    activeId: own.id,
    members: {
      [own.id]: [selfMember('owner', 120)],
      [client.id]: [
        selfMember('admin', 40),
        {
          id: newId('mem'),
          user_id: 'usrNw01',
          name: 'Dana Okafor',
          email: 'dana@northwind.example',
          role: 'owner',
          joined_at: daysFromNow(-40),
          is_self: false,
        },
        {
          id: newId('mem'),
          user_id: 'usrNw02',
          name: 'Ravi Patel',
          email: 'ravi@northwind.example',
          role: 'member',
          joined_at: daysFromNow(-12),
          is_self: false,
        },
      ],
    },
    invitations: {
      [own.id]: [],
      [client.id]: [
        {
          id: newId('inv'),
          email: 'mira@northwind.example',
          role: 'member',
          invited_by: self.name,
          status: 'pending',
          created_at: daysFromNow(-2),
          expires_at: daysFromNow(5),
        },
        {
          id: newId('inv'),
          email: 'old.contact@northwind.example',
          role: 'admin',
          invited_by: 'Dana Okafor',
          status: 'expired',
          created_at: daysFromNow(-30),
          expires_at: daysFromNow(-23),
        },
      ],
    },
  }
}

let state: StubState | null = null

function load(self: StubSelf): StubState {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as StubState
      // The signed-in user can change between sessions; the rest is kept.
      parsed.self = self
      return parsed
    } catch {
      // Corrupt or from an older shape — start over rather than half-restore.
    }
  }
  return seed(self)
}

function persist(): void {
  if (state) localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}

/** Called once at startup with the real signed-in user, so the stub's "you" row is genuine. */
export function initDb(self: StubSelf): void {
  state = load(self)
  persist()
}

export function isInitialized(): boolean {
  return state !== null
}

function db(): StubState {
  if (!state) throw new Error('workspace stubs used before initDb()')
  return state
}

export function getSelf(): StubSelf {
  return db().self
}

export function listWorkspaces(): Workspace[] {
  const s = db()
  return s.workspaces.map((w) => ({ ...w, is_active: w.id === s.activeId }))
}

export function getWorkspace(id: string): Workspace | undefined {
  return listWorkspaces().find((w) => w.id === id)
}

export function getActiveWorkspace(): Workspace {
  const s = db()
  return getWorkspace(s.activeId) ?? listWorkspaces()[0]
}

export function createWorkspace(name: string, timezone: string): Workspace {
  const s = db()
  const ws: Workspace = {
    id: newId('ws'),
    name,
    slug: slugify(name),
    timezone,
    role: 'owner',
    member_count: 1,
    is_active: false,
    created_at: now(),
    updated_at: now(),
  }
  s.workspaces.push(ws)
  s.members[ws.id] = [
    {
      id: newId('mem'),
      user_id: s.self.id,
      name: s.self.name,
      email: s.self.email,
      role: 'owner',
      joined_at: now(),
      is_self: true,
    },
  ]
  s.invitations[ws.id] = []
  persist()
  return ws
}

export function updateWorkspace(
  id: string,
  patch: { name?: string; timezone?: string },
): Workspace | undefined {
  const s = db()
  const ws = s.workspaces.find((w) => w.id === id)
  if (!ws) return undefined
  // The slug is assigned once and survives renames (CON-97) — deliberately
  // not recomputed here, so the stub can't teach the UI otherwise.
  if (patch.name !== undefined) ws.name = patch.name
  if (patch.timezone !== undefined) ws.timezone = patch.timezone
  ws.updated_at = now()
  persist()
  return getWorkspace(id)
}

export function deleteWorkspace(id: string): boolean {
  const s = db()
  const i = s.workspaces.findIndex((w) => w.id === id)
  if (i === -1) return false
  s.workspaces.splice(i, 1)
  delete s.members[id]
  delete s.invitations[id]
  if (s.activeId === id) s.activeId = s.workspaces[0]?.id ?? ''
  persist()
  return true
}

export function activateWorkspace(id: string): boolean {
  const s = db()
  if (!s.workspaces.some((w) => w.id === id)) return false
  s.activeId = id
  persist()
  return true
}

export function listMembers(workspaceId: string): WorkspaceMember[] {
  return db().members[workspaceId] ?? []
}

export function updateMemberRole(
  workspaceId: string,
  userId: string,
  role: WorkspaceRole,
): WorkspaceMember | undefined {
  const s = db()
  const members = s.members[workspaceId]
  const member = members?.find((m) => m.user_id === userId)
  if (!member) return undefined
  // One owner per workspace: promoting someone is a transfer, so the sitting
  // owner steps down in the same operation.
  if (role === 'owner') {
    for (const m of members) if (m.role === 'owner') m.role = 'admin'
    // The caller's own row may have just been demoted — mirror it onto the
    // workspace's cached role so the UI's permission checks follow.
    const ws = s.workspaces.find((w) => w.id === workspaceId)
    const self = members.find((m) => m.is_self)
    if (ws && self) ws.role = self.role
  }
  member.role = role
  if (member.is_self) {
    const ws = s.workspaces.find((w) => w.id === workspaceId)
    if (ws) ws.role = role
  }
  persist()
  return member
}

export function removeMember(workspaceId: string, userId: string): boolean {
  const s = db()
  const members = s.members[workspaceId]
  if (!members) return false
  const i = members.findIndex((m) => m.user_id === userId)
  if (i === -1) return false
  members.splice(i, 1)
  const ws = s.workspaces.find((w) => w.id === workspaceId)
  if (ws) ws.member_count = members.length
  persist()
  return true
}

export function listInvitations(workspaceId: string): WorkspaceInvitation[] {
  return db().invitations[workspaceId] ?? []
}

export function findInvitationByEmail(
  workspaceId: string,
  email: string,
): WorkspaceInvitation | undefined {
  return listInvitations(workspaceId).find(
    (i) => i.email.toLowerCase() === email.toLowerCase() && i.status === 'pending',
  )
}

export function findMemberByEmail(
  workspaceId: string,
  email: string,
): WorkspaceMember | undefined {
  return listMembers(workspaceId).find(
    (m) => m.email.toLowerCase() === email.toLowerCase(),
  )
}

export function createInvitation(
  workspaceId: string,
  email: string,
  role: WorkspaceRole,
): WorkspaceInvitation {
  const s = db()
  const invitation: WorkspaceInvitation = {
    id: newId('inv'),
    email,
    role,
    invited_by: s.self.name,
    status: 'pending',
    created_at: now(),
    expires_at: daysFromNow(7),
  }
  s.invitations[workspaceId] = [invitation, ...(s.invitations[workspaceId] ?? [])]
  persist()
  return invitation
}

export function revokeInvitation(workspaceId: string, invitationId: string): boolean {
  const invitations = db().invitations[workspaceId]
  const i = invitations?.findIndex((inv) => inv.id === invitationId) ?? -1
  if (i === -1 || !invitations) return false
  invitations.splice(i, 1)
  persist()
  return true
}

export function resendInvitation(
  workspaceId: string,
  invitationId: string,
): WorkspaceInvitation | undefined {
  const invitation = db().invitations[workspaceId]?.find((i) => i.id === invitationId)
  if (!invitation) return undefined
  invitation.status = 'pending'
  invitation.created_at = now()
  invitation.expires_at = daysFromNow(7)
  persist()
  return invitation
}

/** Wipes the stub state; the next `initDb` reseeds. Exposed on `window` for manual resets. */
export function resetDb(): void {
  localStorage.removeItem(STORAGE_KEY)
  state = null
}
