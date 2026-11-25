# Tiers, billing & entitlements

Conventions for useEntitlement, plans, checkout, the billing gate and entitlement refusals. Moved out of the root `CLAUDE.md` so it
loads only when needed — read this before changing the code it covers, and
keep it accurate when these rules change.

- **What the workspace's tier allows is `useEntitlement(key)`, never a flag**
  (CON-232). A flag says whether a feature is *built*; a tier says whether this
  workspace *bought* it — per workspace, and therefore the server's answer. Four
  rules make the seam safe. **Unknown key allows**: a feature the tier settings
  don't mention is one nobody decided to charge for, so it works the day it
  ships instead of going dark until every tier is taught about it. **Unresolved
  decides nothing** — `pending` is a state in the union, because rendering a
  lock while the plan is in flight tells a paying customer they didn't pay.
  **The client never maps a tier name to a number**: tiers are versioned and
  configurable and a workspace keeps the version it bought, so two "Pro"s can
  hold different allowances and only the server's resolved snapshot is true.
  **Dates are display data** — never an input to a decision, or a wrong system
  clock becomes a billing one. It is a hook rather than a `<Gate>` wrapper
  because *hidden* is a legitimate answer and a wrapper can't remove the `<li>`
  around it: the call site chooses hide / lock / lock-with-upgrade, and only the
  renderings are shared (`components/entitlements`).

- **A downgrade suspends; the server picks what.** Nothing is deleted, and the
  new tier only lands at the next billing boundary. A workspace that drops to
  one campaign and has two keeps both, with one flagged read-only *by the
  server* — never worked out on the client by counting against a limit, which
  would pick a different victim than the server did and a different one per tab.
  So gating applies to **creating and choosing**, never to displaying what
  exists: suspended things stay in their lists and still open, and every picker
  has to tolerate a current value that is no longer among its options.

- **A tester's workspace is complimentary, and that is its own flag**
  (CON-333/402). `billing.complimentary` on the plan read — not
  `billing_required: false` with no subscription, which a grandfathered
  workspace also reads and which must still check out. While it holds,
  `/plans` is the Ledger with no money on it (`lib/complimentaryPlans`: one
  label, a free in-place SWITCH TO, no interval, no popular column), the
  Plan & billing card says "Beta access", and the paywall shows no price.
  `Tier.available` is not consulted there — it is "Polar can sell
  this", false for everything while billing is off, and the comp branch runs
  before billing. Signing up with an invite is `/signup?invite=<token>`; the
  invite-only switch (`/api/signup-config`) governs strangers only, and its
  read fails **open** because the server refuses with `invite_required`
  regardless. The invite crosses Google's round trip in `sessionStorage`
  (`lib/testerInvite`) because the pending preview has no `return_to`. A gate
  that closes while a tab is open — comp ended by an operator — redirects on
  the stream's refetch through `useBillingGateWatch`, not on the next click.
  See `docs/onboarding.md` §6.

**Workspace tiers and billing are live, unflagged** (CON-232, CON-328; the
`workspace-tiers` flag was deleted 2026-10-26). The seam — `types/entitlements.ts`,
`lib/entitlements.ts`, `useEntitlement`, the shared renderings in
`components/entitlements` — is wired at every control, and three surfaces talk
*about* the plan: the **Plan & billing card** in Workspace Settings
(`components/workspace-settings/PlanSection`), **`/plans`**, and the **billing
gate** in `__root.tsx`. There is no stub left: `tiers.stub.ts`, its `STUBBED`
branches and the seeded usage counters were deleted in CON-328.

**The two reads are CON-243's, grown additively by CON-324/325.**
`GET /api/me/entitlements` answers with a resolved tier **version** — `tier_id`
+ `version_id`, an immutable allowance set, price rows in `net_minor`, every
entitlement enriched with the server's feature catalog — plus the workspace's
billing facts: `billing_required` (the gate), `trial_eligible`, and the live
subscription's `billing_period`, `renews_at`, `trial_ends_at` and
`scheduled_change`. **`GET /api/public/pricing` answers with the identical
record** per purchasable version, plus `available`, `free_trial` and
`trial_days` per tier and `available` per price row. That identity is
load-bearing: one wire type (`TierVersionBody`) and one parser, and `tiers.ts`
calls `entitlements.ts`'s — two parsers are how a price list and the lock on a
button end up disagreeing about what a limit is. `TierVersion` is the half they
share; `TierSnapshot` adds the subscription fields a *held* version has, `Tier`
adds the allowances and the buying flags, and `WorkspacePlan.billing` carries
the gate.

Five things about the reads that are each a thing not to undo:

- **The keys are the server's, verbatim.** `team_seats`, `active_campaigns`,
  `plan_runs_per_month` — under default-allow an unknown key does not fail, it
  silently unlocks the feature it was meant to gate.
  `services/api/entitlements.seed.json` holds a verbatim copy of the catalog
  and its test asserts every `EntitlementKey` against it, so a rename fails
  loudly. Re-sync it by re-reading `GET /api/public/pricing`, never by editing
  it to make the test pass.
- **The tally is `current`, and omitted means uncounted.** `Usage.used` is
  `number | null`, and `null` — no counter registered for that key — is a third
  thing beside unlimited (`limit: null`) and ungated (key absent). Never default
  it to `0`: that unlocks a control that may well be exhausted. An uncounted
  limit cannot produce `denied: 'limit'`.
- **No name and no start date.** The tier's display name is derived from the
  slug, `effectiveFrom` stays `null`, and the catalog has no per-tier tagline —
  so `/plans` writes no per-tier copy at all. Screens omit what is missing
  rather than softening it.
- **The price list publishes only what is purchasable, and it is public.** The
  version a grandfathered workspace holds, and the internal `default` tier, are
  not in it — so `/plans` renders the tier in force from `WorkspacePlan` and
  never by looking its id up in the list. It is unauthenticated and edge-cached,
  so `/api/public/*` is in `isAccountScoped` (`base.ts`) and goes out with **no
  `X-Workspace-Id`**. Which price row a column shows is `billingOptions`
  (`lib/upgradeOffer`), never a `[0]`, and `net_minor` is divided by the
  currency's own exponent — JPY has no minor unit.
- **The free month is the server's three times over.** The price list marks
  which tier has it; `trial_eligible` says whether this reader's account may
  still have it (shown when *not false*); and checkout's `trial` says whether it
  was actually applied — which is what the screen tells the buyer, because the
  mark can move between page load and click.

**Changing plan is `POST /api/workspace/plan`, and the server picks the
outcome** (CON-325). No live subscription: 202 with a Polar checkout,
opened in a tab created synchronously on the click (a `window.open` after the
`await` is blocked). A live one: 200 with the plan body — an upgrade now, a
downgrade at the end of the paid period, and choosing the tier already held
calls a pending downgrade off (the card's KEEP and `/plans`' CANCEL CHANGE both
do exactly that). In-place changes are confirmed first (`ChangePlanDialog`),
and during the free month the dialog says the change ends it and charges today;
409 `trial_upgrade_unavailable` keeps the dialog open and explains. Refusals are
codes, carried by `PlanChangeError` and worded by `lib/planChange` — never a
toast of the raw code.

**The billing gate is data first and a 402 second** (CON-322 §6.4). The root
guard reads `billing_required` off the plan read and redirects to `/plans` once,
before any screen fires the burst of requests the server would refuse; a member
gets "waiting on the owner" there. A 402 `billing_required` that still arrives —
a tab open across the moment the gate closed — sends the tab to `/plans` once
and is never toasted (`lib/billingGate`). The exempt paths there match the
server's allowlist in spirit: `/plans`, auth, invitations, the workspace
switcher. Grandfathered workspaces read `false` and never see any of it.

**Checkout's redirect proves nothing.** It returns to
`/plans?billing=return&workspace=<tenant>`; the root guard pins the tab to that
workspace first (the pin is per tab), and the page waits — "finishing up" —
until the plan shows a live subscription (`billing_period` set), moved by
`entity:billing:<tenant>` on `/api/events` and backed by a five-second poll.
`/plans` sits outside `_authenticated`, where the stream is not open, so it opens
it itself (`useEventStream`).

**The marketing entry is `/signup?plan=<tier_id>`.** It remembers the tier in
`sessionStorage` (`lib/planIntent`) and moves on to signup; password signup
lands on `/plans?plan=…`, and Google carries the same path as `return_to`.
`/plans` preselects the tier — its button focused — only if the price list
offers it.

**`/plans` deliberately sits outside `_authenticated`**, like `/workspaces`. It
reads as a full-screen modal with one X that goes *back* — except while the
workspace is gated, when there is nothing to go back to and the ways out are
SWITCH WORKSPACE and SIGN OUT. The plans are one **Ledger** (`PlanLedger`): a
column per tier on one top line, the most popular inverted, and under every
column the *same* allowance rows with the figure on the right in Plex Mono — the
columns are the comparison, so there is no second table.

**Ogen sells through Polar as merchant of record, so the app holds no
billing fields.** Polar is the legal seller: it takes the card, holds
the billing address and tax id, works out and remits VAT/GST, and issues the
invoice. Every editable billing field therefore already has a hosted, PCI-scoped
form we neither write nor answer for — so our side is a *report and a door*. No
address, no tax id, no card, no cancel endpoint; a second copy here is one that
can disagree with the invoice. **And no billing screen**: what is left to state
is a plan, a card's last four and one sentence naming where the rest lives,
which is a card in Workspace Settings. Prices are net and every one on screen
says "excl. VAT"; a `test_mode` workspace shows a Sandbox badge. The door is
`POST /api/billing/portal`, which mints a **signed link that expires within
the hour** — never cache, store or put it in a `href` at render time, and open the
tab synchronously on the click (`useOpenBillingPortal`).

**The call sites are wired** (CON-232). Twelve of the fourteen keys are consulted at the control they govern;
which of hide / lock / lock-with-upgrade each one gets is decided and recorded on
`EntitlementKey` in `types/entitlements.ts`, along with the reason the other two
are not wired — `custom_campaign_types` has no authoring screen to hide, and
`workspaces` is an *account* allowance that only a *workspace*-scoped read can
answer, so it is left to the server. Everything goes through `useEntitlement`;
nothing reads the plan directly.

**Selling is one behaviour, not eleven.** The sell disposition is always the
same moment — a control the user just clicked — so it is one hook and one
rendering: `useUpgradeGate(key)` wraps the action (`gate.intent(run)`) and
`<UpgradeDialog gate={gate} />` answers a refusal with the callout and a way to
`/plans`. The wrapped handler *returns whether it ran*, which is what lets the
assistant's composer keep a draft it was about to clear. Hiding and locking
deliberately get no such wrapper: hiding means reaching the `<li>`, the
separator and the empty state, and locking means the control staying put — both
are the call site's, which is the whole reason the seam is a hook. Two gestures
are ungated on purpose and say so where they live: dropping files onto the
Content Bank, and click-to-create on a calendar day. Neither has a control to
hang an explanation on, and the server's own refusal already arrives as a
sentence (CON-295).

**Being refused is the half that is live, and it is not behind the flag**
(CON-295). The server enforces whether or not this client asks first: it answers
**402 `entitlement_exceeded`** with `feature`, `limit` and `current`, and **403
`feature_not_available`** with `feature`. Both are read into an
`EntitlementError` (`services/api/errors.ts`) that every `apiJson`/`apiVoid`
caller already catches as an `ApiError`. Four things about that path:

- **The code is never shown.** `error` on those two bodies is an identifier, and
  the global mutation toast renders `error.message` as its title — so before
  this, a refused create toasted the word `entitlement_exceeded`. The message
  falls back to the caller's own sentence ("Unable to create the campaign") and
  the *reason* goes underneath it, translated, in `lib/queryClient.ts`.
  `services/api/*` holds no copy and has no `t`; that handler is the first place
  up the stack that renders, which is why it reads the language off the i18next
  instance rather than taking a `TFunction`.
- **A feature-gated 403 must not reach `handleForbidden`.** 403 is also what an
  owner-only route tells a member and what a tab pinned to a departed workspace
  gets, so `staleWorkspace` verifies the pin with a request. A tier that switches
  a feature off would otherwise fire one on every click of the control it hides.
  The status alone decides nothing: the code has to agree, both ways.
- **No cache invalidation rides along the *refusal*, but the *spend* invalidates.**
  Refetching the plan after a 402 is the obvious repair and changes nothing the
  refusal did not already say. What does invalidate is the
  write that moved one of the server's four counters, through
  `invalidateEntitlements` (`hooks/useEntitlements.ts`): campaign
  create/archive/unarchive/delete, bank note/upload/import/delete, member
  removal, post-attachment upload/remove. The **deletes** are the half that is
  easy to leave out and the one that matters more — a stale tally after a create
  offers a control that is about to be refused *with an explanation*, while a
  stale tally after a delete keeps a workspace locked out of room it has just
  made, with no refusal to explain it. The plan read carries the tally
  (`current`) since CON-325, so this is what keeps the meters moving with the
  work rather than with a page reload.
- **The near-limit warnings are notifications, one sentence per feature.**
  `entitlement.limit_approaching` / `limit_reached` carry the key, the counts and
  the band crossed; `lib/notifications.ts` maps each capped feature to its own
  pair of sentences (`ENTITLEMENT_COPY_KEY`) and states the figures, with
  `media_storage_bytes` rendered through `formatStorage` rather than printed as
  nine digits of bytes. A feature missing from that table — or a row missing its
  figures — falls back to the server's English title like any other unknown row.
  The counts are shown and deliberately never fed back into the plan: the inbox
  replays from `Last-Event-ID` and the REST page carries rows until they
  expire, so a week-old crossing is indistinguishable from a live one, and
  writing one in would deny a workspace on a stale figure — the one direction
  this seam never resolves towards. The live tally is the plan read's
  `current`, refetched through `invalidateEntitlements`.

**A gate points at the key the server charges, not at the one the control looks
like it costs.** `lib/entitlements.ts` carries the table of what CON-295
actually counts — four numeric caps and the campaign-type gates, each with the
route it is checked on — because a gate aimed anywhere else is not a stricter
gate but a different one, refusing on a number this client made up. The Content
Bank is the worked example: its note, its upload and its web-page import all
sell `content_bank_assets`, because that is the single key `assets.go` charges
all three to. Selling the upload as `media_storage_bytes` was wrong twice over —
that counter is the sum of *post attachments* and nothing else, so a workspace
at its storage cap was refused an upload the byte counter never sees. Two
entries in that table are edges rather than details: the seat cap is on the
direct-create route and not on the invitation flow this product actually uses,
and enforcement is **warn-first** server-side, so a deployment may be refusing
nothing at all.

The toast carries the numbers under a title that already names the action; the
feed row stands alone, so its sentence names the feature *and* the numbers.
