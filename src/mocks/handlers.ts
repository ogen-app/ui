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
  WORKSPACE_ROLES,
  canActOnMember,
  canGrantRole,
  canManageWorkspace,
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
  if (!canManageWorkspace(ws.role)) {
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
    return HttpResponse.json(db.createWorkspace(name), { status: 201 })
  }),

  http.patch('*/api/workspaces/:id', async ({ params, request }) => {
    await delay()
    const id = params.id as string
    const denied = requireAdmin(id)
    if (denied) return denied

    const body = (await request.json()) as UpdateWorkspacePayload
    if (body.name !== undefined && !body.name.trim()) {
      return fail(422, 'Name is required')
    }
    const updated = db.updateWorkspace(id, { name: body.name?.trim() })
    return updated ? HttpResponse.json(updated) : fail(404, 'Workspace not found')
  }),

  /** Soft-delete server-side; from here the workspace simply stops existing. */
  http.delete('*/api/workspaces/:id', async ({ params }) => {
    await delay()
    const id = params.id as string
    const ws = db.getWorkspace(id)
    if (!ws) return fail(404, 'Workspace not found')
    if (ws.role !== 'owner') return fail(403, 'Only an owner can delete a workspace')
    db.deleteWorkspace(id)
    return new HttpResponse(null, { status: 204 })
  }),

  /**
   * Rebinds the session. Returns 204 rather than the workspace: the client has
   * to drop its cache regardless, so there is nothing useful to hand back.
   */
  http.post('*/api/workspaces/:id/switch', async ({ params }) => {
    await delay()
    const ok = db.switchWorkspace(params.id as string)
    return ok ? new HttpResponse(null, { status: 204 }) : fail(404, 'Workspace not found')
  }),

  http.get('*/api/workspaces/:id/members', async ({ params }) => {
    await delay()
    const id = params.id as string
    if (!db.getWorkspace(id)) return fail(404, 'Workspace not found')
    return HttpResponse.json(db.listMembers(id))
  }),

  /**
   * Role changes, under the two rank rules plus the last-owner invariant.
   *
   * Ranks answer "may this caller touch this row" and "may they hand out this
   * role"; the invariant is the one thing ranks can't see, because it depends
   * on the rest of the member list.
   */
  http.patch('*/api/workspaces/:id/members/:userId', async ({ params, request }) => {
    await delay()
    const workspaceId = params.id as string
    const denied = requireAdmin(workspaceId)
    if (denied) return denied

    const { role } = (await request.json()) as { role: WorkspaceRole }
    if (!WORKSPACE_ROLES.includes(role)) return fail(422, 'Unknown role')

    const ws = db.getWorkspace(workspaceId)
    const target = db.getMember(workspaceId, params.userId as string)
    if (!ws || !target) return fail(404, 'Member not found')

    if (!canActOnMember(ws.role, target.role)) {
      return fail(403, `Only an owner can change an ${target.role}’s role`)
    }
    if (!canGrantRole(ws.role, role)) {
      return fail(403, `You can’t grant a role above your own`)
    }
    if (target.role === 'owner' && role !== 'owner' && db.ownerCount(workspaceId) <= 1) {
      return fail(409, 'A workspace needs at least one owner — appoint another first')
    }

    const updated = db.updateMemberRole(workspaceId, params.userId as string, role)
    return updated ? HttpResponse.json(updated) : fail(404, 'Member not found')
  }),

  http.delete('*/api/workspaces/:id/members/:userId', async ({ params }) => {
    await delay()
    const workspaceId = params.id as string
    const userId = params.userId as string
    const ws = db.getWorkspace(workspaceId)
    const target = db.getMember(workspaceId, userId)
    if (!ws || !target) return fail(404, 'Member not found')

    // Leaving is always your own to do; removing someone else needs rank over
    // them. Either way the owner seat can't be left empty.
    if (!target.is_self && !canActOnMember(ws.role, target.role)) {
      return fail(403, 'You can’t remove someone at or above your own role')
    }
    if (target.role === 'owner' && db.ownerCount(workspaceId) <= 1) {
      return fail(409, 'A workspace needs at least one owner — appoint another first')
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

  /**
   * Idempotent per email: an address that already has a live invitation gets a
   * new token, a new expiry and another mail, answered `200` instead of `201`.
   * "Resend" is the same request, so there is no resend route.
   *
   * 409 is reserved for an address that is already a member — the one case
   * where re-inviting isn't what the caller wants.
   */
  http.post('*/api/workspaces/:id/invitations', async ({ params, request }) => {
    await delay()
    const workspaceId = params.id as string
    const denied = requireAdmin(workspaceId)
    if (denied) return denied

    const body = (await request.json()) as InvitePayload
    const email = body.email?.trim().toLowerCase() ?? ''
    if (!EMAIL.test(email)) return fail(422, 'Enter a valid email address')
    if (!WORKSPACE_ROLES.includes(body.role)) return fail(422, 'Unknown role')

    const ws = db.getWorkspace(workspaceId)
    if (!ws) return fail(404, 'Workspace not found')
    if (!canGrantRole(ws.role, body.role)) {
      return fail(403, 'You can’t invite someone at a role above your own')
    }
    if (db.findMemberByEmail(workspaceId, email)) {
      return fail(409, 'That person is already a member')
    }

    const { invitation, created } = db.upsertInvitation(workspaceId, email, body.role)
    return HttpResponse.json(invitation, { status: created ? 201 : 200 })
  }),

  http.delete('*/api/workspaces/:id/invitations/:invitationId', async ({ params }) => {
    await delay()
    const workspaceId = params.id as string
    const denied = requireAdmin(workspaceId)
    if (denied) return denied
    const ok = db.revokeInvitation(workspaceId, params.invitationId as string)
    return ok ? new HttpResponse(null, { status: 204 }) : fail(404, 'Invitation not found')
  }),

  /**
   * Anything else under `/api` is the real backend's. Declared explicitly
   * rather than left to `onUnhandledRequest`, so an unmatched workspace route
   * is a visible passthrough (and a 404 from the real API) instead of a
   * silently swallowed request.
   */
  http.all('*/api/*', () => passthrough()),
]
