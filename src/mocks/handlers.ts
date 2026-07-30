/**
 * Stub handlers for the workspace endpoints — **the spec, in executable form.**
 *
 * The Go API has none of these routes. Rather than fake them behind a
 * TypeScript seam, they are answered here as real HTTP: real paths, verbs,
 * status codes and JSON bodies, over the network the app already uses. That
 * makes this file the artifact to hand the backend — every handler below is a
 * request/response pair someone can implement against, and the app exercising
 * them proves the shapes are usable. See `docs/workspace-api.md` for the prose
 * version and the open questions.
 *
 * Everything not listed here is passed through to the real API untouched, so
 * campaigns, posts and auth keep working against the live backend.
 *
 * Delete this directory when the endpoints land.
 */

import { HttpResponse, bypass, http, passthrough } from 'msw'
import {
  ROLE_RANK,
  type CreateWorkspacePayload,
  type InvitePayload,
  type UpdateWorkspacePayload,
  type WorkspaceRole,
} from '@/types/workspace'
import * as db from './db'

/** Matches the backend's `{ error }` body so `errorMessage()` reads stub failures the same way it reads real ones. */
function fail(status: number, error: string) {
  return HttpResponse.json({ error }, { status })
}

const ROLES: WorkspaceRole[] = ['owner', 'admin', 'member', 'viewer']
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/**
 * A latency floor, so the UI is developed against something that visibly
 * takes time. Optimistic updates and pending states that only look right at
 * 0ms are a class of bug this catches early.
 */
const delay = () => new Promise((r) => setTimeout(r, 180))

/** Requires the caller to be admin or owner of the workspace, the rule the API will enforce server-side. */
function requireAdmin(workspaceId: string) {
  const ws = db.getWorkspace(workspaceId)
  if (!ws) return fail(404, 'Workspace not found')
  if (ROLE_RANK[ws.role] < ROLE_RANK.admin) {
    return fail(403, 'Only admins and owners can do that')
  }
  return null
}

export const handlers = [
  /**
   * `GET /api/current_user` — passed through to the real API, then decorated.
   *
   * Auth stays genuine (the session cookie, the 401s, the outage handling);
   * only the tenant is overlaid with the stub's active workspace. That overlay
   * *is* the proposal: after the switch, `current_user` reports whichever
   * workspace the session is bound to, so nothing else in the app needs to
   * learn a new concept to follow along.
   */
  http.get('*/api/current_user', async ({ request }) => {
    const res = await fetch(bypass(request))
    if (!res.ok) return res

    const user = (await res.json()) as {
      id: string
      name: string
      email: string
      tenant?: { id: string; name: string; slug: string }
    }

    if (!db.isInitialized()) {
      db.initDb({ id: user.id, name: user.name, email: user.email })
    }

    const active = db.getActiveWorkspace()
    return HttpResponse.json({
      ...user,
      tenant: {
        ...user.tenant,
        id: active.id,
        name: active.name,
        slug: active.slug,
        created_at: active.created_at,
        updated_at: active.updated_at,
      },
    })
  }),

  http.get('*/api/workspaces', async () => {
    await delay()
    return HttpResponse.json(db.listWorkspaces())
  }),

  http.post('*/api/workspaces', async ({ request }) => {
    await delay()
    const body = (await request.json()) as CreateWorkspacePayload
    const name = body.name?.trim() ?? ''
    if (!name) return fail(422, 'Name is required')
    if (!body.timezone) return fail(422, 'Timezone is required')
    return HttpResponse.json(db.createWorkspace(name, body.timezone), { status: 201 })
  }),

  http.put('*/api/workspaces/:id', async ({ params, request }) => {
    await delay()
    const id = params.id as string
    const denied = requireAdmin(id)
    if (denied) return denied

    const body = (await request.json()) as UpdateWorkspacePayload
    if (body.name !== undefined && !body.name.trim()) {
      return fail(422, 'Name is required')
    }
    const updated = db.updateWorkspace(id, {
      name: body.name?.trim(),
      timezone: body.timezone,
    })
    return updated ? HttpResponse.json(updated) : fail(404, 'Workspace not found')
  }),

  http.delete('*/api/workspaces/:id', async ({ params }) => {
    await delay()
    const id = params.id as string
    const ws = db.getWorkspace(id)
    if (!ws) return fail(404, 'Workspace not found')
    if (ws.role !== 'owner') return fail(403, 'Only the owner can delete a workspace')
    db.deleteWorkspace(id)
    return new HttpResponse(null, { status: 204 })
  }),

  /**
   * Rebinds the session. Returns 204 rather than the workspace: the client has
   * to drop its cache regardless, so there is nothing useful to hand back.
   */
  http.post('*/api/workspaces/:id/activate', async ({ params }) => {
    await delay()
    const ok = db.activateWorkspace(params.id as string)
    return ok ? new HttpResponse(null, { status: 204 }) : fail(404, 'Workspace not found')
  }),

  http.get('*/api/workspaces/:id/members', async ({ params }) => {
    await delay()
    const id = params.id as string
    if (!db.getWorkspace(id)) return fail(404, 'Workspace not found')
    return HttpResponse.json(db.listMembers(id))
  }),

  http.put('*/api/workspaces/:id/members/:userId', async ({ params, request }) => {
    await delay()
    const workspaceId = params.id as string
    const denied = requireAdmin(workspaceId)
    if (denied) return denied

    const { role } = (await request.json()) as { role: WorkspaceRole }
    if (!ROLES.includes(role)) return fail(422, 'Unknown role')

    const ws = db.getWorkspace(workspaceId)
    if (role === 'owner' && ws?.role !== 'owner') {
      return fail(403, 'Only the current owner can transfer ownership')
    }
    const updated = db.updateMemberRole(workspaceId, params.userId as string, role)
    return updated ? HttpResponse.json(updated) : fail(404, 'Member not found')
  }),

  http.delete('*/api/workspaces/:id/members/:userId', async ({ params }) => {
    await delay()
    const workspaceId = params.id as string
    const userId = params.userId as string
    const members = db.listMembers(workspaceId)
    const target = members.find((m) => m.user_id === userId)
    if (!target) return fail(404, 'Member not found')

    // Leaving is always allowed; removing someone else needs authority.
    if (!target.is_self) {
      const denied = requireAdmin(workspaceId)
      if (denied) return denied
    }
    if (target.role === 'owner') {
      return fail(409, 'Transfer ownership before removing the owner')
    }
    db.removeMember(workspaceId, userId)
    return new HttpResponse(null, { status: 204 })
  }),

  http.get('*/api/workspaces/:id/invitations', async ({ params }) => {
    await delay()
    const id = params.id as string
    if (!db.getWorkspace(id)) return fail(404, 'Workspace not found')
    return HttpResponse.json(db.listInvitations(id))
  }),

  http.post('*/api/workspaces/:id/invitations', async ({ params, request }) => {
    await delay()
    const workspaceId = params.id as string
    const denied = requireAdmin(workspaceId)
    if (denied) return denied

    const body = (await request.json()) as InvitePayload
    const email = body.email?.trim().toLowerCase() ?? ''
    if (!EMAIL.test(email)) return fail(422, 'Enter a valid email address')
    if (!ROLES.includes(body.role)) return fail(422, 'Unknown role')
    if (body.role === 'owner') return fail(422, 'Invite as admin, then transfer ownership')

    if (db.findMemberByEmail(workspaceId, email)) {
      return fail(409, 'That person is already a member')
    }
    if (db.findInvitationByEmail(workspaceId, email)) {
      return fail(409, 'They already have a pending invitation')
    }
    return HttpResponse.json(db.createInvitation(workspaceId, email, body.role), {
      status: 201,
    })
  }),

  http.delete('*/api/workspaces/:id/invitations/:invitationId', async ({ params }) => {
    await delay()
    const workspaceId = params.id as string
    const denied = requireAdmin(workspaceId)
    if (denied) return denied
    const ok = db.revokeInvitation(workspaceId, params.invitationId as string)
    return ok ? new HttpResponse(null, { status: 204 }) : fail(404, 'Invitation not found')
  }),

  http.post(
    '*/api/workspaces/:id/invitations/:invitationId/resend',
    async ({ params }) => {
      await delay()
      const workspaceId = params.id as string
      const denied = requireAdmin(workspaceId)
      if (denied) return denied
      const updated = db.resendInvitation(workspaceId, params.invitationId as string)
      return updated ? HttpResponse.json(updated) : fail(404, 'Invitation not found')
    },
  ),

  /**
   * Anything else under `/api` is the real backend's. Declared explicitly
   * rather than left to `onUnhandledRequest`, so an unmatched workspace route
   * is a visible passthrough (and a 404 from the real API) instead of a
   * silently swallowed request.
   */
  http.all('*/api/*', () => passthrough()),
]
