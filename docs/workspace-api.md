# Workspaces — the API, and how the UI sits on it

**Status: all of it is written, and all of it is deployed.** CON-26 shipped
people, roles and invitations *inside* one workspace — §4a maps them. CON-147
shipped the rest (accounts split from memberships, per-request workspace
resolution, `/api/workspaces`) in
[ogen#109](https://github.com/ogen-app/ogen/pull/109), merged to the server's
`main` on 2026-08-14. The client was re-tested against that build and the
`multi-workspace` flag (`config/featureFlags.ts`) is **on**; the flag and its
off-branch stay until the feature has baked in production (§8).

This document is no longer a proposal. Where it once argued for a design that
CON-147 decided differently — the session-bound active workspace of §3 is the
big one — it now records the decision and what the client does about it.

Related: CON-97 (multi-tenancy), CON-26 (user invitation), CON-94 (workspace
timezone), CON-102 (per-tenant Zernio profiles).

---

## 1. What changes

Today a **tenant** is a workspace and a user belongs to exactly one of them
(`users.tenant_id NOT NULL`, CON-97). That is the only thing CON-147 breaks.
Identity splits from membership — an `accounts` row is the login, a `users` row
becomes one (account, workspace) membership carrying the role — and which
workspace a request acts in is decided **per request**.

The tenant boundary itself does **not** change. Scoping stays central,
server-side and fail-closed; every existing endpoint keeps reading its tenant
out of `tenantctx`. What changes is only what puts the value there.

```
before   users ──1:1──> tenants
                        ▲
                        └── session.tenant_id

after    accounts ──*:*──> workspaces   (via users-as-memberships, with a role)
                           ▲
                           └── X-Workspace-Id, per request, per tab
                               (session.tenant_id demoted to "default")
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

**Decided: per request, in an `X-Workspace-Id` header** (CON-147 §11, resolved
2026-08-11). This document originally proposed binding it to the session and
argued the header down; the argument lost, and it lost to the requirement rather
than to taste. A session-bound workspace makes "client A in one tab, client B in
another" structurally impossible, and that is the case workspaces exist for.

What the server does: the session identifies the **account**; a
`ResolveWorkspace` middleware reads the header, checks it against membership,
and puts the result where `tenantctx` has always read it. The ~150 scoped call
sites are untouched. Two consequences worth knowing on the client:

- **Membership is re-validated on every request.** Someone removed mid-session
  is refused on their next call rather than at their next login. There is no
  stale-role window — and there is a new failure mode, below.
- **A request without the header falls back to the account's default**
  (`sessions.tenant_id`, which `POST …/:id/switch` sets). The fallback is a
  seed, not a resting place — see below.

### What the client does about it

| Concern | Where |
|---|---|
| The tab's workspace | `lib/activeWorkspace.ts` — **`sessionStorage`**, never `localStorage`, which is shared by every tab and would couple them back together |
| Attaching the header | `services/api/base.ts` — `workspaceHeader()` for `fetch`/XHR, `scopedFetch()` for the streams and typed-error resources |
| Which calls stay unscoped | account-level routes: `GET/POST /api/workspaces` and below, `/api/current_user`, `/api/sessions`, and the public `/api/invitations/accept/:token` |
| Switching | `useSwitchWorkspace` — re-pin, `queryClient.clear()`, navigate. No reload, no session rebind, no effect on other tabs |
| Seeding a fresh tab | `routes/__root.tsx` — writes the account's default into `sessionStorage` on first load |
| A stale pin | `lib/staleWorkspace.ts` — on 403, **verify then act** |

Three of those are less obvious than they look.

**The account-level exemption is the recovery path, not tidiness.** A tab pinned
to a workspace that was deleted, or one it has been removed from, gets 403 on
everything scoped. The calls that put it right — list my workspaces, who am I,
log in — must be reachable from exactly that state, so they must never carry the
header that is causing it.

**A fresh tab is pinned immediately, rather than left to ride the default.**
The default is shared account state, so an unpinned tab would follow *another*
tab's switch — precisely the cross-tab interference this design exists to
prevent.

**403 is verified before it is acted on.** It is also the ordinary answer to a
member calling an owner-only route (rename, list invitations), so the recovery
asks the header-free workspace list whether the workspace is still the
account's, and only then unpins and reloads. Tearing a tab down over a
permission error would be worse than the bug it fixes.

Clearing the whole Query cache on a switch is unchanged from the original
proposal, and for the original reason: everything cached belongs to the
workspace just left, and one missed key is another client's content on screen.
What changed is the blast radius — it is this tab's cache, not the app's.

## 4. Endpoints

All are session-authenticated. `403` when the caller isn't a member; `404` is
returned instead of `403` for workspaces they can't see at all, matching CON-97
§12.3.

### Workspaces — account-level

These four are the exception to §3: they belong to the login, not to a
workspace, and go out **without** `X-Workspace-Id`.

| Method | Path | Body | Returns |
|---|---|---|---|
| GET | `/api/workspaces` | — | `Workspace[]` — the account's memberships |
| POST | `/api/workspaces` | `{name}` | `201 Workspace` |
| DELETE | `/api/workspaces/:id` | — | `204` (owner only; `409` if it's the account's only one) |
| POST | `/api/workspaces/:id/switch` | — | `204` — sets the **default**, not the active workspace |

Renaming goes through `PUT /api/tenants/:id` (§4a), which is scoped to the tab's
own workspace and needs no id in the path from the client's point of view.

```jsonc
// Workspace
{
  "id": "wsOwn001",
  "name": "Northwind Client",
  "slug": "northwind-client",   // from the name at creation, stable across renames
  "role": "owner",               // caller's role in *this* workspace — from the membership
  "member_count": 3,
  "is_default": true,            // where a fresh tab or a new login starts
  "created_at": "2026-06-18T09:00:00Z",
  "updated_at": "2026-07-27T11:20:00Z"
}
```

`role`, `is_default` and `member_count` are caller-relative or derived, so the
list is not a plain select — it is a join over memberships.

**There is no `is_active`, and there cannot be.** The server has no idea which
workspace a given *tab* is in — the tab tells it, per request. "Current" on the
chooser is a client-side comparison against `lib/activeWorkspace`. `is_default`
is a different fact and answers a different question.

**`member_count` and `role` are a request, not a nicety.** The switcher renders
"Owner · 5 members" per row without an N+1 over the member list — and `role` is
load-bearing beyond the caption: `/api/current_user` is account-level, so it
reports the role in the *default* workspace. For any tab that has moved, this
list is the only correct source (`useWorkspace`).

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

Three routes carry people and invitations, none of them under
`/api/workspaces` — a workspace *is* the tenant, a member *is* a user, and since
CON-147 the workspace is named by the request's `X-Workspace-Id` header rather
than by a path segment. Managing the people of workspace B means being pinned to
B (§3), not passing B in a URL.

| Concept | Proposed here | What exists | Client |
|---|---|---|---|
| Read the workspace | `GET /api/workspaces/:id` | `GET /api/tenants/current` — the tab's own, via the header | `getWorkspace` |
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
- **`POST /api/invitations` is idempotent per email** (CON-147 §7.3,
  `CreateReplacingPendingTx`): a pending invite for the address — live or
  expired — is replaced with a fresh token, expiry, role and email (`200`); a
  brand-new one is `201`. There is no separate resend route, so RESEND on any
  pending row is this same call. An address that already holds an Ogen account
  may be invited into another workspace; the one `409` is an address that is
  already a member of *this* workspace (or the loser of two simultaneous
  invites racing the replace — retrying re-issues cleanly). Rate-limited per
  workspace and per IP; `429` carries `Retry-After`.
- **`invited_by` is a user id**, not a display name. The People card resolves
  it against the member list it already has, and drops the clause when the
  inviter's account is gone.
- **Expiry is not a status.** The wire has `pending | accepted | revoked`; a
  pending row past `expires_at` *is* the expired one (`invitationState`).
- **Reading the invitation list is owner-only.** A member's request is `403`,
  so the query is never fired for them — they see the people and the note
  saying who can change things.
- **Accept is public, and it is two acts behind one route.** `GET
  /api/invitations/accept/:token` previews (workspace, inviter, address);
  `POST` to the same path either creates the account and signs it in
  (`{name, password}` → `201` + cookie) **or** adds the workspace to an account
  that already exists (no body at all → `200`, no new cookie, and the caller
  must already be signed in as that address, else `403`).

  The preview says which applies: `has_account` is true when the invited
  address already holds an Ogen account, so `/invite` branches before anything
  is typed — password form for a fresh address, "sign in as it" for a taken
  one. The `403` remains as the backstop for the race where the account
  appears between preview and accept; the invitation survives every refusal.
  When someone is already signed in there is nothing to decide: they are
  either the invitee (one button) or they are not (no form on that page can
  help until they log out).

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
`grantableRoles`. With two roles they all collapse to "are you an owner"; they
stay separate because they answer different questions, and a `viewer` or
`admin` tier would pull them apart again.

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

~~**Not yet designed — the accept flow.**~~ Shipped, on a different path than
guessed here (`/api/invitations/accept/:token`, not `/:token/accept`) and in two
modes rather than one — see §4a. The token is the secret; the `id` above is not
it and is not usable to accept.

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

## 6. Questions, and where they landed

1. ~~**Session vs header**~~ — **header** (§3). Two tabs on day one was the
   requirement, not a nice-to-have.
2. ~~**Accept flow**~~ — settled, and it is *two* flows behind one route: a new
   address sends `{name, password}` and is signed in (`201`), an address that
   already has an account sends **nothing** and must already be signed in as it
   (`200`, no new cookie), otherwise `403`. See §4a.
3. ~~**Zernio profile per workspace**~~ — CON-102's bootstrap job is reused on
   creation; a teardown job runs on delete.
4. ~~**Cross-workspace identity**~~ — one `accounts` row per email, `users`
   repurposed as the (account, workspace) membership. One password across
   workspaces.
5. **Can an account create workspaces freely?** Still open. The client assumes
   yes. If workspaces become the billing unit this needs a limit, and it becomes
   a plan question rather than an API one.
6. **`invited_by` is a user id, not a name.** `GET /api/invitations` sends the
   id while the public preview sends `inviter_name`. The client resolves it
   against the member list, which is why nothing is blocked on it — but the
   list endpoint enriching it would delete that join. Serhii offered; worth
   taking when the endpoint is next touched.
7. **The preview can't say whether the address is taken**, so the accept screen
   can't choose its mode up front — it asks for a password, and treats the
   server's `403` as the branch (§4a). A boolean on the preview would make it a
   decision instead of a round trip.
8. **Timezone rollout** (CON-94) — deliberately still out of shape. The change
   that matters is every scheduling surface reading a workspace zone instead of
   the browser's, which is its own piece of work; adding the column now only
   creates a second place to be wrong. Everything is UTC until then.

## 7. Where the prototype and the shipped API differed

The client was built ahead of the server, so some of it was written against
guesses. This is the reconciliation — kept because it says which way each
argument went, and why.

| | Prototype | Shipped | Outcome |
|---|---|---|---|
| Active workspace | session-bound `/switch` + full reload | **per-request `X-Workspace-Id`**, per-tab | **Prototype overridden.** Multi-tab is the requirement; a session-bound value forbids it. Rewritten — §3. |
| Roles | `owner \| admin \| member \| viewer` | **`owner \| member`** | **Prototype overridden**, inherited unchanged from CON-26. `viewer` remains a real case (a client who watches the plan without touching it) and is deliberately unbuilt. |
| Resend | `POST` idempotent per email, no resend route | **CON-147 §7.3: idempotent** — any pending invite, live or expired, is re-issued (`200`; new ones `201`) | **Prototype won.** CON-26 first shipped 409-on-live, and RESEND was gated to expired rows; ogen#109's final commits made create idempotent, and RESEND now sits on every pending row. |
| Accept | one mode: name + password | **two modes**, branched on whether the address already has an account | **Prototype was half.** Built out — §4a. |
| List shape | `+ member_count, is_active` | `+ member_count, is_default` | **Half adopted.** `member_count` yes; `is_active` can't exist server-side, and "Current" is a client-side comparison. |
| Owners | ≥1, multiple allowed | same | Adopted. The UI counts owners and locks the last one; the server answers `409`. |
| Delete | soft-delete, no self-serve restore | same, `+ 409` when it's your only workspace | Adopted, copy unchanged: recovery is a manual support request, not an undo button. |
| `timezone` | absent | absent | Adopted. UTC everywhere; the settings page shows it as read-only text. |

## 8. Turning it on

**The stubs are gone.** `src/mocks/` existed to answer the four routes nobody
had written; ogen#109 wrote them, and a stub that now encodes the *wrong*
contract — session-bound switching, `is_active` — is worse than no stub. MSW is
off the dependency list with it.

What is left is the flag. `multi-workspace` in `src/config/featureFlags.ts`
gates the chooser, "Create or switch", the SWITCH button, the workspace Danger
Zone **and** the `X-Workspace-Id` header itself: with it off,
`services/api/base.ts` sends no workspace header on any request, so the app is
byte-for-byte the single-workspace app it was before this work.

Turning it on, in order — steps 1 and 2 happened on 2026-08-14:

1. ~~ogen#109 merges and deploys~~ — merged to the server's `main`; the local
   image answers every §4 route.
2. ~~Flip the flag and exercise it against the deployed API~~ — done against
   the ogen#109 build: list/create/switch/delete (including the last-workspace
   `409`), the idempotent re-invite (`200` vs `201`) and the `has_account`
   preview. The two-tab walkthrough in a browser is part of the release
   check.
3. **Open:** decide the flag's fate. Deleting it, with its off-branch, is a
   deliberate step once the feature has baked in production.

One thing to re-check at step 2 rather than assume: **REMOVE's copy.** Against
today's API `DELETE /api/users/:id` destroys the person and cascades into
everything they made, and the confirmation says so in those words. Once `users`
is a membership row that call is a detach, and the dialog has to stop saying it
is a deletion.
