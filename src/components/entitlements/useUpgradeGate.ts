import { useState } from 'react'

import { useEntitlement } from '@/hooks/useEntitlements'
import type { Entitlement, EntitlementKey } from '@/types/entitlements'

/**
 * The *sell* disposition, in the one shape it takes everywhere (CON-232).
 *
 * Eleven of the fourteen keys are sold rather than hidden or locked, and every
 * one of them is the same moment: a control the user has just clicked — add,
 * invite, connect, run, review, upload, import. The hook exists because that
 * sameness is the point. A denial answered eleven different ways is eleven
 * screens each deciding how much of a salesman to be; answered once, it is a
 * behaviour of the app.
 *
 * What it deliberately does **not** cover is the other two dispositions. Hiding
 * needs the `<li>` and the separator and the empty state, and locking needs the
 * control to stay where it is — neither is a wrapper's decision, which is the
 * whole reason `useEntitlement` is a hook. Those call sites read the
 * entitlement directly and answer it themselves.
 *
 * ```tsx
 * const gate = useUpgradeGate('active_campaigns')
 * <Button onClick={gate.intent(() => setCreating(true))}>…</Button>
 * <UpgradeDialog gate={gate} />
 * ```
 */
export type UpgradeGate = {
  entitlement: Entitlement
  /** Whether the plan has refused this. `pending` is not refusal. */
  denied: boolean
  /** Whether the callout is on screen. */
  selling: boolean
  /**
   * Wraps an intent: performs it, or asks for an upgrade instead of it.
   *
   * The action is never *disabled*. A greyed-out button is a refusal with no
   * sentence attached — the user is left to guess whether they lack permission,
   * whether something is still loading, or whether the app is broken. Letting
   * the click land and answering it is the only version of this that explains
   * itself.
   *
   * The wrapped handler reports whether it ran, for the call sites that have
   * something to undo — a composer clearing the box, a form resetting a field.
   * A click handler can ignore it, and every one of them does.
   */
  intent: (run: () => void) => () => boolean
  dismiss: () => void
}

export function useUpgradeGate(key: EntitlementKey): UpgradeGate {
  const entitlement = useEntitlement(key)
  const [selling, setSelling] = useState(false)
  // Not `!== 'allowed'`: an unanswered plan decides nothing, and a lock shown
  // while the request is in flight tells a paying customer they didn't pay.
  const denied = entitlement.state === 'denied'

  return {
    entitlement,
    denied,
    selling,
    intent: (run: () => void) => () => {
      if (denied) {
        setSelling(true)
        return false
      }
      run()
      return true
    },
    dismiss: () => setSelling(false),
  }
}
