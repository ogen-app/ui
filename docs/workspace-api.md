# Workspaces — proposed API

**Status:** front-end prototype, no backend. Every endpoint below is served in
development by `src/mocks/handlers.ts` and consumed by real UI. Nothing here
exists on the Go API yet — this document and those handlers are the proposal.

Related: CON-97 (multi-tenancy), CON-26 (user invitation), CON-94 (workspace
timezone), CON-102 (per-tenant Zernio profiles).

---

## 1. What changes

Today a **tenant** is a workspace and a user belongs to exactly one of them
(`users.tenant_id NOT NULL`, CON-97). That is the only thing this proposal
breaks. Membership becomes many-to-many, and a session is bound to one
workspace at a time.

The tenant boundary itself does **not** change. Scoping stays central,
server-side and fail-closed; every existing endpoint keeps resolving its
tenant from the session. What becomes mutable is which tenant that is.

```
before   users ──1:1──> tenants
after    users ──*:*──> workspaces   (via memberships, with a role)
                        ▲
                        └── session.active_workspace_id
```

## 2. Why: the Zernio account limit, corrected

The premise for this work was that Zernio permits one account per social
network, so a person cannot manage their own LinkedIn and a client's from one
place. **That limit is Ogen's, not Zernio's** — worth stating plainly, because
it changes what the fix has to be.

Checked against the API repo:

- `social_accounts` has **no** unique constraint on `(profile_id, platform)`,
  and the sync worker mirrors every account Zernio returns.
- Zernio's submit payload takes an explicit account per platform variant —
  `Platforms: [{platform, accountId}]` (`src/publishers/zernio/posts.go`) — so
  Zernio is perfectly able to hold and target two LinkedIn accounts under one
  profile.
- The narrowing happens in Ogen. `submit_post_to_zernio.go` picks the **first**
  active account matching the platform, under the comment *"One Zernio account
  per (profile, platform) for the single-tenant MVP. Multi-account selection is
  a follow-up."* The UI does the same in `usePublishingAccount`. A `Post`
  carries `platform_id` and no account id — there is nowhere to express which
  account it publishes as.

So there are two different fixes, and they solve different problems:

| | Account picker on the post | Workspaces |
|---|---|---|
| Change | add `account_id` to Post; pick in the UI | many-to-many membership, one Zernio profile per workspace |
| Gives you | two accounts on one platform | that, **plus** separate campaigns, content, members, allowlist, timezone |
| Doesn't give you | isolation — one client's content sits beside another's | anything cheaper |

If the goal were only "post as two LinkedIn accounts", the picker is far less
work. The case for workspaces is **isolation**: an agency running several
clients wants their campaigns, assets, connected accounts, auto-publish
allowlist and the people who can see them kept apart. That case stands on its
own, and it's what the prototype is built around. The two are compatible —
workspaces first, an account picker later within a workspace.

## 3. Where the active workspace lives

**Proposal: in the session.** `POST /api/workspaces/:id/activate` rebinds the
session's `active_workspace_id`; every other endpoint is untouched.

The alternative is a per-request `X-Workspace-Id` header. It was rejected for
v1 on one argument: with a header, a request that omits it has to fall back to
*something*, and any fallback is a route that can read the wrong workspace when
a client forgets. Session binding has no such path — the scoping middleware
keeps reading exactly one value from exactly one place, and it is already
audited.

**The cost, stated honestly:** one session is one workspace, so two browser
tabs cannot sit in two workspaces. For an agency user switching between clients
all day, that will chafe. The escape hatch, when it's needed: accept
`X-Workspace-Id` *when present and the caller is a member*, session value
otherwise. That is additive — no migration, no behaviour change for clients
that don't send it — so it can wait until the pain is real.

Client-side consequence, already implemented: on a successful `activate` the UI
clears the entire Query cache and does a full page load. Everything cached
belongs to the workspace just left, and one missed key is another client's
content on screen.

## 4. Endpoints

All are session-authenticated. `403` when the caller isn't a member; `404` is
returned instead of `403` for workspaces they can't see at all, matching CON-97
§12.3.

### Workspaces

| Method | Path | Body | Returns |
|---|---|---|---|
| GET | `/api/workspaces` | — | `Workspace[]` — the caller's memberships |
| POST | `/api/workspaces` | `{name, timezone}` | `201 Workspace` |
| PUT | `/api/workspaces/:id` | `{name?, timezone?}` | `Workspace` (admin+) |
| DELETE | `/api/workspaces/:id` | — | `204` (owner only) |
| POST | `/api/workspaces/:id/activate` | — | `204` |

```jsonc
// Workspace
{
  "id": "wsOwn001",
  "name": "Northwind Client",
  "slug": "northwind-client",   // from the name at creation, stable across renames
  "timezone": "America/New_York", // IANA
  "role": "admin",               // caller's role — from the membership
  "member_count": 3,
  "is_active": true,             // caller's session is bound to this one
  "created_at": "2026-06-18T09:00:00Z",
  "updated_at": "2026-07-27T11:20:00Z"
}
```

`role`, `is_active` and `member_count` are caller-relative or derived, so the
list is not a plain select — it is a join over memberships.

**Creation side effects.** A new workspace provisions its own Zernio profile
(`Ogen #{WORKSPACE_ID}`, CON-102) — that is what makes its social accounts
separate. Reuse the existing bootstrap job; creation must not block on Zernio
being reachable, exactly as signup doesn't.

**Deletion** cascades campaigns, posts, assets, social accounts and the
allowlist, and should detach the Zernio profile. Published posts stay live on
the networks — the UI says so.

### Members

| Method | Path | Body | Returns |
|---|---|---|---|
| GET | `/api/workspaces/:id/members` | — | `WorkspaceMember[]` |
| PUT | `/api/workspaces/:id/members/:userId` | `{role}` | `WorkspaceMember` (admin+) |
| DELETE | `/api/workspaces/:id/members/:userId` | — | `204` |

```jsonc
// WorkspaceMember
{
  "id": "mem7x2k",        // membership id, not user id
  "user_id": "usrNw01",
  "name": "Dana Okafor",
  "email": "dana@northwind.example",
  "role": "owner",
  "joined_at": "2026-06-18T09:00:00Z",
  "is_self": false        // the caller's own row
}
```

Rules the server owns:

- Roles are `owner | admin | member`. `owner` is per workspace, not global.
- **Exactly one owner.** Promoting someone to `owner` is a *transfer*: demote
  the sitting owner to `admin` in the same transaction. Only the owner may do it.
- The owner cannot be removed — transfer first. This is also what stops the
  last member of a workspace from deleting themselves out of it.
- Removing yourself is "leave" and needs no admin rights.

### Invitations

| Method | Path | Body | Returns |
|---|---|---|---|
| GET | `/api/workspaces/:id/invitations` | — | `WorkspaceInvitation[]` |
| POST | `/api/workspaces/:id/invitations` | `{email, role}` | `201 WorkspaceInvitation` |
| DELETE | `/api/workspaces/:id/invitations/:invId` | — | `204` |
| POST | `/api/workspaces/:id/invitations/:invId/resend` | — | `WorkspaceInvitation` |

```jsonc
// WorkspaceInvitation
{
  "id": "invq81m",
  "email": "mira@northwind.example",
  "role": "member",
  "invited_by": "Alec Vishmidt",   // display name, not id — it is only ever shown
  "status": "pending",             // pending | accepted | expired | revoked
  "created_at": "2026-07-26T08:00:00Z",
  "expires_at": "2026-08-02T08:00:00Z"
}
```

Invitations address an **email**, not a user id — the invitee may have no Ogen
account yet, and accepting is what creates the membership (and, for an unknown
email, the user). `409` when the email is already a member or already has a
pending invitation; the UI shows the server's message rather than pre-checking
against a list that can be stale. `owner` is rejected at invite time (`422`) —
ownership is only reachable by transfer.

**Not yet designed — the accept flow.** It is the half that touches
unauthenticated routes and mail, and the prototype stops at the boundary:

- `GET /api/invitations/:token` — public, returns workspace name + inviter so
  the landing page can say what is being joined without leaking more.
- `POST /api/invitations/:token/accept` — authenticated: creates the membership
  for the signed-in user. If the email has no account, signup has to carry the
  token through so the account and membership are created together.
- The token is the secret; the `id` above is not it and must not be usable to
  accept.

## 5. Data model sketch

```sql
-- workspaces: the existing tenants table, plus a zone.
ALTER TABLE tenants ADD COLUMN timezone TEXT NOT NULL DEFAULT 'UTC';

CREATE TABLE memberships (
    id           TEXT PRIMARY KEY,
    user_id      TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    workspace_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    role         TEXT NOT NULL,        -- owner | admin | member
    joined_at    TIMESTAMP NOT NULL,
    UNIQUE (user_id, workspace_id)
);
-- one owner per workspace
CREATE UNIQUE INDEX memberships_one_owner
    ON memberships (workspace_id) WHERE role = 'owner';

CREATE TABLE invitations (
    id           TEXT PRIMARY KEY,
    workspace_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    email        TEXT NOT NULL,
    role         TEXT NOT NULL,
    token_hash   TEXT NOT NULL,        -- store the hash, mail the token
    invited_by   TEXT NOT NULL REFERENCES users(id),
    status       TEXT NOT NULL,
    created_at   TIMESTAMP NOT NULL,
    expires_at   TIMESTAMP NOT NULL,
    accepted_at  TIMESTAMP
);
CREATE UNIQUE INDEX invitations_one_pending
    ON invitations (workspace_id, lower(email)) WHERE status = 'pending';

ALTER TABLE sessions ADD COLUMN active_workspace_id TEXT REFERENCES tenants(id);
```

**Migration.** Backfill `memberships` one row per user from `users.tenant_id`
with `role='owner'`, then drop the column. Existing sessions need
`active_workspace_id` set from the same source, or the scoping middleware
should fall back to the caller's single membership when it is null — kinder
than logging everyone out.

**Naming.** The tables stay `tenants`/`tenant_id` and the API says
`workspace`. Renaming the column touches every scoped query for no behaviour
change; "tenant" is the isolation mechanism, "workspace" is the product word,
and they are allowed to differ. Worth an explicit decision either way.

## 6. Open questions for the backend

1. **Session vs header** (§3) — is one-workspace-per-session acceptable for v1,
   or do agency users need two tabs on day one?
2. **Accept flow** (§4) — token format, expiry, and whether signup-with-token
   creates account and membership in one transaction.
3. **Zernio profile per workspace** — confirm CON-102's bootstrap job can be
   reused as-is on workspace creation, and what happens to the profile on delete.
4. **Can a user create workspaces freely?** The prototype assumes yes. If
   workspaces become the billing unit, creation needs a limit and this becomes a
   plan question.
5. **Cross-workspace user identity** — one `users` row per email across all
   workspaces (assumed here), or per-workspace user records? The first is
   simpler and makes invitations resolve cleanly; it also means one password
   across workspaces.
6. **Timezone rollout** (CON-94) — the field is proposed here, but the change
   that matters is every scheduling surface reading it instead of the browser's
   zone. Separate piece of work; this only gives it somewhere to live.

## 7. Running the prototype

Stubs are on by default in dev. `VITE_STUB_WORKSPACES=false` in `.env.local`
turns them off (workspace calls then 404 against the real API). Everything
outside the workspace routes passes through to the real backend, so auth,
campaigns and posts behave normally.

Seeded with two workspaces — one owned, one where the user is an admin
alongside other members — because one workspace can't demonstrate any of this.
`window.__resetWorkspaceStubs()` restores the seed.

Delete `src/mocks/` and the `startStubs()` call in `src/main.tsx` when the real
endpoints land.
