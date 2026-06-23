# Ogen UI

The React + Vite single-page app for [Ogen](https://github.com/ogen-app/ogen).
Split out of the `ogen` monorepo (CON-98) and deployed independently; the Go API
no longer embeds it.

## Stack

- React 18 + TypeScript, Vite
- TanStack Router / Query / Table
- Tailwind CSS, Radix UI, BlockNote editor

## Local development

Requires Node ≥ 24 (see `.nvmrc`) and pnpm (pinned via `packageManager`).

```bash
corepack enable
pnpm install
pnpm dev        # http://localhost:5173
```

The dev server proxies `/api` to the API (default `http://localhost:9001`; set
`API_URL` to point elsewhere — see `vite.config.ts`). Run the API from the
[`ogen`](https://github.com/ogen-app/ogen) repo (`make run`).

```bash
pnpm build      # type-check + production build -> dist/
pnpm preview    # serve the production build locally
pnpm lint
```

## How the UI reaches the API

All requests use app-relative `/api/...` paths routed through `apiUrl()`
(`src/services/api/base.ts`) with credentials. Two supported wirings:

- **Same-origin proxy (default).** `VITE_API_URL` is empty, so requests stay
  relative and a proxy forwards `/api` to the backend — the Vite dev server in
  development, Caddy in the deployed container. No CORS, and the session cookie
  flows normally.
- **Direct cross-origin.** Set `VITE_API_URL` (e.g. `https://api.getogen.com`)
  at build time to call the API directly. The API must then allow this origin
  via CORS with credentials (`CORS_ALLOWED_ORIGINS`), and the UI should share
  the API's registrable domain so the `SameSite=Lax` cookie is sent.

## Deployment (Railway, containerized Caddy)

`Dockerfile` builds the SPA and serves it with Caddy; `Caddyfile` serves the
static bundle with client-side-routing fallback and reverse-proxies `/api` to
the backend (same-origin → no CORS). `railway.json` deploys it via the
Dockerfile.

Set on the Railway service:

| Variable | Value | Notes |
|---|---|---|
| `API_ORIGIN` | `api.railway.internal:8080` | Backend's private address (API service name + its `ADDR` port). |
| `PORT` | injected by Railway | Caddy listens on it automatically. |

Add the custom domain (e.g. `app.getogen.com`) on the service. Keeping it on the
same registrable domain as the API keeps cookies same-site. See the API deploy
runbook (ogen CON-95) for the backend side.

Locally:

```bash
docker build -t ogen-ui .
docker run --rm -p 8080:8080 -e API_ORIGIN=host.docker.internal:9001 ogen-ui
```
