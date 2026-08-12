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

```text
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

### 3. Password reset — `/auth/forgot` → email → `/auth/reset?token=…`

Not an entry point on its own: it hands the user back to login. Two screens,
both public, both using the lightweight `useFormValidation` pattern.

```text
/auth/forgot   AuthForgotPasswordForm → useRequestPasswordReset()
               POST /api/password-reset          { email }         → 202 always
               └─ success panel replaces the form ("if that address has an
                  account…"), with a resend button

emailed link   {APP_BASE_URL}/auth/reset?token=<one-time token>

/auth/reset    no ?token= → "This link doesn't work" + link to /auth/forgot
               AuthResetPasswordForm → useResetPassword()
               POST /api/password-reset/confirm  { token, password }  → 204
               └─ on success: /auth/login?reset=true (no session is opened)
```

Two properties are load-bearing and easy to undo by accident:

- **The request endpoint answers 202 for an unknown address too.** Anything
  else turns a public endpoint into an account-enumeration oracle, so the UI
  can never say "no account with that email" — the success copy is phrased as
  a conditional on purpose.
- **A completed reset does not log the user in.** Spending the token proves
  control of the mailbox, not of the password, and a reset is exactly when
  someone else may have had the account. Login stays the only place a session
  is opened.

The server half **has landed** (CON-161 in the API repo, the counterpart to
this front-end's CON-108) and matches the contract above endpoint for endpoint,
including the emailed `{APP_BASE_URL}/auth/reset?token=` shape.

It adds one thing the diagram doesn't show: `POST /api/password-reset` is
rate-limited **per address and per client IP**, and answers **429** with a
`Retry-After` header once either budget is spent. That response is safe to show
verbatim — it reveals only that a limit was hit, never whether the address has
an account, so it preserves the anti-enumeration property above. The resend
button is the realistic way to reach it, which is why a failed resend leaves
the success panel standing instead of dropping the user back to the form.

The confirm endpoint returns the same 400 message for an unknown, expired, or
already-spent token, deliberately — it is written as a sentence because the UI
prints it as-is next to "Request a new link".

## The root guard — `src/routes/__root.tsx`

Auth is guarded **once**, in the root route's `beforeLoad` (never on
`_authenticated`):

```text
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
  `/auth/login`, `/auth/register`, `/auth/forgot`, `/auth/reset` each
  `beforeLoad`-redirect to `/`).
- **First-run instance setup no longer exists.** CON-97 removed the
  `setup_complete` bootstrap; onboarding is only the signup above.
- **The guard only runs on a page load, so it can't catch a session that dies
  mid-visit.** That case belongs to `src/lib/sessionExpiry.ts`: any 401 from
  `services/api/http.ts` drops the persisted user and reloads onto
  `/auth/login?redirect=<here>&expired=1`, which is why the login screen can
  explain itself instead of appearing out of nowhere. It fires once per page
  (a screen with four queries produces four 401s in one tick) and never on
  `/auth/*`, where a 401 is simply the answer.
- **`?redirect=` is filtered through `safeRedirect()`** (`src/lib/redirects.ts`)
  before it is followed. The guard writes `location.href` into it, so the value
  is attacker-supplied; `startsWith("/")` alone would accept `//evil.example`,
  which browsers resolve to another origin.

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
| `POST /api/password-reset` | public | email a one-time reset link | ⏳ UI built, **endpoint missing** |
| `POST /api/password-reset/confirm` | public (token) | spend the token, set the password | ⏳ UI built, **endpoint missing** |

Not offered by the backend at all: invitations with an email loop, email
verification, password reset, roles/RBAC, tenant deletion, tenant switching,
platform-admin tenant enumeration. (`/api/secrets` exists but is an
instance-operator surface with no UI here — see backend gaps below.)

## The account surface — `/profile`

The personal counterpart to Workspace Settings, which is shared by everyone in
the tenant. Three cards, all backed by `requireSelf`-gated endpoints, so
nothing here can ever touch another user:

- **Account** — first/last name and email, edited inline and applied by the
  header's Save button, exactly like `WorkspaceSection`. All three fields
  register as **one** save entry: `PUT /api/users/:id` requires `name` *and*
  `email` on every call, so separate entries would race each other.
- **Password** — deliberately *not* on the page's Save button. It replaces a
  credential rather than editing a setting, so it has its own submit and its
  own failure.
- **Danger Zone** — `DELETE /api/users/:id`, behind a type-your-email
  confirmation.

Two properties of the API shape this screen, both tracked as **CON-193**:

- **The update endpoint never asks for the current password.** Any live
  session can replace the credential, which makes a borrowed tab enough to take
  the account permanently. `useChangePassword` compensates by re-authenticating
  through `POST /api/sessions` first — that endpoint verifies the password, 401s
  on a wrong one, and mints a *fresh* session rather than disturbing the current
  one. That is a lock on our own door; anything calling the API directly walks
  straight past it, so it is not a substitute for the server-side check.
- **A password change revokes nothing.** `POST /api/password-reset/confirm`
  ends every session; `PUT /api/users/:id` ends none. No client can fix that, so
  the card says so rather than implying otherwise.

Account deletion is much larger than its name. `users.id` cascades through
`created_by` into `tags`, `campaigns`, `assets`, `posts` and
`post_attachments` — everything the user created is destroyed with them,
including out from under colleagues in a shared workspace. The tenant row has
no such link and survives. The dialog states this outright; "this cannot be
undone" is equally true of deleting a draft and tells nobody what they are
about to lose.

## Post-signup settings surface — `/workspace-settings`

`src/routes/_authenticated/workspace-settings/` renders three sections:

- **`WorkspaceSection`**
  (`src/components/workspace-settings/WorkspaceSection.tsx`) — the tenant's
  name and stable slug as read-only inputs; the corner pencil opens a modal
  that renames via `PUT /api/tenants/:id`.
- **`PlatformsSection`** — one row per platform with a **connected** account:
  status badge + message (derived from the publisher's disabled/degraded/ok
  state and account activity), posting rules, and the mirrored accounts. Each
  account carries its own **Disconnect** control (`DELETE
  /api/integrations/zernio/accounts/:id`, CON-133) behind a confirm dialog
  that escalates to `?force=true` only when the server reports scheduled posts
  on that account — see
  [`technical-decisions.md#disconnect`](./technical-decisions.md#disconnect).
- **`ConnectPlatformsSection`** — a tile grid of **every** platform, connected
  or not: a workspace can hold several accounts per platform, so a tile never
  disappears once used (a connected one captions "N connected"). When the
  integration reports `disabled` the tiles grey out (they don't hide).
  Clicking a tile runs the in-app
  connect flow: `POST /api/integrations/zernio/connect-links` → open the
  one-shot `connectUrl` in a new tab → poll the platform list until the
  per-tenant sync (CON-100) mirrors the authorized account back, then the
  platform moves up into Platform Settings. The Zernio wire IDs live in
  `src/lib/platformDictionary.ts` (`zernioId`).

The former bring-your-own **API-keys section was removed** (2026-07-05) —
credentials are platform-managed (CON-99/104), so the whole `/api/secrets`
client (`secrets.ts`, `useSecrets.ts`, `ApiKeysSection`) is gone.

## Known gaps (as of 2026-08-04)

UI-side (this repo):

1. **No invite-teammate UI** — `users.register()` is ready but unwired
   (CON-26 is the placeholder ticket for real invitations).
2. **No email verification** — an address is never confirmed, at signup or
   after. No UI stub for it.
3. **No account deletion beyond the user's own.** `/profile` deletes yourself
   (`DELETE /api/users/:id`, `requireSelf`); there is no way to remove anyone
   else, and no way to delete a workspace. Deleting the last member leaves the
   tenant row standing with nobody able to reach it.

Backend-side (tracked against the API repo, listed here for context):

- **`POST /api/sessions` has no rate limiting or lockout** (CON-194). Password
  reset is throttled as of CON-161 and Zernio's connect-link endpoint has its
  own limiter, but login has neither — it is unlimited-attempt against a public
  endpoint. Signup is open and unthrottled too (no rate limit / CAPTCHA /
  email loop).
- **`PUT /api/users/:id` neither re-authenticates nor revokes** (CON-193) —
  see the `/profile` section above for what the client does about it and what
  it cannot.
- **`/api/secrets` is reachable by any authenticated tenant user** (plain
  session auth), letting any tenant read metadata for / rotate / delete the
  **platform-wide** keys — contradicts CON-97 §10.3 ("no tenant-facing
  endpoint can read, set, or rotate them"). The UI no longer exposes it, but
  the endpoint itself must be locked down or removed.
- No invitations or email verification exist server-side; teammates are added
  by direct `POST /api/users` with a chosen password.
