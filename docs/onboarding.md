# Onboarding, Auth & Tenancy — Front-End Flow

> **Sourcing.** As-is map (updated 2026-07-05) of how a user gets into Ogen:
> signup, login, session handling, and what the multi-tenant backend
> (CON-97/99/100/102/104, shipped on the API's `main`) offers versus what this
> SPA wires up. Remaining gaps are listed at the end; remediation is tracked
> in Linear, not here.

## The tenancy model in one paragraph

Ogen uses **naive pooled multi-tenancy** (CON-97): every tenant-owned row
carries a `tenant_id`, scoping is enforced centrally inside the API, and the
tenant is derived **exclusively from the session cookie**. The consequences
for this UI are structural: the client **never sends a tenant id** — no
header, no path segment, no subdomain (the tenant object it holds is display
data, not routing input). A user belongs to exactly **one** tenant, so there
is no tenant switcher. There are **no roles** (flat membership; the signup
user is "first admin" only informally). Anthropic, Zernio, and Gemini API
keys are **platform-managed** (one Ogen-wide KEK-encrypted set, CON-99/104) —
tenants neither see nor configure them, and this UI has no key surface.

## Entry points

There are exactly two ways into the app; both end authenticated because the
backend opens a session as part of the call.

### 1. Self-service signup — `/auth/register`

The only tenant-creation path. `AuthRegisterForm`
(`src/components/forms/authRegisterForm/AuthRegisterForm.tsx`) collects
organization name + first/last name + email + password, and `useSignup()`
(`src/hooks/useAuth.ts`) calls `signup()` (`src/services/api/tenants.ts`):

```
POST /api/tenants                     (public, unauthenticated)
{ tenant: { name }, user: { name, email, password } }
→ 201 { tenant, user, session } + Set-Cookie: c3_session
→ 409 if the email exists anywhere (email is globally unique across tenants)
```

The API creates tenant + first user + session **atomically**; the auth store
is seeded from the response (user + tenant) and the form navigates to `/` →
`/campaigns`. There is no email verification, no multi-step wizard, no
"connect your accounts" step — the user lands straight in an empty workspace.

### 2. Login — `/auth/login`

`AuthLoginForm` → `useLogin()` → `login()` (`src/services/api/sessions.ts`):
`POST /api/sessions` with `{ email, password }`; the backend resolves
email → user → tenant and sets the `c3_session` cookie (HTTPOnly,
SameSite=Lax, 7-day TTL). On success the hook re-probes `checkSession()` to
hydrate the auth store, and the form returns the user to the in-app path the
root guard stashed in `?redirect=` (falling back to `/`).

## The root guard — `src/routes/__root.tsx`

Auth is guarded **once**, in the root route's `beforeLoad` (never on
`_authenticated`):

```
probe(checkSession)                    — one GET /api/current_user
├─ unreachable (network / 5xx → ServerUnavailableError)
│    → redirect /server-unavailable  ("Try again" re-runs the guard)
├─ reachable + on /server-unavailable → redirect /
├─ reachable + no user (401) + !on /auth/*
│    → redirect /auth/login?redirect=<href>
└─ reachable + user
     → setUser(user)                   (refreshes the persisted store)
     → proceed; /_authenticated/index redirects / → /campaigns
```

Details that matter:

- **One probe does triple duty.** `checkSession()`
  (`src/services/api/sessions.ts`) issues `GET /api/current_user`: a network
  failure or ≥500 surfaces as `ServerUnavailableError`, a 401 resolves to
  `null`, and a 200 resolves to the **real user with the embedded tenant** —
  which the guard writes straight into the auth store (also healing stale
  localStorage copies, e.g. after a workspace rename). The result is cached
  in a module-level promise; failures are never cached; `invalidateSession()`
  clears it after login/logout/signup.
- **Auth routes redirect away when already authenticated** (`/auth`,
  `/auth/login`, `/auth/register` each `beforeLoad`-redirect to `/`).
- **First-run instance setup no longer exists.** CON-97 removed the
  `setup_complete` bootstrap; onboarding is only the signup above.

## Identity & state plumbing

- `src/stores/authStore.ts` — the only auth/session state: `{ user }`
  (with `user.tenant` — `{id, name, slug}`), persisted to localStorage and
  refreshed by every root-guard probe. `logout()` calls
  `DELETE /api/sessions`, invalidates the probe cache, and clears the user;
  `/auth/logout` additionally runs `clearAllApplicationData()`.
- `src/services/api/users.ts` — `rawUserToUser()` maps the backend's single
  `name` into the UI's first/last pair (shared by the session probe, signup,
  and `register`). `users.register()` → `POST /api/users` (authenticated; new
  user joins the **caller's** tenant; any body `tenant_id` is ignored
  server-side) is the building block for an invite-teammate UI, **not wired
  up yet**.
- `src/hooks/useTenant.ts` — `useCurrentTenant()` (`GET /api/tenants/current`)
  and `useRenameTenant()` (`PUT /api/tenants/:id`), which also syncs the
  renamed tenant back into the auth store for the sidebar label.
- The sidebar (`src/components/layout/AppSidebar.tsx`) shows the real user
  name/email and the workspace name in the account dropdown.

## Backend surface relevant to onboarding (API `main`)

| Endpoint | Auth | Purpose | UI wiring |
| --- | --- | --- | --- |
| `POST /api/tenants` | public | signup: tenant + first user + session | ✅ `/auth/register` |
| `POST /api/sessions` / `DELETE` | public / cookie | login / logout | ✅ `/auth/login`, logout |
| `GET /api/current_user` | session | user + embedded tenant | ✅ session probe + store |
| `GET /api/tenants/current` | session | caller's tenant | ✅ workspace settings |
| `PUT /api/tenants/:id` | session, own tenant | rename tenant | ✅ workspace settings |
| `POST /api/users` | session | add teammate to caller's tenant | ❌ no invite UI |

Not offered by the backend at all: invitations with an email loop, email
verification, password reset, roles/RBAC, tenant deletion, tenant switching,
platform-admin tenant enumeration. (`/api/secrets` exists but is an
instance-operator surface with no UI here — see backend gaps below.)

## Post-signup settings surface — `/workspace-settings`

`src/routes/_authenticated/workspace-settings/` renders three sections:

- **`WorkspaceSection`**
  (`src/components/workspace-settings/WorkspaceSection.tsx`) — the tenant's
  name and stable slug as read-only inputs; the corner pencil opens a modal
  that renames via `PUT /api/tenants/:id`.
- **`PlatformsSection`** — one row per platform with a **connected** account:
  status badge + message (derived from the publisher's disabled/degraded/ok
  state and account activity), posting rules, mirrored accounts, and a
  disabled Disconnect button (no backend endpoint yet — see gaps).
- **`ConnectPlatformsSection`** — a tile grid of every platform without a
  connected account; when the integration reports `disabled` the tiles grey
  out (they don't hide). Clicking a tile runs the in-app
  connect flow: `POST /api/integrations/zernio/connect-links` → open the
  one-shot `connectUrl` in a new tab → poll the platform list until the
  per-tenant sync (CON-100) mirrors the authorized account back, then the
  platform moves up into Platform Settings. The Zernio wire IDs live in
  `src/lib/platformDictionary.ts` (`zernioId`).

The former bring-your-own **API-keys section was removed** (2026-07-05) —
credentials are platform-managed (CON-99/104), so the whole `/api/secrets`
client (`secrets.ts`, `useSecrets.ts`, `ApiKeysSection`) is gone.

## Known gaps (as of 2026-07-06)

UI-side (this repo):

1. **No invite-teammate UI** — `users.register()` is ready but unwired
   (CON-26 is the placeholder ticket for real invitations).
2. **No account disconnect** — the API exposes no disconnect endpoint and
   tenants can't reach the platform-owned Zernio dashboard, so the
   Disconnect button in Platform Settings renders disabled until the
   backend grows one.
3. **No password reset / email verification** — blocked on the backend
   growing email infrastructure; the UI deliberately has no stub for either.

Backend-side (tracked against the API repo, listed here for context):

- **`/api/secrets` is reachable by any authenticated tenant user** (plain
  session auth), letting any tenant read metadata for / rotate / delete the
  **platform-wide** keys — contradicts CON-97 §10.3 ("no tenant-facing
  endpoint can read, set, or rotate them"). The UI no longer exposes it, but
  the endpoint itself must be locked down or removed.
- Signup is open and unthrottled (no rate limit / CAPTCHA / email loop).
- No invitations, email verification, or password reset exist server-side;
  teammates are added by direct `POST /api/users` with a chosen password.
