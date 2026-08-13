/**
 * In-memory store behind the multi-workspace stubs, mirrored into
 * `localStorage`.
 *
 * Persisting matters for the thing being prototyped: switching workspaces is
 * supposed to survive a reload, because on the real API it would live in the
 * session. Without persistence every refresh would drop you back into the seed
 * workspace and the flow wouldn't be testable.
 *
 * People and invitations are **not** here any more — CON-26 landed them, so
 * they come from the real API (`/api/users`, `/api/invitations`). What is left
 * is the part the server has no model for: holding several workspaces and
 * moving between them (CON-147).
 *
 * Development-only scaffolding — it goes away with the stub handlers the moment
 * the workspace endpoints land.
 */

import type { WorkspaceChoice } from '@/types/workspace'

// Bump when the seed or the shapes change: a stored state from an older
// version is thrown away and reseeded rather than half-migrated.
const STORAGE_KEY = 'ogen.stub.workspaces.v5'

/** The real workspace the session is actually in, read once from the API. */
export type StubTenant = {
  id: string
  name: string
  slug: string
  created_at: string
  updated_at: string
}

type StubState = {
  workspaces: WorkspaceChoice[]
  activeId: string
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
 *
 * The first one **is** the real tenant — same id, name and slug — so that
 * everything the app reads from the live API still lines up while the workspace
 * being switched *from* is the one it is genuinely in.
 */
function seed(tenant: StubTenant): StubState {
  const own: WorkspaceChoice = {
    ...tenant,
    role: 'owner',
    member_count: 3,
    is_active: true,
  }
  const client: WorkspaceChoice = {
    id: 'wsClient02',
    name: 'Northwind Client',
    slug: 'northwind-client',
    role: 'member',
    member_count: 5,
    is_active: false,
    created_at: daysFromNow(-40),
    updated_at: daysFromNow(-1),
  }
  return { workspaces: [own, client], activeId: own.id }
}

let state: StubState | null = null

function load(): StubState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as StubState) : null
  } catch {
    return null
  }
}

function save() {
  if (!state) return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    // A full or blocked storage is not worth breaking the stub over.
  }
}

export function isInitialized(): boolean {
  if (state) return true
  state = load()
  return state !== null
}

/** Seeds from the caller's real tenant the first time the app asks for it. */
export function initDb(tenant: StubTenant): void {
  state = load() ?? seed(tenant)
  save()
}

export function resetDb(): void {
  localStorage.removeItem(STORAGE_KEY)
  state = null
}

function db(): StubState {
  if (!state) throw new Error('stub db used before initDb()')
  return state
}

export function listWorkspaces(): WorkspaceChoice[] {
  return db().workspaces.map((w) => ({ ...w, is_active: w.id === db().activeId }))
}

export function getWorkspace(id: string): WorkspaceChoice | undefined {
  return db().workspaces.find((w) => w.id === id)
}

export function getActiveWorkspace(): WorkspaceChoice {
  const s = db()
  return s.workspaces.find((w) => w.id === s.activeId) ?? s.workspaces[0]
}

export function createWorkspace(name: string): WorkspaceChoice {
  const ws: WorkspaceChoice = {
    id: newId('ws'),
    name,
    slug: slugify(name),
    role: 'owner',
    member_count: 1,
    is_active: false,
    created_at: now(),
    updated_at: now(),
  }
  db().workspaces.push(ws)
  save()
  return ws
}

export function deleteWorkspace(id: string): void {
  const s = db()
  s.workspaces = s.workspaces.filter((w) => w.id !== id)
  if (s.activeId === id) s.activeId = s.workspaces[0]?.id ?? ''
  save()
}

export function switchWorkspace(id: string): boolean {
  const s = db()
  if (!s.workspaces.some((w) => w.id === id)) return false
  s.activeId = id
  save()
  return true
}
