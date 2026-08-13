/**
 * Stub handlers for the multi-workspace endpoints — **the spec, in executable
 * form.**
 *
 * What CON-26 landed is gone from here: people, roles and invitations are the
 * real API's now (`/api/users`, `/api/invitations`) and the app talks to it.
 * What is left is the model the server has no answer for — a user holding
 * several workspaces and moving between them (CON-147).
 *
 * Rather than fake that behind a TypeScript seam it is answered here as real
 * HTTP: real paths, verbs, status codes and JSON bodies, over the network the
 * app already uses. That makes this file the artifact to hand the backend —
 * every handler below is a request/response pair someone can implement
 * against. See `docs/workspace-api.md` for the prose version.
 *
 * Everything not listed here passes through to the real API untouched.
 *
 * Delete this directory when the endpoints land.
 */

import { HttpResponse, bypass, http, passthrough } from 'msw'
import type { CreateWorkspacePayload } from '@/types/workspace'
import * as db from './db'

/** Matches the backend's `{ error }` body so `errorMessage()` reads stub failures the same way it reads real ones. */
function fail(status: number, error: string) {
  return HttpResponse.json({ error }, { status })
}

/**
 * A latency floor, so the UI is developed against something that visibly
 * takes time. Pending states that only look right at 0ms are a class of bug
 * this catches early.
 */
const delay = () => new Promise((r) => setTimeout(r, 180))

export const handlers = [
  /**
   * `GET /api/tenants/current` — passed through to the real API, then
   * overlaid with whichever workspace the stub is switched to.
   *
   * That overlay *is* the proposal: after a switch the tenant endpoint reports
   * the workspace the session is now bound to, so nothing else in the app has
   * to learn a new concept to follow along. It also seeds the stub from the
   * caller's genuine workspace, so the list starts with the one they're in.
   */
  http.get('*/api/tenants/current', async ({ request }) => {
    const res = await fetch(bypass(request))
    if (!res.ok) return res

    const tenant = (await res.json()) as db.StubTenant
    if (!db.isInitialized()) db.initDb(tenant)

    const active = db.getActiveWorkspace()
    return HttpResponse.json({
      id: active.id,
      name: active.name,
      slug: active.slug,
      created_at: active.created_at,
      updated_at: active.updated_at,
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

  /**
   * Anything else under `/api` is the real backend's. Declared explicitly
   * rather than left to `onUnhandledRequest`, so an unmatched workspace route
   * is a visible passthrough (and a 404 from the real API) instead of a
   * silently swallowed request.
   */
  http.all('*/api/*', () => passthrough()),
]
