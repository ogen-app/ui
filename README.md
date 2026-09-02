# Ogen UI

The React + Vite single-page app for [Ogen](https://github.com/ogen-app/ogen).
Split out of the `ogen` monorepo (CON-98) and deployed independently; the Go API
no longer embeds it.

## Documentation

- [`docs/product.md`](docs/product.md) — what Ogen is and its domain concepts
  (campaigns, posts, content bank, publishing).
- [`docs/architecture.md`](docs/architecture.md) — front-end architecture
  (routing, data fetching, state, overlays, forms, tables, styling).
- [`docs/technical-decisions.md`](docs/technical-decisions.md) — notable choices
  and their rationale.
- [`CLAUDE.md`](CLAUDE.md) — working conventions for this repo.

## Stack

- React 18 + TypeScript, Vite
- TanStack Router / Query / Table
- Tailwind CSS, Radix UI, BlockNote editor

## Local development

Requires Node ≥ 24 (see `.nvmrc`) and pnpm (pinned via `packageManager`).

```bash
corepack enable
pnpm install
pnpm dev        # http://localhost:9002
```

The dev server proxies `/api` to the API (default `http://localhost:9001`; set
`API_URL` to point elsewhere — see `vite.config.ts`). Run the API from the
[`ogen`](https://github.com/ogen-app/ogen) repo (`make run`).

```bash
pnpm build      # type-check + production build -> dist/
pnpm preview    # serve the production build locally
```

### Checks

```bash
pnpm typecheck  # tsc --noEmit
pnpm lint       # eslint .           (add --fix for the mechanical ones)
pnpm format     # prettier --write . (format:check to only report)
pnpm test       # vitest run
pnpm knip       # unused files, exports and deps — a report, not a gate
```

CI runs all of those except `knip` on every PR into `develop`. What each tool
covers, and why some rules are warnings rather than errors:
[`docs/quality-tooling.md`](./docs/quality-tooling.md).

### Feature flags, and forcing one for yourself

Half-built features ship with their flag off (`src/config/featureFlags.ts`), so
`develop` is always shippable. In development and on staging you can force a
flag **for your browser alone**, which is how one person exercises an unfinished
feature on a deploy everyone else is using:

```
http://localhost:9002/campaigns?ff=tasks,-activity   # `-` forces off, ?ff= clears
```

`/flags` lists every flag with a switch and a reset. Overrides live in
localStorage — nobody else on the deploy is affected and nothing is written to
the workspace — and a badge above the assistant trigger shows when any are on.

**None of this exists in a production build.** It is compiled in only when
`VITE_DEV_TOOLS=1` is set at build time; without it the storage key is inert and
the panel's chunk is not emitted. `pnpm dev` always has it. See
[technical-decisions](docs/technical-decisions.md#staging-flag-overrides).

### Platform API keys (Zernio / Anthropic / Gemini)

Keys live in the API's encrypted secret store, not in the image. The
`*_API_KEY` vars in `.env.api` are **first-boot seeds only**; to set or
rotate a key on a **running** API (hot-reloaded, no restart, no downtime):

```bash
scripts/set-secret.sh zernio_api_key      # prompts for login + value
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
| `VITE_DEV_TOOLS` | `1` — **staging only** | Build variable. Enables the per-browser flag overrides and `/flags` (above). Leave unset in production: unset is off, and off means the code is not in the bundle. |

Add the custom domain (e.g. `app.getogen.com`) on the service. Keeping it on the
same registrable domain as the API keeps cookies same-site. See the API deploy
runbook (ogen CON-95) for the backend side.

Locally:

```bash
docker build -t ogen-ui .
docker run --rm -p 8080:8080 -e API_ORIGIN=host.docker.internal:9001 ogen-ui
```
