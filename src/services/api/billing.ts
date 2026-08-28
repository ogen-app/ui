import { apiJson } from './http'
import { STUBBED, stubBilling, stubBillingPortal } from './tiers.stub'
import type {
  BillingAccount,
  BillingCard,
  BillingPortalLink,
  BillingPrice,
  BillingStatus,
  BillingSubscription,
} from '@/types/billing'

/**
 * What the workspace pays, and the way out to the provider (CON-232).
 *
 * **Nothing on the API answers this yet**, and there is no payment provider
 * connected either — `tiers.stub.ts` stands in, the way it does for the tier
 * list. This file is the contract; the stub returns the same wire shapes
 * through the same parsers.
 *
 * ## Why there are only two endpoints
 *
 * Ogen sells through **Lemon Squeezy as merchant of record**. Lemon Squeezy is
 * the legal seller: it takes the card, holds the billing address and tax id,
 * calculates and remits VAT/GST/sales tax, and issues the invoice in its own
 * name. Every editable billing field therefore already has a form — a hosted,
 * PCI-scoped, tax-validated one that we do not write, do not host and are not
 * answerable for.
 *
 * So this API reads, and hands out a door. It does not accept a billing
 * address, a tax id, a card, or a cancellation, because each of those would be
 * a second copy of a record Lemon Squeezy bills against and can disagree with
 * the invoice the customer receives. **Answering the question this raised: no,
 * the app does not need address or VAT fields, and should not have them.**
 *
 *     GET /api/billing
 *
 * Owner-only, workspace-scoped. Deliberately *not* part of `/api/entitlements`:
 * that one is read by every member on every screen that has a lock on it, and a
 * card number's last four digits and a renewal price are not something every
 * member should be handed. The split is by sensitivity — the plan payload
 * carries what everyone may see (tier, billing period, renewal date), this one
 * carries the money.
 *
 *     200 {
 *       "subscription": {
 *         "status": "active",
 *         "renews_at": "2026-09-22T00:00:00Z",
 *         "ends_at": null,
 *         "card": {"brand": "visa", "last_four": "4242"},
 *         "price": {"amount": 4900, "currency": "USD", "period": "month"}
 *       },
 *       "portal": true
 *     }
 *
 * **`subscription: null` is a workspace that has never bought anything** — a
 * free tier, or one that has not reached checkout. It is not an error and not
 * an empty object: the screen says something different for "no subscription"
 * than for "a subscription with nothing filled in".
 *
 * **`status` is Lemon Squeezy's own vocabulary** (`on_trial`, `active`,
 * `past_due`, `cancelled`, `paused`, `expired`, `unpaid`), passed through
 * rather than mapped. It arrives on their webhooks; a translation table in the
 * middle is a place for the two to drift. An unrecognised value narrows to
 * `unknown` here, never to `active`.
 *
 * **`renews_at` and `ends_at` are both sent, and only one is set.** A cancelled
 * subscription has no next invoice but is still paid up to a date, and "renews
 * on the 22nd" and "ends on the 22nd" are the same date and opposite news.
 *
 * **`portal: false` means there is nowhere to send anyone**, which is true
 * today and will be true for any workspace whose subscription predates the
 * provider. The screen has to render without the button rather than show one
 * that goes nowhere.
 *
 *     POST /api/billing/portal
 *     200 {"url": "https://…", "expires_at": "2026-08-23T09:00:00Z"}
 *
 * A signed link into the provider's hosted portal, minted per request. Owner
 * only. Lemon Squeezy's expire 24 hours after issue, which is why this is a
 * `POST` that mints one rather than a field on the payload above: a portal URL
 * that rode along on a cached `GET` is one that has expired by the time
 * somebody clicks it, and one that sat in a Query cache is a signed session
 * waiting to be screenshotted. **Never cache, store or log the result.**
 *
 * Behind that one door: payment methods, billing address, tax id, invoices and
 * billing history, and cancelling. That is the whole reason there is no cancel
 * endpoint here — cancellation carries proration and dunning rules that belong
 * to the seller, and the seller is them.
 */

type CardBody = { brand: string; last_four: string }
type PriceBody = { amount: number; currency: string; period: 'month' | 'year' }

type SubscriptionBody = {
  status?: string | null
  renews_at?: string | null
  ends_at?: string | null
  card?: CardBody | null
  price?: PriceBody | null
}

export type BillingBody = {
  subscription?: SubscriptionBody | null
  portal?: boolean | null
}

type PortalBody = { url: string; expires_at?: string | null }

const STATUSES: readonly BillingStatus[] = [
  'on_trial',
  'active',
  'past_due',
  'cancelled',
  'paused',
  'expired',
  'unpaid',
]

/**
 * Narrows the provider's status, defaulting to `unknown`.
 *
 * The default is the point. A status this build has not heard of is one we
 * cannot describe, and describing it as `active` would tell someone whose
 * payment is failing that everything is fine.
 */
function statusFromWire(value: string | null | undefined): BillingStatus {
  return STATUSES.find((status) => status === value) ?? 'unknown'
}

function cardFromWire(body: CardBody | null | undefined): BillingCard | null {
  if (!body) return null
  return { brand: body.brand, last4: body.last_four }
}

function priceFromWire(body: PriceBody | null | undefined): BillingPrice | null {
  if (!body) return null
  return { amount: body.amount, currency: body.currency, period: body.period }
}

function subscriptionFromWire(body: SubscriptionBody): BillingSubscription {
  return {
    status: statusFromWire(body.status),
    renewsAt: body.renews_at ?? null,
    endsAt: body.ends_at ?? null,
    card: cardFromWire(body.card),
    price: priceFromWire(body.price),
  }
}

export function billingFromWire(body: BillingBody): BillingAccount {
  return {
    subscription: body.subscription ? subscriptionFromWire(body.subscription) : null,
    portal: body.portal === true,
  }
}

/**
 * The request itself, split out so the contract stays asserted while the stub
 * answers the app — same reason as `fetchWorkspacePlan`. See
 * `entitlements.ts`.
 */
export function fetchBilling(): Promise<BillingAccount> {
  return apiJson<BillingBody>('/api/billing', 'Unable to read your billing details').then(
    billingFromWire,
  )
}

export function getBilling(): Promise<BillingAccount> {
  return STUBBED ? stubBilling().then(billingFromWire) : fetchBilling()
}

/** The request, split from the stub branch so its contract stays asserted. */
export function fetchBillingPortalLink(): Promise<BillingPortalLink> {
  return apiJson<PortalBody>('/api/billing/portal', 'Unable to open the billing portal', {
    method: 'POST',
  }).then((payload) => ({
    url: payload.url,
    expiresAt: payload.expires_at ?? null,
  }))
}

/** Mints a fresh signed portal link. Called on the click, never before it. */
export function createBillingPortalLink(): Promise<BillingPortalLink> {
  if (!STUBBED) return fetchBillingPortalLink()
  return stubBillingPortal().then((payload) => ({
    url: payload.url,
    expiresAt: payload.expires_at ?? null,
  }))
}
