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
- **The Campaigns list reads one batched query, never one per card.**
  `useCampaignSummaries` (`["campaigns","summaries"]`) returns a slim
  `PostSummary` per post for the whole workspace; `CampaignCard` runs the same
  `lib/campaignReadiness` rules over it. Never reintroduce a per-card fetch —
  that was the N+1 CON-152 removed. See
  `docs/technical-decisions.md#batched-summaries`.
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
- **Video uploads take a different path from images and PDFs** — presign →
  direct PUT to storage → finalize, so multi-hundred-megabyte files never
  buffer in the API. Routed by kind inside `usePostAttachments.upload`; the
  finalize response is the same shape an image upload returns. Video *rules*
  come off `GET /api/platforms` (`video_constraints`) rather than the
  `lib/platformMedia.ts` override table — but the size cap does not: 500 MB
  (`MAX_VIDEO_UPLOAD_BYTES`) is ours, and always wins over the seeded ceiling.
  A probed-but-zero `duration_ms` means video-service was down, not a
  zero-length file. See `docs/technical-decisions.md#video-ingest`.
- **A campaign update is a whole-resource PUT, and the server defaults every
  field the payload omits.** Leaving `publishing_days` out does not preserve the
  campaign's publishing days — it resets them to all seven, same for the rest of
  the CON-181/182 columns. Always build the payload through `campaignToPayload`
  (`campaignBriefForm/shared.ts`), which round-trips the server's own values and
  takes only the fields you mean to change as overrides.
- **The campaign's `estimated_post_count` is a rate, not a total.** Since
  CON-182 it means "this many posts per `goal_cadence` period" (`week`/`month`),
  and the server backfilled every campaign to `month` — so an old total of 12 on
  a three-month campaign now plans 36 posts. Read it through `lib/postGoal`
  (`postGoalTotal`), never as a campaign total.
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
- **Anything the API doesn't support yet ships behind a feature flag** — see
  the global rule at the bottom of this file. Flags are declared in
  `config/featureFlags.ts` (a constant today, flipped by editing that file) and
  read with `useFeatureFlag(id)` (`isFeatureEnabled(id)` outside React), never
  from the `FEATURE_FLAGS` record directly: the hook is the seam where
  server-driven values will land, and going through it keeps every call site
  untouched when they do. A flag is not a permission.
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

**The Profile marketing-email switch has no endpoint behind it yet.** CON-155
shipped the server's token-gated unsubscribe pages, not a session-authenticated
one, so `GET`/`PUT /api/users/:id/email-preferences` still has to be written.
The contract is in `services/api/emailPreferences.ts` and asserted by its test;
until the handler lands the section renders its error line instead of a switch.
See `docs/technical-decisions.md#email-preferences`.

## Global rules

Do not keep backwards compatibility unless explicitly required.

**Front-end runs ahead of the back end, behind feature flags.** Build the UI
when the design is ready, not when the API is. If the server can't back it yet
— no endpoint, no column, a field that means something else — the feature ships
to `develop` with its flag **off**, so `develop` is always shippable and the
work is reviewable instead of parked on a branch.

The rules that make that safe:

1. **Declare the flag in `config/featureFlags.ts`** and gate the whole feature
   on it — every entry point, not just the main screen. With the flag off the
   app must behave exactly as it did before the feature existed.
2. **Nothing outside the flag may depend on the feature's data.** A half-backed
   field is worse than a missing one: don't let other screens, readiness rules
   or the assistant read a value the feature is still redefining. (Why
   `campaignReadiness` stopped reading `estimated_post_count` while CON-182 was
   redefining it from a campaign total into a per-period rate.)
3. **Say what is missing** in the flag's doc comment: which endpoint, column or
   decision the feature is waiting on. That comment is the hand-off to the
   back end.
4. **When the API lands, re-test the feature against the real thing** — a UI
   built against an assumed contract usually needs a pass — and only then
   decide the flag's fate. Turning it on and deleting the flag (with its
   off-branch) is a deliberate step, never a side effect of the endpoint
   appearing.

A flag is for "not built yet", never for who is allowed to see what — that is
the server's business.
