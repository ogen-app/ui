# Front-End Architecture

The Ogen UI is a decoupled React 18 + TypeScript single-page app built with
Vite. It talks to the Go API over app-relative `/api` requests and holds no
server state of its own beyond caches. This document maps how it is put
together; for _why_ the notable choices were made, see
[`technical-decisions.md`](./technical-decisions.md).

## Stack

| Concern | Choice |
|---|---|
| Framework | React 18.3 + TypeScript, Vite 7 |
| Routing | TanStack Router (file-based, code-generated tree) |
| Server state | TanStack Query |
| Client state | Zustand 5 (with `persist` where needed) |
| Tables | TanStack Table + TanStack Virtual |
| Forms | react-hook-form + Zod 4 |
| Styling | Tailwind CSS v4 (CSS-first, no JS config) + Radix UI + CVA (shadcn "new-york") |
| Rich text | BlockNote |
| Icons | `@phosphor-icons/react` |

Path alias: `@/` → `src/`. Node ≥ 24.15, pnpm (pinned via `packageManager`).

## Source layout

```
src/
  routes/          File-based routes (see Routing). *.gen.ts is generated.
  components/
    ui/            Radix + CVA primitives (shadcn-style). ~35 components.
    page-primitives/  Page scaffolding: PageContainer/Header/Loader/Error, RightRail, RailPanel.
    layout/        App chrome: AppSidebar, SecondaryNavbar, OverlayOutlet, UploadTracker.
    tables/        VirtualTable engine + postsTable / docsTable + column-width solver.
    forms/         Feature forms (campaign, post, auth) — see Forms.
    campaigns/ posts/ content-bank/ uploads/ instance-settings/ overlays/ rail-panels/
  hooks/           TanStack Query hooks + UI hooks (useOverlay, useRightRail*).
  services/api/    The API client: base + http helpers + one module per resource.
  stores/          Zustand stores (auth, overlay, rightRail, settings, upload).
  lib/             Framework-free domain logic (post status machine, platforms, asset rules).
  types/           Domain types, mirroring the Go models.
  config/          overlayRegistry, zIndex.
  index.css        Tailwind theme + tokens (single source of styling truth).
```

## Routing — TanStack Router (file-based)

Routes are generated from `src/routes/` into `src/routeTree.gen.ts` by the
`@tanstack/router-vite-plugin` (`vite.config.ts`). **`routeTree.gen.ts` is
generated — never edit it by hand.**

**The index/page split.** The plugin is configured to ignore `page.tsx`
(`routeFileIgnorePattern`). The convention is: a route module `index.tsx` owns
routing concerns (`createFileRoute`, `beforeLoad` guards, `validateSearch`) and
renders a co-located `page.tsx` that is a pure presentational component. See
`routes/auth/login/index.tsx` (route) vs `routes/auth/login/page.tsx` (JSX).

**Auth is enforced once, at the root.** `routes/__root.tsx`'s `beforeLoad` is the
central gate:

- It probes the session (`checkSession`). A network failure surfaces as a
  `ServerUnavailableError` and redirects to `/server-unavailable`; an HTTP 401
  is merely "logged out" and redirects to `/auth/login?redirect=<path>`. This
  distinction — server down vs. not authenticated — is deliberate (see
  `services/api/sessions.ts`, `errors.ts`).
- On a fresh tab where the cookie is valid but the store is empty, it hydrates
  the user via `getMe()` into `authStore`.
- It returns `{ auth: { isAuthenticated } }` into the router context.

The `_authenticated.tsx` pathless layout therefore has **no guard of its own** —
it only composes the app chrome (`SidebarProvider`, `AppSidebar`, the `Outlet`,
`RightRail`, `SecondaryNavbar`, `OverlayOutlet`, `UploadTracker`) and registers
the global right-rail section.

**Layout-escape idiom.** A trailing underscore on a path segment breaks a route
out of its parent layout. `campaigns/$campaignId_/posts/$postId.tsx` renders the
post editor fullscreen (no campaign tab bar); `content-bank_/$assetId.tsx` does
the same for the asset editor.

**URL is the source of truth for tab state.** Active tabs are derived from the
pathname via `useRouterState({ select })` rather than local state (see
`$campaignId.tsx`, `content-bank.tsx`). Routes normalize their own params — e.g.
the calendar route's `beforeLoad` validates `$anchor`/`$view` and redirects
malformed URLs to the current week.

## Data fetching — TanStack Query

The Query cache is the app's server-state layer. Global defaults
(`src/main.tsx`): `staleTime: 30s`, `refetchOnWindowFocus: false`. Three
reference datasets — campaign types, tags, platforms — are **prefetched at
module load**, before first render.

**Query-key convention.** Keys are module-level `as const` tuples or small
factory functions, co-located in each hook and _exported_ when another hook must
invalidate them:

| Data | Key | Hook |
|---|---|---|
| Campaigns | `["campaigns"]`, `["campaigns", id]` | `useCampaigns` |
| Posts (list) | `["campaigns", campaignId, "posts"]` | `usePosts` |
| Post (editor) | `["post", id]` | `usePost` |
| Assets | `["assets"]`, `["assets", id]` | `useContent` |
| Platforms / Tags / Secrets | `PLATFORMS_KEY` / `TAGS_KEY` / `SECRETS_KEY` | respective hooks |
| Zernio | `ZERNIO_HEALTH_KEY` / `ZERNIO_ACCOUNTS_KEY` | `useZernio` |

Note the post list (`["campaigns", id, "posts"]`) and the post editor
(`["post", id]`) are **separate namespaces**; mutations invalidate them
independently.

**Mutations & invalidation.** CRUD hooks pair `useMutation` with `onSuccess`
invalidation. Cross-domain effects are explicit — saving the `zernio_api_key`
secret also invalidates Zernio health + platforms (`useSecrets`); a Zernio sync
invalidates accounts + health + platforms (`useZernio`). `useUpdatePost` is the
canonical optimistic update (snapshot in `onMutate`, roll back in `onError`,
invalidate in `onSettled`).

**Polling for async backend work.** Several flows converge to a status the
backend controls, so the UI polls only while it matters:

- **Post publishing** — `usePost` sets `refetchInterval` to 5s _only_ while
  status is `scheduled`, to observe the worker publishing or a cancel landing.
- **Asset processing** — each `UploadRow` polls `["assets", id]` every 2s until
  the status is terminal, then invalidates `["assets"]`.
- **Integration health** — `useZernioHealth` polls every 60s only while
  `degraded`.

**Autosave via the cache as a document store.** `usePost` treats the cached post
as a mutable document: `changeDoc(fn)` clones the cache entry, applies a
mutator, writes it back with `setQueryData`, and debounces a PUT (600ms). A
generation counter guards against a stale flush overwriting a newer edit, and
pending saves flush on unmount. Campaign forms use a parallel autosave
(`campaignBriefForm/shared.ts`, 500ms) built on `form.watch`.

## API service layer — `src/services/api/`

A thin, uniform client. **`base.ts`** exposes `apiUrl(path)`, which prefixes
`VITE_API_URL` (empty by default → relative `/api/...` proxied same-origin).
**`http.ts`** is the shared core: `apiJson<T>()` and `apiVoid()` always send
`credentials: "include"`, JSON-encode bodies, and throw with a per-call fallback
message on non-OK responses. **`errors.ts`** defines `ServerUnavailableError`
(thrown only when `fetch` itself rejects) so the root guard can tell an outage
from a normal HTTP error, and `errorMessage()` surfaces the backend's
`{ error }` body.

One module per resource (`campaigns`, `posts`, `content`, `platforms`, `tags`,
`secrets`, `sessions`, `users`, `tenants`, `zernio`, `uploads`, `images`). A few
diverge from the `http.ts` helpers for good reason:

- **`sessions.ts`** hand-rolls fetch and memoizes the session probe (never
  caching a failure); it maps status ≥ 500 to `ServerUnavailableError`.
- **`uploads.ts`** uses `XMLHttpRequest` to report per-file upload progress and
  supports `AbortSignal`.
- **`zernio.ts`** maps responses to a typed `ZernioError` (known code set +
  `Retry-After` parsing) and treats `202` as success.
- **`images.ts`** enforces a client-side MIME allowlist + 10 MB cap for
  BlockNote image uploads.

> **Known stub:** `users.getMe()` currently returns a hardcoded placeholder user
> pending a real `GET /api/me`. The sidebar user display depends on it.

> **SaaS transition:** the `secrets` module + `useSecrets` back the Instance
> Settings **API-key** UI, which is **legacy** — the Anthropic/Zernio keys are
> centralized/platform-managed under the multi-tenancy model (CON-99). Account
> connection (`zernio` / `useZernio`, per-tenant Zernio profile) stays. Tenant
> isolation is enforced server-side; the client never handles `tenant_id`. See
> [`technical-decisions.md`](./technical-decisions.md).

## State management — Zustand stores (`src/stores/`)

Only UI/session state lives here; anything fetched belongs to Query. All stores
use `devtools`; persisted ones add `persist` with keys centralized in
`constants.ts`.

| Store | Persisted | Holds |
|---|---|---|
| `authStore` | yes (`user` only) | The user mirror of the cookie session; `logout()`. |
| `overlayStore` | no | Overlay `active`/`closing` stacks + a 300ms close-animation lifecycle and `beforeClose` guards. |
| `rightRailStore` | yes (`dirtyByPage` only) | Registered rail sections, the active panel, and per-page "the user overrode the default panel" overrides. |
| `settingsStore` | yes (minus transient) | `sidebarCollapsed`, secondary-navbar open state, last-opened modals. |
| `uploadStore` | no | In-flight uploads with an `uploading → processing → ready\|partial\|failed` phase machine. |

## Contextual UI: Overlays and the Right Rail

Two **independent** systems for contextual surfaces.

**Overlays** (modals / sheets / secondary-navbar dialogs). Registered by id in
`config/overlayRegistry.ts` (`{ container, component }`), opened via
`useOverlay(id)` → `{ isOpen, open(props), close() }`, and rendered by
`layout/OverlayOutlet.tsx`. The outlet closes everything on navigation, wires a
global ESC-closes-topmost handler, and stacks z-index via `getOverlayZIndex()`.

**Right Rail** (persistent icon rail + slide-out panels on the right edge).
Pages register button groups with `useRightRailSection(id, buttons)` and declare
a default-open panel with `useRightRailPage(pageType, defaultActiveId)`. Once a
user opens/closes a panel on a page, `rightRailStore.dirtyByPage` remembers their
choice for return visits. `page-primitives/RightRail.tsx` renders the rail;
`RailPanel.tsx` is the standard panel chrome (title/close/actions/footer).

## Forms — react-hook-form + Zod

Two patterns coexist by design:

1. **Lightweight** (`hooks/useFormValidation.ts`) — a minimal Zod-over-values
   hook, no touched/dirty tracking. Used by the **auth forms** with plain
   `Input`/`Label`. Password rules render live from `PASSWORD_RULES`
   (`lib/auth-validation.ts`), intentionally stricter than the backend.
2. **Full RHF + `ui/form.tsx`** (the shadcn `Form`/`FormField`/`FormItem`/…
   abstraction over `Controller`) — used by the **feature forms** (campaign
   settings, campaign brief, post settings, content-usage). These autosave (see
   Data fetching) rather than submit.

Choose (1) for simple auth-style forms, (2) for feature forms that need the
accessibility wiring and autosave.

## Tables — `components/tables/`

`VirtualTable.tsx` is a generic engine combining TanStack Table (sorting,
filtering, global filter) with TanStack Virtual (row virtualization). Columns
are declared as a `ColumnConfig[]` + an `activeColumns` id-ordering, not raw
column defs. Widths are solved by `hooks/useColumnWidths.ts` (overflow /
fixed / underflow scenarios) and applied via `--col-{id}-width` CSS variables;
sticky headers/footers and sticky edge columns are positioned from those
variables and `config/zIndex.ts`. Concrete tables: `postsTable` and `docsTable`
(assets). Both memoized; cells render as full-height `<Link>`s.

## Styling — Tailwind CSS v4

Styling is **CSS-first**: there is no `tailwind.config.js`. `src/index.css` is
the single source of truth — it declares the fonts (Space Grotesk + Zalando
Sans), a `@theme inline` block with a beige OKLCH palette and semantic tokens
(`--color-primary…senary`, sidebar, table, chart), radii, and shadows. `:root`
maps semantics to the light theme; a `.dark` block exists but is essentially
empty — **dark mode is scaffolded, not implemented.** `lib/styles.ts` exports
`cn()` (`twMerge(clsx(...))`). BlockNote is themed onto these tokens in
`blocknote-theme.css`. Z-index is centralized in `config/zIndex.ts` — apply it
via inline `style={{ zIndex }}` (Tailwind's JIT can't parse a templated
`z-${…}` class).

## Framework-free domain logic — `src/lib/`

Pure modules that encode server rules on the client so the UI can gate actions
without a round-trip. **These mirror specific Go files and must be kept in sync**
(the server remains the source of truth and rejects violations):

- `postStatusMachine.ts` — transitions, action metadata (button/menu labels,
  intent, user-vs-system, transition-vs-cancel), and transition blockers.
  Mirrors `models/post.go`.
- `platformDictionary.ts` — platform display metadata + `buildPlatformViews()`,
  which partitions post types into allowed/available/unavailable using publisher
  connection state.
- `assetCategory.ts` / `assetStatus.ts` — Content-Bank tab mapping and upload
  validation (size/MIME limits, terminal-status test, badge mapping). Error
  strings match the server's.
- `formatTitle.ts` — the `"Untitled"` fallback used across tables and headers.

## Build & tooling

- **`vite.config.ts`** — plugins: `react`, `svgr` (SVGs import as components),
  `tanstackRouter`, `tailwindcss`. Dev server on **:9002** (HMR clientPort set
  for Docker); optional polling watch gated on `CHOKIDAR_USEPOLLING` for Docker
  bind mounts. `/api` proxies to `API_URL` (default `http://localhost:9001`).
  Prod build uses terser and strips `console.log` only.
- **`package.json` scripts** — `dev`; `build` = `tsc && vite build`
  (type-check gates the build); `preview`; `lint` = `eslint . --ext ts,tsx`.
- **`tsconfig.json`** — strict, `noUnusedLocals/Parameters`,
  `allowImportingTsExtensions` (imports use explicit `.ts`/`.tsx`), `@/*` alias.

> **Tooling gap:** `eslint`, `prettier`, and `stylelint` are installed but no
> config files are committed to this repo, so `pnpm lint` has no resolvable
> config locally (inline `eslint-disable` directives imply a config exists in
> CI / a parent context). Worth resolving.
