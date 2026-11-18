# Workspaces, settings, streams & Brand binding

Conventions for tenancy and the active workspace, `/api/settings`, the two SSE streams and Brand bindings. Moved out of the root `CLAUDE.md` so it
loads only when needed — read this before changing the code it covers, and
keep it accurate when these rules change.

- **`/api/settings` is tenant-scoped, not user-scoped.** Every key is visible
  to the whole workspace via `GET /api/settings`. Personal preferences get
  their identity from the key (`userScopedKey` → `calendar.<userId>`,
  `postsTable.<userId>`); never put anything sensitive there. Use it for
  working habits that should follow the user between devices — the posts
  table's sort order (`docs/technical-decisions.md#posts-table-sort`) — and
  localStorage for per-device display state. See
  `docs/technical-decisions.md#user-scoped-settings`.

- **Two long-lived streams, and they are not interchangeable.** `/api/events`
  is an invalidation bus — at-most-once, no log, `Last-Event-ID` ignored — so an
  event is a *hint* that a cache is stale and the recovery path is refetch.
  `/api/notifications/stream` is an inbox: the table is the log, the stream
  replays from `Last-Event-ID`, and a row survives the tab being closed. Put a
  fact somebody must not miss on the second one and a cache hint on the first;
  neither can stand in for the other. Since CON-285 they share a vocabulary, so
  a few names are on both — the same fact doing two jobs, not duplication. They
  share only the machinery for staying open (`lib/streamConnection`: backoff,
  silence watchdog, subscriber counting) and the one frame parser
  (`lib/sse.ts`) — keep both single. And notification
  copy comes from the **catalogue**, keyed off `type` + `data`, never from the
  `title`/`body` the server composes; those are the fallback for a `type` this
  build predates (`lib/notifications.ts`, `docs/activity.md`).

- **A close the server announced is a handover, not a drop.** Both streams are
  closed every 30 minutes to reclaim their slot (CON-286) and send
  `event: recycle` — no `id:` line, so it never moves the replay cursor —
  immediately before doing it. Each service reports it through `onRecycle`, and
  `lib/streamConnection` reconnects on the spot: no backoff step, no failure
  counted, and the status holds at `open`, because `LiveStatus` draws its
  warning from `reconnecting` and one that appears twice an hour teaches people
  to read past the one that matters. What the announcement does **not** buy is
  skipping recovery: the events bus keeps no log, so a round trip is still a
  gap and `reconcile` still runs — `announce: false` silences the banner, never
  the refetch.

- **A Brand binding is four nullable ids, and the client only ever sets them**
  (CON-245). `brand_voice_id` and `brand_audience_id` sit on the campaign and on
  the post; *which* voice a post is actually written in is resolved — post →
  campaign → the library's default voice, and for an audience post → campaign
  and then nothing, because the workspace step is voices-only. That walk lives
  in `components/brand/binding.ts` and mirrors `brandresolve` on the server,
  which is what the generation flows obey; when the two disagree, ours is wrong.
  Never resolve inline at a call site, and always show `source` beside a
  resolved value — an inherited voice in a bare picker reads as *no voice*, and
  the repair everyone reaches for pins it onto every post and kills the
  campaign-level control. The model is deliberately **narrower than
  `docs/brand-materials.md` §8**: no cast of voices, no local delta, no
  staleness read, because the server shipped none of the three (CON-245 §13 is
  where they would come back) and a picker whose extra choices no generator
  reads is worse than no picker. **All four refs are presence-aware on their
  PUTs**, which is why `campaignToPayload` and `postToPayload` both leave them
  out — restating one lets an autosave undo a choice made a moment ago. A
  campaign's is written by passing an override to `campaignToPayload`; a post's
  goes through `setPostBrand` (`PUT /api/posts/:id/brand`), which is *not*
  blocked on a submitted post: a binding is an input to the next generation, not
  a change to what already went out, so CON-251's lock does not reach it. See
  `docs/technical-decisions.md#brand-binding`.

- **A workspace is the tenant and a member is a user.** Inside a workspace,
  `services/api/workspaces.ts` is a façade over `/api/tenants/current`,
  `/api/users` and `/api/invitations` (CON-26); the account-level
  `/api/workspaces` routes (list/create/switch/delete, CON-147) are the one
  place a workspace is a resource of its own. The two roles it deals in are
  the server's: `owner | member`, nothing else.
  **`DELETE /api/users/:id` removes a membership, and only from the active
  workspace** — the account and its other workspaces survive, but the cascade
  from `created_by` destroys the campaigns, posts and assets that membership
  created *here*, so every caller confirms both halves in those words. The
  server guards the ≥1-owner invariant (409). There is **no account deletion
  on the API** — Profile's Danger Zone is "leave this workspace". And a
  `users.id` is a **per-workspace membership id**: `current_user`'s id names
  the *default* workspace's membership, so identity checks across workspaces
  go by email (`listMembers`' `is_self`), never by id. See
  [`docs/workspace-api.md`](./docs/workspace-api.md) §4a.

- **Which workspace a request acts in is named per request, not per session**
  (CON-147). The tab's workspace lives in `lib/activeWorkspace.ts` —
  **`sessionStorage`, never `localStorage`**, or two tabs could not sit in two
  workspaces, which is the whole feature — and `services/api/base.ts` attaches
  it as `X-Workspace-Id`. Anything that reaches the API with a bare `fetch`
  goes through **`scopedFetch`** so a scoped call can't quietly land in
  whichever workspace the account defaults to; XHR paths call
  `workspaceHeader()` after `open()`. Account-level routes
  (`/api/workspaces…`, `/api/current_user`, `/api/sessions`, the public
  `/api/invitations/accept/:token`) deliberately send **no** header — they are
  the calls a tab makes to recover when its own workspace stops answering. Two
  more consequences: `user.role` from `/api/current_user` is the role in the
  *default* workspace, so read the active one through `useWorkspace()`; and a
  403 is not proof of a stale pin (owner-only routes answer 403 too), which is
  why `lib/staleWorkspace.ts` verifies before it acts.

- **Switching workspace is client-side.** `useSwitchWorkspace` re-pins the tab,
  clears *this tab's* Query cache and navigates; it does not reload, does not
  rebind the session and must not touch another tab. `POST …/:id/switch` is
  fire-and-forget — it only sets the account's default for the next fresh tab.
  See `docs/workspace-api.md` §3.
