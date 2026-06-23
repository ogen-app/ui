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
const API_BASE = (import.meta.env.VITE_API_URL ?? "").replace(/\/+$/, "");

/**
 * Prefixes an app-relative API path (e.g. `/api/posts`) with the configured
 * API origin. A no-op when `VITE_API_URL` is unset, so relative requests keep
 * working behind the dev/Caddy proxy.
 */
export function apiUrl(path: string): string {
  return API_BASE + path;
}
