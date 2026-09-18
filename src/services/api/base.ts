/**
 * API origin for the decoupled deployment (CON-98).
 *
 * Empty (the default) keeps requests relative — correct when the UI is served
 * same-origin with the API behind a reverse proxy: the Railway/Caddy deploy
 * proxies `/api/*` to the API service, and the Vite dev server proxies `/api`
 * to a local API. Set `VITE_API_URL` (build-time) to an absolute origin, e.g.
 * `https://api.getogen.com`, to call the API directly from a different origin;
 * the API must then allow that origin via CORS with credentials
 * (`CORS_ALLOWED_ORIGINS`).
 */
import { getActiveWorkspaceId } from '@/lib/activeWorkspace'

const API_BASE = (import.meta.env.VITE_API_URL ?? '').replace(/\/+$/, '')

/**
 * Prefixes an app-relative API path (e.g. `/api/posts`) with the configured
 * API origin. A no-op when `VITE_API_URL` is unset, so relative requests keep
 * working behind the dev/Caddy proxy.
 */
export function apiUrl(path: string): string {
  return API_BASE + path
}

/**
 * Requests that belong to the **account**, not to a workspace, and must go out
 * without `X-Workspace-Id` (CON-147).
 *
 * The exemption is not tidiness — it is the recovery path. A tab whose active
 * workspace was deleted, or whose membership was revoked, gets 403 on every
 * scoped call; the calls that put it right (list my workspaces, who am I, log
 * in) have to be reachable from exactly that state, so they must never carry
 * the header that is causing it.
 *
 * The public invite routes are here for a different reason: the token names the
 * workspace, and the person holding it is not yet a member of anything.
 */
function isAccountScoped(path: string): boolean {
  // Compare against the path only — a query string never changes which
  // resource is being addressed.
  const p = path.split('?')[0]
  return (
    p === '/api/workspaces' ||
    p.startsWith('/api/workspaces/') ||
    p === '/api/current_user' ||
    p === '/api/sessions' ||
    p.startsWith('/api/sessions/') ||
    p.startsWith('/api/invitations/accept/')
  )
}

/**
 * The workspace header for a request, or nothing.
 *
 * Returns an empty object — so callers can spread it unconditionally — when the
 * path is account-scoped, or when this tab has no pinned workspace (the server
 * then falls back to the account's default).
 */
export function workspaceHeader(path: string): Record<string, string> {
  if (isAccountScoped(path)) return {}
  const id = getActiveWorkspaceId()
  return id ? { 'X-Workspace-Id': id } : {}
}

type ScopedInit = Omit<RequestInit, 'headers'> & {
  headers?: Record<string, string>
}

/**
 * `fetch` for an app-relative API path: resolves the origin, sends the session
 * cookie, and names the workspace.
 *
 * Most calls go through `apiJson`/`apiVoid`, which do all three. This is for
 * the handful that can't — streams (`events`, `assistant`), typed-error
 * resources (`zernio`), and the ones that read a 404 as data (`settings`).
 * They take this rather than a bare `fetch` so a workspace-scoped request
 * cannot quietly go out unscoped, which under CON-147 would land it in
 * whichever workspace the account happens to default to.
 */
export function scopedFetch(
  path: string,
  init: ScopedInit = {},
): Promise<Response> {
  return fetch(apiUrl(path), {
    credentials: 'include',
    ...init,
    headers: { ...workspaceHeader(path), ...init.headers },
  })
}
