# CLAUDE.md

Guidance for working in this repository. Keep it accurate — update it when the
conventions below change.

## What this is

The React + Vite single-page app for **Ogen**, a multi-tenant, AI-assisted
platform for planning, generating, and publishing social-media content. This
repo is **front-end only**; it talks to the Go API (`ogen-app/ogen`) over
app-relative `/api` requests. Split out of the `ogen` monorepo (CON-98).

**Direction:** Ogen is transitioning to a multi-tenant SaaS where **Claude and
Zernio run centrally "under the hood"** — their keys are platform-managed, not
tenant-configured (CON-97 §10.3, CON-99); tenants still connect their own social
accounts. The front-end multi-tenancy cutover landed 2026-07 (real
`current_user` identity, workspace settings, per-instance API-key config
removed — see [`docs/onboarding.md`](./docs/onboarding.md)). **Current
front-end priority:** the **Post Assistant + post-editing UIs** (CON-42/61).
Content-Bank AI images are secondary. See
[`docs/product.md`](./docs/product.md#direction--current-priorities).

- **Product & domain:** [`docs/product.md`](./docs/product.md)
- **Front-end architecture:** [`docs/architecture.md`](./docs/architecture.md)
- **Technical decisions & rationale:** [`docs/technical-decisions.md`](./docs/technical-decisions.md)
- **Onboarding, auth & tenancy flow:** [`docs/onboarding.md`](./docs/onboarding.md)
- **Campaign "needs attention" rule set:** [`docs/attention-rules.md`](./docs/attention-rules.md)
- **Campaign stages — how they work & proposal:** [`docs/campaign-stages.md`](./docs/campaign-stages.md)
- **Run & deploy:** [`README.md`](./README.md)

Requirements live in Linear under the **`CON-`** project (the app's internal
name is "Content Control Center"). There is no PRD checked into this repo.

## Commands

```bash
pnpm install
pnpm dev        # Vite dev server on http://localhost:9002, proxies /api → :9001
pnpm build      # tsc (type-check) && vite build → dist/
pnpm preview    # serve the production build
pnpm lint       # eslint . --ext ts,tsx
```

Run the API separately from the `ogen` repo (`make run`) or via
`docker compose up`. See [`docs/architecture.md`](./docs/architecture.md#build--tooling).

## Conventions & gotchas

Most of these are load-bearing — see `docs/technical-decisions.md` for the why.

- **`src/routeTree.gen.ts` is generated.** Never edit it. It regenerates from
  `src/routes/` via the Vite router plugin.
- **Route file split:** `index.tsx` owns routing (`createFileRoute`,
  `beforeLoad`, `validateSearch`); the co-located **`page.tsx` is
  intentionally invisible to the router** and holds the presentational
  component.
- **Trailing-underscore route segments** (`$campaignId_`, `content-bank_`)
  deliberately escape the parent layout to render fullscreen.
- **Auth is guarded once, in `routes/__root.tsx`** `beforeLoad` — not on
  `_authenticated`. Distinguish `ServerUnavailableError` (→ `/server-unavailable`)
  from a 401 (→ `/auth/login`).
- **Server state → TanStack Query; UI/session state → Zustand.** Don't hold
  fetched data in a store. Query keys are co-located per hook and exported when
  another hook must invalidate them. Note the post editor (`["post", id]`) and
  post list (`["campaigns", id, "posts"]`) are separate namespaces.
- **The post editor autosaves through the Query cache** (`usePost.changeDoc`,
  600ms debounce, generation-counter guarded, flush-on-unmount). Campaign forms
  autosave similarly. Prefer these patterns over new local edit stores.
- **Unscheduling a post is a `cancel`, not a status `PUT`** — see
  `lib/postStatusMachine.ts` and `docs/technical-decisions.md#cancel-vs-transition`.
  Getting this wrong can publish a post the user thought was cancelled.
- **Scheduling a post is a `schedule`, not a status `PUT`** — it goes through
  `POST /api/posts/:id/schedule` (server validates the date and routes
  auto/manual); the PUT path skips date validation. `scheduled_at` is locked
  while `scheduled`/`published` (`canEditScheduledAt`). See
  `docs/technical-decisions.md#schedule-endpoint`.
- **`src/lib/*` mirrors Go server rules** (`postStatusMachine`, `assetStatus`,
  platform gating). The server is the source of truth; keep these in sync when
  the backend changes.
- **`/api/settings` is tenant-scoped, not user-scoped.** Every key is visible
  to the whole workspace via `GET /api/settings`. Personal preferences get
  their identity from the key (`userScopedKey` →
  `calendar.<userId>.<campaignId>`); never put anything sensitive there. See
  `docs/technical-decisions.md#user-scoped-settings`.
- **Explanatory copy goes in `<Explainer>`**, which the user can close for
  good (`settingsStore.dismissedNotes`, device-local — display noise doesn't
  belong in the workspace-wide `/api/settings`). The rule that makes it safe:
  an Explainer holds **teaching only** — never a count, warning, validation
  message, or link the user needs while working, because all of it disappears
  for anyone who closes the note. Check the screen still reads correctly with
  the Explainer deleted. See `docs/technical-decisions.md#explainers`.
- **All API calls go through `services/api/`** with `credentials: "include"`.
  Use `apiJson`/`apiVoid` from `http.ts` unless a resource needs progress
  (`uploads` uses XHR) or typed errors (`zernio`).
- **Styling is CSS-first:** the theme and tokens live in `src/index.css`; there
  is no `tailwind.config.js`. Use `cn()` from `lib/styles.ts`. Apply z-index
  from `config/zIndex.ts` via inline `style={{ zIndex }}`, not `z-[…]` classes.
  Colors only via semantic tokens (`bg-primary`, `text-tertiary-foreground` —
  never `bg-white`, palette steps, or raw hex/oklch): see
  [`docs/colors.md`](./docs/colors.md).
- **Two form systems by design:** lightweight `useFormValidation` for auth
  forms, full RHF + `ui/form.tsx` for feature forms.
- **Destructive-action labels are written in literal capitals** — `DELETE
  CAMPAIGN`, not `Delete campaign` with a `uppercase` class. The caps are part
  of the copy (they survive copy/paste, screen readers, and any restyle), so
  never swap them for CSS casing and never "sentence-case" them back. Applies
  to every Danger Zone / irreversible action across the app. Leave the button
  styling alone — this is a copy rule, not a style rule.
- **Design harnesses live on `design/*` branches, never on `develop`.** A
  harness is a `/design/<feature>` route rendering every state of a component
  from fixtures, and it needs an exemption in `__root.tsx` `beforeLoad` to open
  without a session — which is why it must not sit in `develop`. Each harness is
  one commit on top of `develop` on its own long-lived branch (e.g.
  `design/post-quality`), rebased forward when `develop` moves. To use one,
  check its files into your working tree and **don't commit them**:
  `git checkout design/<name> -- src/routes/design src/routes/__root.tsx`.
  Expect `routeTree.gen.ts` to regenerate with the extra route — that edit is
  part of the same don't-commit set.
- Import with the `@/` alias (→ `src/`). **Extension-less specifiers are the
  convention** (`@/stores/toastStore`, `./base`) — barrels like `@/lib` can't
  take an extension at all. `allowImportingTsExtensions` means the explicit
  `.ts`/`.tsx` form found in some files also resolves; leave existing imports
  as they are and don't flag the difference in review. TS is strict — no
  unused locals/params.

## Known stubs / gaps

No invite-teammate UI yet (`users.register()` is the ready building block) ·
dark mode is scaffolded but empty · the
Content-Bank **Imagery** tab is not populated yet · eslint/prettier/stylelint
have no committed config in this repo.

## Global rule

Do not keep backwards compatibility unless explicitly required.
