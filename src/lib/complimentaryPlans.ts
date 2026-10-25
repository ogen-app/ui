import type { LedgerColumn } from '@/components/tiers/PlanLedger'
import type { WorkspacePlan } from '@/types/entitlements'
import type { Tier } from '@/types/tiers'

/**
 * `/plans` for a tester's workspace (CON-402): the CON-328 Ledger with every
 * sign of money taken out.
 *
 * Kept: the columns, their order and the allowance rows — that is what a
 * tester is comparing. Gone: prices, the billing interval, the inverted
 * "most popular" column and the free-month offer, because nothing is being
 * sold and no column should be pushed. Each column is the same label and the
 * same black SWITCH TO {TIER}; the tier held is an outlined CURRENT PLAN.
 *
 * The server's comp branch (CON-333 §6.6) moves the workspace to any tier
 * whose version is active and purchasable, and runs before billing is even
 * consulted. So `Tier.available` — "Lemon Squeezy can sell this now" — is not
 * the question: it reads false for every tier while billing is off, which is
 * exactly when testers most need to switch. `offered` is already the
 * purchasable list.
 */

/**
 * Whether `/plans` is the comp picker. Only without a live subscription: a
 * comped workspace that somehow holds one (an operator mistake) follows the
 * paid paths, as the server does.
 */
export function isComplimentaryPicker(plan: WorkspacePlan): boolean {
  return plan.billing.complimentary && plan.tier.billingPeriod == null
}

export function complimentaryColumns(
  offered: readonly Tier[],
  heldTierId: string,
  mayChange: boolean,
): LedgerColumn[] {
  return offered.map((tier) => ({
    tier,
    label: 'freeWhileTesting',
    action: !mayChange
      ? { kind: 'none' }
      : tier.tierId === heldTierId
        ? { kind: 'held' }
        : { kind: 'switch' },
  }))
}
