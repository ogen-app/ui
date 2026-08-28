import type { RawEntitlement } from './entitlements'

/**
 * The tiers a workspace can be on — the catalogue, as opposed to the one tier
 * it holds (`WorkspacePlan` in `types/entitlements.ts`).
 *
 * Two different questions, and they stay two types. "What does this workspace
 * allow?" is asked on every gated screen and has to be cheap; "what could it
 * be on instead?" is asked on one screen and only when someone opens it.
 * Folding the second into the first would put the whole price list behind
 * every lock icon in the app.
 */

/**
 * What a tier costs, for display only.
 *
 * `amount` is in minor units (cents) so nothing here has to hold a decimal it
 * might round. Null while pricing is undecided — the screen omits the line
 * rather than inventing a number, which is the honest rendering of "we haven't
 * said yet" and not the same as free. Free is `amount: 0`.
 */
export type TierPrice = {
  amount: number
  /** ISO 4217, e.g. `USD`. The formatter takes it; the client never maps it. */
  currency: string
  period: 'month' | 'year'
}

export type Tier = {
  /** The *version*, not the name — opaque to the client. */
  id: string
  /**
   * The label, which two versions of a tier share. Server copy: the tier list
   * is configurable, so this is data rather than a catalogue key, and it is
   * one of the few strings in the app that is not translated. That is a real
   * limitation and it belongs to whoever edits the tier list.
   */
  name: string
  /** One line on who it is for. Server copy, same as `name`. */
  tagline: string
  effectiveFrom: string
  price: TierPrice | null
  /** Keyed and shaped exactly like `WorkspacePlan.entitlements`. */
  entitlements: Record<string, RawEntitlement>
  /**
   * Whether a workspace can move onto this tier today.
   *
   * False for a version that has been superseded. Tiers are versioned and a
   * workspace keeps the one it bought, so the tier a workspace is *on* is
   * routinely not one it could buy — which is why this screen renders the
   * current plan from `WorkspacePlan`, never by looking its id up in this
   * list. See CLAUDE.md: every picker has to tolerate a current value that is
   * no longer among its options.
   */
  available: boolean
}
