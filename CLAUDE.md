# CLAUDE.md

Guidance for working in this repository. This file is loaded into every
session, so it holds only what every session needs: the commands, the rules
that apply everywhere, and one line per convention. Each convention's detail —
the reasons, the endpoints, the edge cases — lives in `docs/conventions/`, one
file per area. **Read the area's file before changing code it covers**; the
folders listed under each heading carry a `CLAUDE.md` that loads it on its own.

Keep it this way: a new rule gets one line here and its paragraph in the area's
file, never a paragraph here.

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
removed — see [`docs/onboarding.md`](./docs/onboarding.md)). The Post Assistant
UI that used to be named here as the current priority **shipped** — CON-61
closed 2026-08-05, and CON-42 is the backend Genkit flow behind it. **Current
front-end priority:** the **universal assistant** (CON-444; UI in CON-451,
PRs #227–#234, stacked), which waits on the backend stack (ogen #251–#282)
reaching `main` for its live pass; then the **campaign-scoped Content Bank**
(CON-210) and the two analytics surfaces waiting on their live-API pass
(CON-175/250). See
[`docs/product.md`](./docs/product.md#direction--current-priorities).

- **Product & domain:** [`docs/product.md`](./docs/product.md)
- **Front-end architecture:** [`docs/architecture.md`](./docs/architecture.md)
- **Technical decisions & rationale:** [`docs/technical-decisions.md`](./docs/technical-decisions.md)
- **Onboarding, auth & tenancy flow:** [`docs/onboarding.md`](./docs/onboarding.md)
- **Adding a platform — the support checklist:** [`docs/platform-support.md`](./docs/platform-support.md)
- **Campaign "needs attention" rule set:** [`docs/attention-rules.md`](./docs/attention-rules.md)
- **Campaign stages — how they work & proposal:** [`docs/campaign-stages.md`](./docs/campaign-stages.md)
- **Activity feed & daily report — proposal:** [`docs/activity.md`](./docs/activity.md)
- **Every event and notification — trigger, transport, recipients:**
  [`docs/events.md`](./docs/events.md)
- **Tasks — proposal:** [`docs/tasks.md`](./docs/tasks.md)
- **What the front end is waiting on from the API:**
  [`docs/open-questions.md`](./docs/open-questions.md)
- **Run & deploy:** [`README.md`](./README.md)

Requirements live in Linear under the **`CON-`** project (the app's internal
name is "Content Control Center"). There is no PRD checked into this repo.

## Commands

```bash
pnpm install
pnpm dev           # Vite dev server on http://localhost:9002, proxies /api → :9001
pnpm build         # tsc (type-check) && vite build → dist/
pnpm preview       # serve the production build

pnpm typecheck     # tsc --noEmit
pnpm lint          # eslint .            (--fix to repair what is mechanical)
pnpm format        # prettier --write .  (format:check to only report)
pnpm test          # vitest run
pnpm knip          # unused files, exports and dependencies — a report, not a gate

pnpm test:remote   # typecheck, lint, format:check and test on another Mac over SSH
scripts/test-remote.sh test src/lib   # …or one package script, with its arguments
```

**Run the checks remotely, not here.** vitest, tsc and eslint load this
machine badly, so `scripts/test-remote.sh` rsyncs the working tree
(uncommitted changes included, `.gitignore` respected) to `REMOTE_HOST`
(default `mac2`) and runs them there; the remote keeps its own
`node_modules`. A user-level Claude Code hook (`~/.claude/hooks/redirect-tests.sh`)
refuses vitest, tsc, eslint and the pnpm scripts that run them in any repo
that has that script, and names the remote command instead. Prettier stays
local. Same arrangement as `make test-remote` in `ogen`.

CI runs every one of those except `knip` on each PR into `develop`
(`.github/workflows/ci.yml`). What each tool is for, and why some rules are
warnings rather than errors:
[`docs/quality-tooling.md`](./docs/quality-tooling.md).

Run the API separately from the `ogen` repo (`make run`) or via
`docker compose up`. See [`docs/architecture.md`](./docs/architecture.md#build--tooling).

## Conventions & gotchas

Most of these are load-bearing — see `docs/technical-decisions.md` for the why.

### Everywhere

- **`src/routeTree.gen.ts` is generated.** Never edit it. It regenerates from
  `src/routes/` via the Vite router plugin.
- **Route file split:** `index.tsx` owns routing (`createFileRoute`,
  `beforeLoad`, `validateSearch`); the co-located **`page.tsx` is
  intentionally invisible to the router** and holds the presentational
  component.
- **Trailing-underscore route segments** (`$campaignId_`, `foundation_`)
  deliberately escape the parent layout to render fullscreen.
- **Auth is guarded once, in `routes/__root.tsx`** `beforeLoad` — not on
  `_authenticated`. Distinguish `ServerUnavailableError` (→ `/server-unavailable`)
  from a 401 (→ `/auth/login`).
- **Server state → TanStack Query; UI/session state → Zustand.** Don't hold
  fetched data in a store. Query keys are co-located per hook and exported when
  another hook must invalidate them. Note the post editor (`["post", id]`) and
  post list (`["campaigns", id, "posts"]`) are separate namespaces.
- **`src/lib/*` mirrors Go server rules** (`postStatusMachine`, `assetStatus`,
  platform gating). The server is the source of truth; keep these in sync when
  the backend changes.
- **Every user-facing string is a catalogue entry — never a literal in a
  component.** New UI adds its keys to its section's file in `src/i18n/resources/en/`
  *and* its translation to the same file in every other locale's folder, and reads them through `t()`. This
  covers all of it, not just the obvious labels: button and menu text, headings,
  placeholders, empty and error states, toast and validation messages, tooltips,
  and the accessible strings nobody sees — `aria-label`, `title`, `alt`, visually
  hidden text. Editing a screen that still holds hard-coded English? Move the
  strings you touch into the catalogue rather than adding a literal beside them.
  Genuinely exempt: developer-facing text (`console.*`, thrown `Error` messages,
  test fixtures), `src/devtools/` (staging-only screens that a production build
  compiles out — see `docs/technical-decisions.md#staging-flag-overrides`), and
  `i18n/bootMessages.ts` — see the next bullet.
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
- **Button labels on cards and the commit panel are sentence case** —
  `Delete campaign`, `Fix with Ogen`, `Save`, destructive or not (decided
  2026-11-19, replacing the old literal-capitals rule). Write the casing into
  the copy, never with an `uppercase` class. Labels elsewhere that are still in
  capitals move to sentence case as their screens join `ui/card`.
- **A card's content is black** — body text, a row's second line and the
  facts at a card's foot are `text-foreground`, never
  `text-secondary-foreground`: grey body copy reads as disabled (2026-11-23).
  A card ranks its lines by size, weight and place. Grey is left to labels
  and captions — a field's label, a chart's axis and legend, a chip, a
  timestamp — and tertiary to what is absent.
- **A destructive button is red in its body or in its icon** — never grey, and
  never a pale red tint. The way in (Danger Zone, Remove) is `destructive`:
  white with a border and the icon in the danger colour, so it always has an
  icon. The step that does it (a dialog's confirm) is `destructiveInverted`.
  A Danger Zone card holds its buttons in its body, never in the header.
- **A dropdown on a card or a bar is a button** — `TextSelect` `variant="button"`:
  the outline button with a chevron at its end, never a field. A card's
  `choice` and the analytics `Picker` both draw it.
- **What makes a new card looks like a blank one** — `NewCard`: the card's
  outline dashed, on no surface, one leading plus as tall as its two lines,
  what it makes in the card header's type and a line under it saying what it will be, at the end of the
  cards it joins. A tile that adds a file (the post's Add media) is the same.
- **Every card is `ui/card`** — no local `Card`, no hand-rolled
  `bg-primary px-6 py-6` section, outside the frame too (2026-11-23). A page
  with no header of its own (the Figma consent) titles its card `heading="h1"`.
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

### Navigation & page layout — [`docs/conventions/navigation-and-layout.md`](./docs/conventions/navigation-and-layout.md)

Loaded automatically in `src/components/layout`, `src/components/page-primitives`.

- The nav is one menu, and the campaign is a filter over it.
- Posts is a list and the Calendar is a calendar — they are two destinations, not three views of one.
- Documents are Assets, and Assets is a module rather than a section of Foundation.
- The right rail is the assistant's, with help over it.
- Explanatory copy goes in `<Explainer>`.
- A page header names the place, and the switcher names the scope.
- There are no centred columns.
- A page that is more than one column of cards uses one of two layouts.
- Screen corners have fixed jobs — top is about the object, bottom is about the work.
- A control in the corner says which cards it doesn't reach.
- The app's keys are one listener and one table.

### Server-driven lists & filters — [`docs/conventions/lists.md`](./docs/conventions/lists.md)

Loaded automatically in `src/components/smartFilter`, `src/components/content`, `src/components/ideas`.

- The Campaigns list reads one batched query, never one per card.
- The asset list is the server's answer to the URL, a page at a time.
- The Ideas list is the server's answer to the URL too.
- The posts lists read one filter, a campaign's and the workspace's; the calendars have none for now.
- The Ideas and Assets lists are cards on `listCards`' rules: tabs in the page header, and one pinned line for the filter, the arrangement and the selection.

### Posts — [`docs/conventions/posts.md`](./docs/conventions/posts.md)

Loaded automatically in `src/components/posts`.

- The post editor autosaves through the Query cache.
- Unscheduling a post is a `cancel`, not a status `PUT`.
- Scheduling a post is a `schedule`, not a status `PUT`.
- A platform is identified by `zernio_id`, never by its sqid.
- A post's permalink survives publication and is not frozen with the rest.
- A post's sources are attached and detached (`lib/postSources`), never restated by the autosave.
- A post's first comment is presence-aware but restated.
- A post's type is a default, not a question.
- A planned post is a post with theses and no body.
- A thread is one body with breaks in it.
- The split is the server's: never send `thread_segments` and never re-implement the split.

### Assets & uploads — [`docs/conventions/assets.md`](./docs/conventions/assets.md)

Loaded automatically in `src/components/content`, `src/components/uploads`.

- Video uploads take a different path from images and PDFs.
- An asset only opens in the editor if `assetScreen` says so.
- The asset page is two columns, and those screens are its Source tab.
- An asset update is presence-aware, and a campaign's is not.
- A bank image reaches a post as a copy, never a reference.
- Tags are filed over a selection, not on a row.
- Deleting a document asks, from every way in.
- A duplicate upload is warned about before it happens, not after.
- An upload refusal is worded by its `code`, not its prose.

### Campaigns & series — [`docs/conventions/campaigns.md`](./docs/conventions/campaigns.md)

Loaded automatically in `src/components/campaigns`, `src/components/strategy`, `src/components/series`, `src/components/formats`.

- A campaign update is a whole-resource PUT, and the server defaults every field the payload omits.
- A campaign's documents are attached and detached, never restated.
- A campaign is archived or deleted — it has no status.
- The campaign's `estimated_post_count` is a rate, not a total.
- A campaign's phase windows are the server's, and the type locks once they are used.
- Series and content formats are two flags, and the split is the design.
- Series are backed by the API; a campaign's runs are attached, detached and re-rhythmed one at a time, never restated.
- The campaign Overview is its time cards, with one list beside them.

### Internationalisation — [`docs/conventions/i18n.md`](./docs/conventions/i18n.md)

Loaded automatically in `src/i18n`.

- How the catalogues work: one file per section in each locale's folder, English is the shape, keys name the place, plurals are written out whole, and anything that bakes in copy takes `t`.
- A conversion is only proved by rendering in another language.
- A language is released by one boolean.
- Dates, times, numbers and joined lists go through `lib/intl.ts`.
- The language switch is covered by a 2-second full-screen loader.

### The universal assistant — [`docs/conventions/assistant.md`](./docs/conventions/assistant.md)

Loaded automatically in `src/components/assistant`.

- There is one assistant, with one thread per scope.
- A turn carries what the user sees, as references only.
- What a turn changed is refreshed from its `touched[]`.
- The assistant's replies follow one grammar.
- Offers run exactly as proposed.
- The assistant can change the screen.
- The assets pack's results are cards.
- The brand tools' results are cards too.
- The repair pack's results are cards, and its findings are ignored by key.
- The analytics pack's results are cards, and every card cites its filters.
- The workspace pack's results are cards.
- The ideas pack's results are cards.

### Feature flags & stubs — [`docs/conventions/flags.md`](./docs/conventions/flags.md)

Loaded automatically in `src/config`, `src/devtools`.

- Anything the API doesn't support yet ships behind a feature flag.
- A flag's life ends at the second merge, not the first.
- On staging and in dev, a flag can be forced for one browser.
- A feature waiting on the back end is stubbed with a JSON seed, never with MSW.

### Analytics — [`docs/conventions/analytics.md`](./docs/conventions/analytics.md)

Loaded automatically in `src/components/analytics`.

- The analytics dashboard can be served simulated numbers, for the same browser and behind the same gate.
- Charts are hand-rolled SVG, except the two full-card plots.
- A measure is drawn in one shape, decided in one place.

### Tiers, billing & entitlements — [`docs/conventions/billing.md`](./docs/conventions/billing.md)

Loaded automatically in `src/components/entitlements`, `src/components/tiers`.

- What the workspace's tier allows is `useEntitlement(key)`, never a flag.
- A downgrade suspends; the server picks what.
- A tester's workspace is complimentary, and that is its own flag.
- Workspace tiers and billing are live, unflagged.
- The plan read and the price list share one wire type and one parser; their keys are the server's, verbatim.
- Changing plan is `POST /api/workspace/plan`, and the server picks the outcome.
- The billing gate is data first and a 402 second.
- Checkout's redirect proves nothing.
- The marketing entry is `/signup?plan=<tier_id>`.
- `/plans` deliberately sits outside `_authenticated`.
- Ogen sells through Lemon Squeezy as merchant of record, so the app holds no billing fields.
- Selling is one behaviour, not eleven.
- Being refused is the half that is live, and it is not behind the flag.
- A gate points at the key the server charges, not at the one the control looks like it costs.

### Workspaces, settings, streams & Brand binding — [`docs/conventions/workspaces-and-api.md`](./docs/conventions/workspaces-and-api.md)

Loaded automatically in `src/components/workspace-settings`, `src/components/brand`.

- `/api/settings` is tenant-scoped, not user-scoped.
- Two long-lived streams, and they are not interchangeable.
- A close the server announced is a handover, not a drop.
- A Brand binding is four nullable ids, and the client only ever sets them.
- A workspace is the tenant and a member is a user.
- Which workspace a request acts in is named per request, not per session.
- Switching workspace is client-side.

### Ideas triage — [`docs/conventions/ideas.md`](./docs/conventions/ideas.md)

Loaded automatically in `src/components/ideas`.

- An idea is a question, `later` carries a date, and triage is the list.

## Known stubs / gaps

What is live, flagged off, or waiting on the API or on content — in
[`docs/conventions/known-gaps.md`](./docs/conventions/known-gaps.md). The
thread rules are in `posts.md`, billing and refusals in `billing.md`, series
and formats in `campaigns.md`.

- The universal assistant waits on the API's merge, and on five API follow-ups.
- The workspace calendar is unflagged.
- Brand from what you have is live, unflagged.
- Calendar preferences are one set per user, shared by every calendar.
- Two operator-tunable server limits are mirrored on the client with nothing to sync them.
- The help centre is on, read from Sanity.
- The Profile marketing-email switch is built but flagged off.

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
