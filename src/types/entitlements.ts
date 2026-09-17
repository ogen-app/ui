/**
 * Workspace tiers, and what the tier in force allows (CON-232).
 *
 * Three rules shape every type in this file.
 *
 * **The server resolves; the client renders.** Tiers are versioned and their
 * contents are configurable, so a tier's *name is not its identity*: two
 * workspaces both showing "Pro" can be on different versions with different
 * limits, because a workspace keeps the version it bought. Nothing here maps a
 * name to a number and nothing compares versions or dates to decide anything —
 * the client is told what is in force and shows it. Dates in these types are
 * display data, never an input to a decision; a laptop with a wrong clock must
 * not be able to grant or withdraw anything.
 *
 * **Absent means ungated, not denied.** A feature nobody has decided to charge
 * for is free, so a key the server doesn't mention is allowed. That way a new
 * feature works the day it ships rather than going dark until every tier's
 * settings have been taught about it, and the failure mode becomes "we forgot
 * to gate it" — which someone notices — instead of "it isn't there", which
 * nobody does. Enforcement is the server's either way: this vocabulary decides
 * what the UI offers, never what is permitted.
 *
 * **Entitlements and suspension are separate mechanisms.** An entitlement
 * answers *may I create or choose this*. `Suspension` is a property of a thing
 * that already exists, decided server-side after a downgrade. The client never
 * infers one from the other — see `Suspension` below.
 */

/**
 * The features the client knows how to ask about.
 *
 * **These are the server's key names, verbatim** (CON-243). They come off the
 * feature catalog the API ships — `src/domain/entitlements/catalog.json` in the
 * Go repo, reachable as the `entitlements` array on `GET /api/public/pricing` —
 * and this union is the subset of it the client has a gate for. It is a question
 * vocabulary, not a copy of any tier: the server may answer with keys not listed
 * here (ignored) and may omit keys that are (allowed, per the rule above).
 *
 * The names had to change once the catalog existed. This build previously asked
 * about `seats`, `campaigns` and `content_plan_runs`, which the server does not
 * have — and under the default-allow rule a key the server has never heard of
 * does not fail, it *unlocks*, silently and everywhere. `entitlements.seed.ts`
 * holds a copy of the catalog for exactly that reason, and its test is what
 * turns a renamed key back into a loud failure.
 *
 * Deliberately absent, and each for its own reason:
 *
 * - `semantic_grounding` is in the catalog, and its own description ends "the
 *   product's core promise, never gated". It carries `is_material: false`. A key
 *   for it would be a decision pretending not to have been made.
 * - `post_versions`, `brand_personas` and `brand_voices` were asked about by
 *   this build and are **not in the catalog at all**. Rather than keep three
 *   keys nothing can answer, they are gone: absence already means ungated, so
 *   dropping them is exactly the behaviour keeping them would have produced.
 *   Whether they are meant to be levers is one of the open questions on CON-243.
 */
export type EntitlementKey =
  /** Workspaces the account may hold (CON-147). */
  | 'workspaces'
  /** Members of the workspace (CON-26). */
  | 'team_seats'
  /** Connected social accounts, across all platforms (CON-217). */
  | 'connected_accounts'
  /** Campaigns that are not suspended (CON-35). */
  | 'active_campaigns'
  /** Campaign types beyond evergreen-only (CON-35). */
  | 'all_campaign_types'
  /** Authoring bespoke campaign types (CON-35). */
  | 'custom_campaign_types'
  /** Content-plan generation runs, reset monthly (CON-28). */
  | 'plan_runs_per_month'
  /**
   * The Post Assistant's allowance, as a multiplier (×1 / ×5 / ×20).
   *
   * The catalog's own description calls it a hidden token budget priced off
   * current model rates, "never a published number" — so this is the key whose
   * value the UI must never print. It is here to be *asked* about, not shown:
   * the server says what is true, and the screen decides that none of it is
   * worth saying beyond whether the assistant opens.
   */
  | 'assistant_multiplier'
  /** Quality reviews available per post (CON-85). */
  | 'quality_reviews_per_post'
  /** Posts — a lifetime total on Trial, not a per-period rate (CON-170). */
  | 'posts_total'
  /** Media-library bytes stored, workspace-wide (CON-46). */
  | 'media_storage_bytes'
  /** Documents held in the content bank (CON-46). */
  | 'content_bank_assets'
  /** URLs imported as campaign documents (CON-222). */
  | 'web_page_imports'
  /** Several accounts on one platform, targeted separately (CON-150). */
  | 'multiple_accounts_per_platform'

/**
 * How each key answers a denial — the product decision, recorded (2026-08-22).
 *
 * It is a comment rather than a table because the choice is not a value the
 * seam can apply: hiding a feature means removing the `<li>` around it, the
 * separator beside it and rewording the empty state below, and only the call
 * site can reach any of that. This is where the decision was made; the call
 * sites are where it is kept.
 *
 * - **Sell** (lock with an upgrade, at the moment of intent) — `active_campaigns`,
 *   `team_seats`, `connected_accounts`, `plan_runs_per_month`,
 *   `quality_reviews_per_post`, `media_storage_bytes`, `assistant_multiplier`,
 *   `posts_total`, `content_bank_assets`, `web_page_imports`, `workspaces`.
 *   These are the ones somebody is *already reaching for* when they are
 *   stopped: they clicked add, invite, connect, run, review, upload, import, or
 *   opened the assistant. The upgrade answers a question they had rather than
 *   interrupting with one.
 * - **Lock, no call to action** — `multiple_accounts_per_platform`. An
 *   affordance that would otherwise vanish without explanation: a workspace that
 *   has never had two accounts on one platform would never learn the capability
 *   exists.
 * - **Hide** — `all_campaign_types`, `custom_campaign_types`. Enumerations: a
 *   locked row in a list of options is noise while somebody is choosing, and the
 *   type picker has nothing to teach from.
 *
 * Note that none of the three is a property of the *key*: the same entitlement
 * can hide in a dropdown and sell on a button. Where a key appears in two
 * places, this is the disposition for its primary one.
 *
 * **Twelve of the fourteen are wired; two are not, and each for a stated
 * reason.**
 *
 * - `custom_campaign_types` has no surface. Authoring a bespoke campaign type
 *   is not something this build can do from any screen, so there is no control
 *   to hide. It stays in the union because the key is real and the gate is
 *   one line the day the authoring screen exists.
 * - `workspaces` is an **account** allowance answered by a **workspace** read.
 *   `GET /api/me/entitlements` is scoped by `X-Workspace-Id`, so the only
 *   figure the client can obtain is whatever the tab's current workspace
 *   happens to grant — and an account holding two workspaces on two tiers has
 *   no client-side answer to which of them governs creating a third. Guessing
 *   is precisely the tier arithmetic this whole seam refuses to do, so
 *   `/workspaces` offers the button and lets the server answer: a 402 there
 *   arrives as a sentence under the action's own name (CON-295), which is the
 *   same thing the dialog would have said and is additionally true. Revisit
 *   when an account-scoped read exists.
 */

/**
 * What an allowance is counted over, when the client knows how to say it.
 *
 * The server's own four words, off the catalog's `reset` field: a `standing`
 * ceiling that never refills, a `monthly` allowance, a lifetime `total`, and
 * `per_post`. It owns this vocabulary and may send a word this build has never
 * heard of, so `usageReset` narrows to `null` rather than trusting the string —
 * an unknown reset costs a phrase on a meter, never a wrong one.
 */
export type UsageReset = 'standing' | 'monthly' | 'total' | 'per_post'

/** How much of a metered allowance is gone. */
export type Usage = {
  /**
   * `null` is **unlimited**, said out loud.
   *
   * It cannot be inferred from absence, because absence already means
   * "ungated" — and the UI needs to tell those apart to be able to print the
   * word "unlimited" for the tier that pays for it.
   */
  limit: number | null
  /**
   * `null` is **not counted yet**, and it is a third thing again.
   *
   * The API ships allowances but no tally — there is no usage read anywhere on
   * it, and CON-243 has one as explicitly future — so a limit routinely arrives
   * with nothing to measure against. That is not zero: "0 of 5" is a claim that
   * nothing has been used, which would unlock a control that should be locked
   * and print a reassuring number nobody checked. A screen holding `null` says
   * the limit and stops.
   *
   * `entitlements.seed.ts` supplies held-still counters meanwhile, so the
   * surfaces that need numbers can be built and looked at.
   */
  used: number | null
  /** `null` for an allowance whose reset word this build cannot name. */
  reset: UsageReset | null
  /** When `used` returns to zero, if it ever does. Display only. */
  resetsAt: string | null
}

/**
 * The answer to one question about one feature.
 *
 * A discriminated union rather than a boolean and some fields, so that
 * `pending` is structural: TypeScript won't let a call site forget the case
 * where the answer hasn't arrived, which is the one where the right move is to
 * decide *nothing*. Rendering a lock during a fetch tells a paying customer
 * they didn't pay, and that is a worse mistake than briefly offering something
 * the server then refuses.
 *
 * `denied` splits by reason because the two are different sentences with
 * different answers — *your plan doesn't include this* is sold with an upgrade,
 * *you've used 5 of 5 this month* is often answered by waiting. Only the call
 * site knows which one it has the room to say.
 */
export type Entitlement =
  | { state: 'pending' }
  | {
      state: 'allowed'
      /** `null` when the feature is not metered at all. */
      usage: Usage | null
    }
  | { state: 'denied'; reason: 'tier' }
  | { state: 'denied'; reason: 'limit'; usage: Usage }

/** A tier change the workspace has bought but is not on yet. */
export type ScheduledTierChange = {
  id: string
  name: string
  /** The billing boundary it takes effect on. */
  effectiveFrom: string
  /**
   * Which way the change goes.
   *
   * The server sends it because only the server knows how its configurable
   * tiers rank; the client needs it because "Pro starts on 14 September" and
   * "you'll move to Trial on 14 September" are not the same warning, and the
   * second one has to be delivered before the date, not after.
   */
  direction: 'upgrade' | 'downgrade'
}

/** What a tier version costs, for display only. */
export type TierVersionPrice = {
  /** Minor units (`net_minor`), so nothing holds a decimal it might round. */
  amount: number
  /** ISO 4217. The formatter takes it; the client never maps it. */
  currency: string
  interval: 'month' | 'year'
  /** ISO 3166, or `null` for the default price of this currency and interval. */
  countryCode: string | null
}

/**
 * One immutable tier version — what CON-243 made the unit of pricing.
 *
 * The same artifact answers two questions, which is why this is its own type.
 * `GET /api/me/entitlements` sends the version a workspace is *on*; each row of
 * `GET /api/public/pricing` is a version it could *move to*. The rows are the
 * same shape on the wire and parse through the same function — what differs is
 * only what is wrapped around them: a plan adds the subscription half
 * (`TierSnapshot`), a catalogue entry adds the allowances (`Tier` in
 * `types/tiers.ts`).
 *
 * Two fields the wire carries and this does not. `version` is a number that
 * orders versions of one tier, and `status` orders their lifecycle — both are
 * ranking material, and the rule this whole seam rests on is that the client
 * ranks nothing. Neither has a rendering that wants them.
 */
export type TierVersion = {
  /**
   * The tier *version*'s stable id (`version_id`). Opaque: never parsed, never
   * compared, never used to look anything up on the client.
   */
  id: string
  /**
   * Which tier the version belongs to (`tier_id` — `trial`, `default`).
   *
   * Also opaque, and kept separate from `id` because they answer different
   * questions: two workspaces on `trial` v1 and `trial` v3 share this and
   * nothing else. Never ranked — only the server knows how its configurable
   * tiers order, which is why `direction` arrives on the wire.
   */
  tierId: string
  /**
   * What to call it on screen — and nothing more. Two workspaces on the same
   * name can hold different allowances, so this is a label, not a key.
   *
   * **Derived from `tierId` today, because the payload carries no name.** Serhii
   * flagged the omission himself and offered to add one; when it lands this
   * stops being computed and the fallback goes. Until then it is a title-cased
   * slug, which is at least incapable of disagreeing with the server.
   */
  name: string
  /**
   * Whether this version can still be bought.
   *
   * False for a superseded version somebody is grandfathered onto, and for the
   * internal `default` tier every workspace sits on today. It is why the plan
   * screen must render the current tier from here and never by looking its id up
   * in the purchasable list — `GET /api/public/pricing` deliberately omits both.
   */
  purchasable: boolean
  /**
   * The stated reason this version exists, in the server's words.
   *
   * Customer-facing by design: under the UCTD a unilateral change wants a stated
   * valid reason attached to it, so the server keeps one per version rather than
   * letting the client guess at one. Untranslated server copy, like `name`.
   */
  changeReason: string
  /**
   * What the version costs. Empty when nothing is priced — which is the answer
   * for the internal tier, where the server sends `prices: null`.
   *
   * A list rather than a price, because one version can be priced in several
   * currencies, at both intervals, and per country. Which of them a card shows
   * is a decision with its own rules — `lib/tierPrice.ts`, not a `[0]` at the
   * call site.
   */
  prices: TierVersionPrice[]
}

/**
 * The tier in force for this workspace: the version, plus everything true about
 * holding it.
 *
 * None of the four fields below comes off `GET /api/me/entitlements`, and that
 * is the point of keeping them on this type rather than on `TierVersion` —
 * they are facts about a *subscription*, which Ogen does not hold (CON-243 §5).
 * They are filled by the stub today and by the billing read when Lemon Squeezy
 * lands.
 */
export type TierSnapshot = TierVersion & {
  /**
   * When this version came into force for this workspace. Display only.
   *
   * `null` because the payload does not carry it. The binding that knows the
   * date is `tenant_tier_assignments.valid`, which is server-side and not
   * exposed on this read — so a screen that wants "on Pro since August" has
   * nothing to print, and says nothing rather than inventing a day.
   */
  effectiveFrom: string | null
  /**
   * How often the workspace is charged for it — `null` for a tier nobody pays
   * for, which is why it is not folded into the name.
   *
   * Here rather than on the billing payload because it is half of what the plan
   * is *called*: "Max, billed monthly" is the answer to "what am I on", and
   * every member is entitled to it. The card's last four digits are not, and
   * that is the line `/api/billing` sits on the other side of.
   */
  billingPeriod: 'month' | 'year' | null
  /**
   * End of the current billing cycle — when it renews, if it renews.
   *
   * `null` for a free tier and for a subscription that has been cancelled: a
   * cancelled one has an end date instead, and that lives on the billing
   * payload where the difference can be stated properly. Display only, like
   * every other date here.
   */
  renewsAt: string | null
  /**
   * Null when nothing is scheduled — which, from the real endpoint, is always.
   *
   * A workspace's version is changed by an operator through Harbor (CON-294),
   * and the assignment lands in one transaction rather than being announced in
   * advance, so there is no pending-change state on this read to report. What
   * would put one here is self-serve plan selection, which has no endpoint.
   */
  scheduled: ScheduledTierChange | null
}

/** Everything the client is told about what this workspace has bought. */
export type WorkspacePlan = {
  tier: TierSnapshot
  /**
   * Keyed by the server's names, not narrowed to `EntitlementKey`: a tier list
   * that is edited by hand will grow keys before this build hears of them, and
   * an unknown key is something to ignore rather than something to crash on.
   */
  entitlements: Record<string, RawEntitlement>
}

/**
 * What the catalog says *about* a feature, as opposed to what a tier grants of
 * it (CON-243).
 *
 * Editorial data, and the reason it is worth carrying: the comparison table on
 * the plan screen is drawn from it, so a feature added to a tier arrives with
 * its own name, section and one-line description rather than needing a matching
 * entry hand-written here. It is also the one place in the app holding copy
 * that is **not** translated — the catalog ships in one language, and that is a
 * real gap belonging to whoever edits it, not something the client can close by
 * putting server copy in a catalogue.
 */
export type CatalogEntry = {
  /** Its heading on the comparison table. */
  name: string
  /** One line on what it is. */
  description: string
  /** Which section of the table it sits in — `workspace_team`, `ai_superpowers`… */
  category: string
  /**
   * Whether lowering it is a material reduction — the EU DCD Art. 19 switch the
   * server uses to decide whether a change needs 30 days' notice.
   *
   * Display data only, and never an input to a decision here: what it governs is
   * a notice the *server* sends.
   */
  isMaterial: boolean
}

/** One entry of the tier's settings, already camel-cased. */
export type RawEntitlement = {
  /** Absent means true — a purely metered key states a limit, not a verdict. */
  allowed?: boolean
  limit?: number | null
  /** Absent means *unmetered*; `null` means metered but never counted. */
  used?: number | null
  reset?: UsageReset | null
  resetsAt?: string | null
  /** Absent for a key the server sent no catalog metadata for. */
  catalog?: CatalogEntry
}

/**
 * Why a thing that already exists has gone read-only.
 *
 * This is the downgrade half, and it is deliberately not derived from
 * entitlements. When a workspace drops to a tier that allows one campaign and
 * it has two, **the server chooses** which one is suspended and says so on the
 * resource. A client that instead counted campaigns against the limit would
 * pick its own victim — a different one from the server's, and potentially a
 * different one in each tab.
 *
 * Nothing is deleted and nothing is hidden. Gating applies to *creating and
 * choosing*; a suspended resource still lists, still opens, still reads. Which
 * also means every picker in the app has to tolerate a current value that is no
 * longer among its options.
 */
export type Suspension = {
  /** Set by the server when the resource is read-only under the current tier. */
  suspended: boolean
  /** When it happened, for the notice. Display only. */
  since: string | null
}
