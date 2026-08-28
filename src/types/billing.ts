/**
 * What the workspace pays, and where it goes to change that (CON-232).
 *
 * Deliberately thin, and it stays thin. Ogen sells through **Lemon Squeezy as
 * merchant of record**, which means Lemon Squeezy — not us — is the legal
 * seller: it takes the card, holds the billing address and tax id, works out
 * and remits VAT/GST/sales tax, and issues the invoice. So the money lives
 * there and this app only ever *reports* it.
 *
 * The rule that follows, and the reason this file is short: **no field a
 * customer could edit belongs here.** No address, no tax id, no card. Every one
 * of those has a form already, in Lemon Squeezy's own hosted portal, which is
 * validated against the record they actually bill and are legally answerable
 * for. A second copy on our screens would be a copy that can disagree with the
 * invoice — and it would put payment details through a form we own, which is
 * both a compliance surface we do not want and something this codebase is not
 * going to do.
 *
 * It is also why there is no billing *screen*: what is left to state after the
 * provider has taken everything editable is a plan, a card's last four and one
 * sentence naming where the rest lives, and that is a card rather than a page.
 * See `services/api/billing.ts` for the endpoints and
 * `components/workspace-settings/PlanSection` for the card.
 */

/**
 * Where a subscription is in its life, as Lemon Squeezy names it.
 *
 * The provider's vocabulary rather than one of our own: these arrive on
 * webhooks and every mapping we invented in between would be a place for the
 * two to drift. `unknown` is what an unrecognised status narrows to — a new
 * provider state must read as "we can't say" rather than as "active".
 */
export type BillingStatus =
  | 'on_trial'
  | 'active'
  /** Payment failed and is being retried. Still working, but at risk. */
  | 'past_due'
  /** Cancelled by the customer; access runs to `endsAt`. */
  | 'cancelled'
  | 'paused'
  /** Ran out of retries, or the term ended. Access is over. */
  | 'expired'
  | 'unpaid'
  | 'unknown'

/** The card on file, for recognition only — four digits and a brand. */
export type BillingCard = {
  /** Provider copy: "visa", "mastercard". Not translated, not an enum. */
  brand: string
  last4: string
}

export type BillingSubscription = {
  status: BillingStatus
  /** End of the current billing cycle — when the next invoice is issued. */
  renewsAt: string | null
  /**
   * When access stops, for a subscription that is cancelled or expired.
   *
   * Separate from `renewsAt` because a cancelled subscription has no next
   * invoice but is still paid up: "renews on the 22nd" and "ends on the 22nd"
   * are the same date and opposite news.
   */
  endsAt: string | null
  card: BillingCard | null
  price: BillingPrice | null
}

export type BillingPrice = {
  /** Minor units, as the provider quotes them. */
  amount: number
  currency: string
  period: 'month' | 'year'
}

/** Everything the app knows about this workspace's billing. */
export type BillingAccount = {
  /** `null` for a workspace that has never bought anything. */
  subscription: BillingSubscription | null
  /**
   * Whether there is a hosted portal to send anyone to.
   *
   * False before the provider is connected at all, which is where this app is
   * today — and the reason the screen has to be able to render itself without
   * one instead of showing a button that goes nowhere.
   */
  portal: boolean
}

/**
 * A link into the provider's hosted portal.
 *
 * **Signed and short-lived** — Lemon Squeezy's expire 24 hours after they are
 * issued. So this is fetched at the moment of the click and never cached,
 * stored, logged or put in a link's `href` at render time. A portal URL sitting
 * in a Query cache is a URL that has expired by the time somebody uses it, and
 * one in a bookmark or a shared screenshot is a session somebody else can open.
 */
export type BillingPortalLink = {
  url: string
  /** Display and sanity only; nothing branches on it. */
  expiresAt: string | null
}
