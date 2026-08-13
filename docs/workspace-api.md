# Workspaces — proposed API

**Status: half of this landed.** CON-26 shipped people, roles and invitations
*inside* one workspace, and the UI now talks to the real endpoints for all of
it — see §4a for the mapping, which is not the one this document proposed. What
is still a proposal is the multi-workspace model itself: holding several
workspaces and switching between them. That half is served in development by
`src/mocks/handlers.ts`, consumed by real UI, and gated behind the
`multi-workspace` feature flag (`config/featureFlags.ts`), which is **off**.

The sections below are kept as written except where marked, because they are
the argument for the remaining half.

**Aligned to [CON-147](https://linear.app/ogen/issue/CON-147/workspaces)**,
which carries the backend spec (identity split, `accounts` table, migration,
RBAC middleware). Where this document and CON-147 §10 differ, the differences
are listed in §7 below and each one is a decision, not an oversight. Verbs and
paths otherwise follow CON-147.

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

**Proposal: in the session.** `POST /api/workspaces/:id/switch` rebinds the
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

Client-side consequence, already implemented: on a successful `switch` the UI
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
| POST | `/api/workspaces` | `{name}` | `201 Workspace` |
| PATCH | `/api/workspaces/:id` | `{name?}` | `Workspace` (admin+) |
| DELETE | `/api/workspaces/:id` | — | `204` (owner only) |
| POST | `/api/workspaces/:id/switch` | — | `204` |

```jsonc
// Workspace
{
  "id": "wsOwn001",
  "name": "Northwind Client",
  "slug": "northwind-client",   // from the name at creation, stable across renames
  "role": "admin",               // caller's role — from the membership
  "member_count": 3,
  "is_active": true,             // caller's session is bound to this one
  "created_at": "2026-06-18T09:00:00Z",
  "updated_at": "2026-07-27T11:20:00Z"
}
```

`role`, `is_active` and `member_count` are caller-relative or derived, so the
list is not a plain select — it is a join over memberships.

**`member_count` and `is_active` are a request, not a nicety.** The switcher
page renders "Admin · 5 members" per row and has to mark the one you're in.
Without them it is an N+1 over `/members` to draw a list of three cards, or a
second call to learn which workspace the session already holds.

**No `timezone`.** The zone is CON-94's, and until the scheduling surfaces read
it there is nothing for the field to do but be wrong in a second place —
everything is UTC. Workspace settings shows `UTC` as read-only text so the
question has an answer, and the create form doesn't ask.

**Creation side effects.** A new workspace provisions its own Zernio profile
(`Ogen #{WORKSPACE_ID}`, CON-102) — that is what makes its social accounts
separate. Reuse the existing bootstrap job; creation must not block on Zernio
being reachable, exactly as signup doesn't.

**Deletion is a soft delete** (CON-147 open decision 2): the row survives,
writes are blocked, and the workspace leaves every member's list. That is an
operational safety net, not an undo — **there is no self-serve restore**, and
recovery is a manual, support-side operation. The UI is written to match: "You
can't undo this yourself — recovering a deleted workspace is a manual support
request." Cascade-detaching the Zernio profile and hard-deleting content can
follow later without touching the client.

Published posts stay live on the networks — the UI says so.

### Members and invitations — see §4a

Both were proposed here as workspace sub-resources. **CON-26 landed them
elsewhere and differently**, and the UI follows the server. The proposal is
kept below §4a for the record, since the multi-workspace version will have to
answer the same questions again — but nothing in the app calls those paths.

## 4a. What CON-26 landed, and how the UI maps onto it

Three routes carry people and invitations, none of them under `/api/workspaces`
— because there is no workspace resource to hang them off. A workspace *is* the
tenant, and a member *is* a user.

| Concept | Proposed here | What exists | Client |
|---|---|---|---|
| Read the workspace | `GET /api/workspaces` + `is_active` | `GET /api/tenants/current` | `getWorkspace` |
| Rename it | `PATCH /api/workspaces/:id` | `PUT /api/tenants/:id` — whole body, `name` required | `updateWorkspace` |
| List members | `GET /api/workspaces/:id/members` | `GET /api/users` — any member may read | `listMembers` |
| Change a role | `PATCH …/members/:userId` | `PATCH /api/users/:id/role` — owner only | `updateMemberRole` |
| Remove someone | `DELETE …/members/:userId` | `DELETE /api/users/:id` — **deletes the user row** | `removeMember` |
| Invitations | `…/workspaces/:id/invitations` | `/api/invitations` — owner only, all three verbs | `services/api/workspaces.ts` |

The differences that changed the UI, rather than just its URLs:

- **Two roles, not four.** `owner | member` (`models.IsValidRole`); the server
  400s anything else. `admin` and `viewer` are gone from the client — CON-147
  inserts `admin` when the server does. `canActOnMember` / `canGrantRole` /
  `canManageWorkspace` survive as the seam that will re-acquire nuance then.
- **Removing a member deletes their account.** There is no membership row to
  detach: one user, one tenant, so the server hard-deletes `users` and the
  schema cascades from `users.id` into `sessions`, `tags`, `campaigns`,
  `assets`, `posts` and `post_attachments` via `created_by ON DELETE CASCADE`.
  Everything that person made is destroyed, for everyone. The People card
  therefore asks for their email to be typed and says what goes, in those
  words — the same confirmation shape as deleting a workspace. **Leaving** is
  not offered here at all: it is the same call on your own id, i.e. deleting
  your account, which already has its screen on Profile.
- **`POST /api/invitations` is not idempotent.** A live pending invite for the
  same address is `409`; only an *expired* one is replaced in place
  (`CreateReplacingExpiredTx`). So "resend" is offered on expired rows only —
  a live one is cancelled and re-sent. An address that already has an Ogen
  account anywhere is also `409`, because `users.email` is globally unique.
  Rate-limited per workspace and per IP; `429` carries `Retry-After`.
- **`invited_by` is a user id**, not a display name. The People card resolves
  it against the member list it already has, and drops the clause when the
  inviter's account is gone.
- **Expiry is not a status.** The wire has `pending | accepted | revoked`; a
  pending row past `expires_at` *is* the expired one (`invitationState`).
- **Reading the invitation list is owner-only.** A member's request is `403`,
  so the query is never fired for them — they see the people and the note
  saying who can change things.
- **Accept is public and already built** — `GET/POST
  /api/invitations/accept/:token`, which the "not yet designed" note below
  anticipated. The invitee's landing page is not this repo's yet.

---

_The original proposal for members and invitations follows, unbuilt._

### Members

| Method | Path | Body | Returns |
|---|---|---|---|
| GET | `/api/workspaces/:id/members` | — | `WorkspaceMember[]` |
| PATCH | `/api/workspaces/:id/members/:userId` | `{role}` | `WorkspaceMember` (admin+) |
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

- Roles are `owner | admin | member | viewer`, weakest last. `owner` is per
  workspace, not global. `viewer` is read-only: it can open campaigns, posts
  and assets and change none of them — the role for a client who wants to see
  what is planned without being able to touch it.
- **Several owners are allowed**, with the invariant that a workspace always
  keeps **at least one**. Promoting to `owner` grants the role; nobody is
  demoted. Demoting or removing the last owner is `409`.
- Two rank rules cover the rest, and reproduce CON-147 §8 without enumerating
  the matrix: **you may act on someone below your rank**, and **you may grant a
  role at or below your own**. So an admin manages members and viewers and can
  promote to admin, but cannot touch another admin or an owner.
- **Owners act on each other as peers** — the one exception, and a necessary
  one. Nobody outranks an owner, so under the strict rule an owner row could
  never be edited by anyone, and with several owners allowed a mistaken
  appointment would be permanent. This is also what lets an owner step down.
- Removing yourself is "leave" and needs no rank at all — except for the last
  owner, who has to appoint another first.

`src/types/workspace.ts` has these as `canActOnMember` / `canGrantRole` /
`grantableRoles`, and `src/mocks/handlers.ts` calls the same functions, so the
stub enforces exactly what the UI greys out.

### Invitations

| Method | Path | Body | Returns |
|---|---|---|---|
| GET | `/api/workspaces/:id/invitations` | — | `WorkspaceInvitation[]` |
| POST | `/api/workspaces/:id/invitations` | `{email, role}` | `201` new / `200` re-issued |
| DELETE | `/api/workspaces/:id/invitations/:invId` | — | `204` |

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
email, the user).

**`POST` is idempotent per email, and there is no resend endpoint.** Posting an
address that already has a pending or expired invitation re-issues it: new
token, new expiry, mail sent again, `200` instead of `201`. The reasoning is
that "resend" and "send" are the same act — a separate route would differ only
in whether the client happened to know the invitation's id, and it would need
its own auth check, its own 404 and its own tests to do nothing new. Making
`POST` idempotent also removes a dead end: an invite that `409`s because a
pending one exists forces the user to hunt down and cancel it before they can do
the obvious thing.

`409` is therefore reserved for an email that is already a **member** — a
different situation with a different fix. The UI shows the server's message
rather than pre-checking against a list that can be stale.

Since several owners are allowed, `owner` is a legal invite role — for an owner
to send. An admin inviting an owner is `403` under the grant rule, not `422`.

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

CON-147 §7 is the authoritative version of this (it splits identity into
`accounts` and repurposes `users` as the membership row, which is the better
shape). The only parts that differ are the role set and the owner constraint:

```sql
-- As proposed. CON-26 shipped `CHECK (role IN ('owner','member'))` on
-- `users.role`; the membership row is what would carry it here.
role TEXT NOT NULL CHECK (role IN ('owner','admin','member','viewer'))
```

and **no** `memberships_one_owner` unique index — several owners are allowed, so
the invariant is "at least one", which is not expressible as a unique index.
Enforce it in the transaction that demotes or removes a member (`SELECT count(*)
… WHERE role='owner'` under the same lock), and answer `409`.

An earlier, simpler sketch, kept because it reads in one screen:

```sql
CREATE TABLE memberships (
    id           TEXT PRIMARY KEY,
    user_id      TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    workspace_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    role         TEXT NOT NULL,        -- owner | admin | member | viewer
    joined_at    TIMESTAMP NOT NULL,
    UNIQUE (user_id, workspace_id)
);

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
-- The index the idempotent POST relies on: one live invitation per address,
-- so re-inviting updates a row instead of racing a second one into existence.
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
6. **Timezone rollout** (CON-94) — deliberately not in this shape. The change
   that matters is every scheduling surface reading a workspace zone instead of
   the browser's, which is its own piece of work; adding the column now only
   creates a second place to be wrong. Everything is UTC until then.

## 7. Divergences from CON-147 §10, and why

Each of these is a decision taken while building the UI against the stubs. They
are small, and they are all in this direction: fewer routes, fewer special cases,
fewer states the UI has to explain.

| | CON-147 §10 | Here | Why |
|---|---|---|---|
| Roles | `owner \| admin \| member` | **`owner \| member`** (CON-26 shipped) | The client mirrors the server, which recognises two (`models.IsValidRole`). The `viewer` argument below stands and is unbuilt: read-only is the agency case in CON-147 §1 — a client who watches the plan without touching it. |
| Owners | ≥1, multiple allowed (rec 3) | same | Adopted. The UI counts owners and locks the last one; the server answers `409`. |
| Switch | `POST …/:id/switch` | same | Adopted (was `activate`). |
| Verbs | `PATCH` | same | Adopted (was `PUT`). Bodies are partial, so `PATCH` is the honest verb. |
| Resend | not specified | **no endpoint**, and `POST` is *not* idempotent (CON-26 shipped) | The proposal lost this one. A live pending invite `409`s; only an expired one is replaced. The UI offers "resend" on expired rows only — see §4a. |
| `timezone` | absent | absent | Adopted. UTC everywhere; the settings page shows it as read-only text. |
| List shape | `{id,name,slug,role,last_active_at}` | **+ `member_count`, `is_active`** | The switcher renders "Admin · 5 members" and marks the current row. Otherwise it's an N+1 over `/members`. |
| Delete | soft-archive in v1 (rec 2) | **soft-delete, no self-serve restore** | Adopted, with the copy saying so plainly: recovery is a manual support request, not an undo button. |

## 8. Running the prototype

Turn `multi-workspace` on in `src/config/featureFlags.ts`. The stubs start only
when that flag is on **and** the build is a dev one — they overlay
`GET /api/tenants/current`, and answering a real request with invented data is
exactly what a flag-off feature must not do. `VITE_STUB_WORKSPACES=false` in
`.env.local` turns them off independently (the workspace calls then 404 against
the real API).

Only the four unbuilt routes are stubbed. People, roles and invitations go to
the real backend either way, as does everything else.

Seeded with two workspaces — the one you are genuinely in, taken from
`/api/tenants/current`, plus a client workspace — because one workspace can't
demonstrate any of this. `window.__resetWorkspaceStubs()` restores the seed.

Delete `src/mocks/`, the `startStubs()` call in `src/main.tsx` and the flag when
the real endpoints land.
