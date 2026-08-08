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
- **Every user-facing string is a catalogue entry — never a literal in a
  component.** New UI adds its keys to `src/i18n/resources/en.ts` *and* its
  translation to every other catalogue, and reads them through `t()`. This
  covers all of it, not just the obvious labels: button and menu text, headings,
  placeholders, empty and error states, toast and validation messages, tooltips,
  and the accessible strings nobody sees — `aria-label`, `title`, `alt`, visually
  hidden text. Editing a screen that still holds hard-coded English? Move the
  strings you touch into the catalogue rather than adding a literal beside them.
  Genuinely exempt: developer-facing text (`console.*`, thrown `Error` messages,
  test fixtures), and `i18n/bootMessages.ts` — see the next bullet.
- **How the catalogues work.** English is bundled and is the fallback; `en.ts`
  is the shape everything else is typed against, so a key missing from `es.ts`
  is a compile error (a key missing from `en.ts` is a compile error at the call
  site). Keys name the place, never quote their own English; keep one key per
  sentence and reach for `<Trans>` when a link or `<strong>` sits inside one —
  never assemble a sentence from fragments in JSX. Plurals use i18next's
  `_one`/`_other` with each form written out whole. Destructive-action labels
  keep their literal capitals in **every** language. Anything that bakes copy in
  at construction takes `t` and is built per render instead: Zod schemas are
  `(t) => schema` factories (`hooks/useAuthSchemas.ts`), and the same goes for
  label maps and `const` option arrays — a module-level constant freezes
  whichever language loaded first. Only the auth screens, sidebar, Profile and
  Workspace Settings are converted so far (CON-174); the rest is still
  hard-coded English and renders fine — that is legacy to be converted, not a
  precedent to copy. See `docs/technical-decisions.md#i18n`.
- **A language is released by one boolean.** `LOCALES` in `i18n/config.ts`
  carries `enabled` per locale; only enabled ones are offered in the picker,
  accepted from `?lang=` or restored from a previous visit — and a stored
  preference for a gated locale is cleared rather than left to reactivate on
  the deploy that releases it. The gate sits on those entry points, not on
  `setLocale`, so the switching machinery stays exercised by its tests while
  nothing but English is released. Spanish is complete and gated today.
- **The language switch is covered by a 2-second full-screen loader**, and
  `?lang=es` forces one for a page load then persists it. The waiting screen's
  own copy is the one string that must *not* come from the catalogue — it lives
  in `i18n/bootMessages.ts`, in the main chunk, because it renders while the
  catalogue is being fetched. Keep that file to those two lines.
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
have no committed config in this repo · **i18n covers the auth screens, sidebar,
Profile and Workspace Settings only** — everything else is still hard-coded
English (CON-174) · **English is the only released language**: Spanish is
translated and tested but gated by `enabled: false` in `i18n/config.ts`, so the
picker shows one option.

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
