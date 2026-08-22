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
 * Keys are code and limits are configuration: a feature exists in the app or it
 * doesn't, while *how much* of it a tier grants is Serhii's admin list to edit.
 * So this union is the client's question vocabulary, not a copy of any tier —
 * the server may answer with keys not listed here (ignored) and may omit keys
 * that are (allowed, per the rule above).
 *
 * Deliberately absent: everything the tier plan lists as free for every tier —
 * semantic grounding, previews, publish status, the activity feed, network post
 * analytics, job notifications, the help centre. A key for those would be a
 * decision pretending not to have been made.
 */
export type EntitlementKey =
  /** Members of the workspace. */
  | 'seats'
  /** Connected social accounts, across all platforms. */
  | 'social_accounts'
  /** Campaigns that are not suspended. */
  | 'campaigns'
  /** Campaign types beyond evergreen (CON-166). */
  | 'custom_campaign_types'
  /** Content-plan generation runs. */
  | 'content_plan_runs'
  /**
   * The Post Assistant. The allowance behind it is a token budget priced off
   * current model rates, and that number is never shown to a user — so this is
   * the key where a `limit` denial arrives with usage attached and the call
   * site deliberately prints none of it. Which is the model working: the server
   * says what is true, the screen decides what is worth saying.
   */
  | 'post_assistant'
  /** Post quality reviews (CON-61). */
  | 'post_quality_reviews'
  /** Saved versions kept per post (CON-168). */
  | 'post_versions'
  /** Media-library bytes stored, workspace-wide. */
  | 'media_storage_bytes'
  /** Brand personas (CON-227). */
  | 'brand_personas'
  /** Brand voices (CON-227). */
  | 'brand_voices'
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
 * - **Sell** (lock with an upgrade, at the moment of intent) — `campaigns`,
 *   `seats`, `social_accounts`, `content_plan_runs`, `post_quality_reviews`,
 *   `media_storage_bytes`, `post_assistant`, `brand_personas`, `brand_voices`.
 *   These are the ones somebody is *already reaching for* when they are
 *   stopped: they clicked add, invite, connect, run, review, upload, or opened
 *   the assistant. The upgrade answers a question they had rather than
 *   interrupting with one.
 * - **Lock, no call to action** — `post_versions`,
 *   `multiple_accounts_per_platform`. History shows what it has and locks the
 *   older reach; the second is an affordance that would otherwise vanish
 *   without explanation, and a workspace that has never had two accounts on one
 *   platform would never learn the capability exists.
 * - **Hide** — `custom_campaign_types`. An enumeration: a locked row in a list
 *   of options is noise while somebody is choosing, and the type picker has
 *   nothing to teach from.
 *
 * Note that none of the three is a property of the *key*: the same entitlement
 * can hide in a dropdown and sell on a button. Where a key appears in two
 * places, this is the disposition for its primary one.
 */

/**
 * What an allowance is counted over, when the client knows how to say it.
 *
 * The server owns this word and may send one this build has never heard of, so
 * `usagePeriod` narrows to `null` rather than trusting the string — an unknown
 * period costs a phrase on a meter, never a wrong one.
 */
export type UsagePeriod = 'day' | 'month' | 'post' | 'publish'

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
  used: number
  /** `null` for an allowance counted as a running total rather than per period. */
  period: UsagePeriod | null
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

/** The tier in force, as the server resolved it. */
export type TierSnapshot = {
  /**
   * The tier *version*'s stable id. Opaque: never parsed, never compared,
   * never used to look anything up on the client.
   */
  id: string
  /**
   * What to call it on screen — and nothing more. Two workspaces on the same
   * name can hold different allowances, so this is a label, not a key.
   */
  name: string
  /** When this version came into force for this workspace. Display only. */
  effectiveFrom: string
  /** Null when nothing is scheduled — the common case. */
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

/** One entry of the tier's settings, already camel-cased. */
export type RawEntitlement = {
  /** Absent means true — a purely metered key states a limit, not a verdict. */
  allowed?: boolean
  limit?: number | null
  used?: number
  period?: UsagePeriod | null
  resetsAt?: string | null
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
