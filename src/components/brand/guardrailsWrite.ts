import type { GuardrailsWrite } from '@/services/api/brand'
import type { BrandGuardrails } from './types'

/**
 * What the guardrails editor writes, and what it counts as a change — kept out
 * of the component because one rule here can destroy another section.
 *
 * The facts are rows of their own since CON-316, and this screen never writes
 * them. The `guardrails.facts` it is handed is only a projection of those rows,
 * which moves whenever a teammate adds one, so it is left out of the comparison
 * too — otherwise adding a fact would mark the rules unsaved.
 */

export type GuardrailsDraft = Pick<
  BrandGuardrails,
  'mayClaim' | 'neverClaim' | 'bannedWords' | 'disclaimer'
>

/**
 * The draft as the whole singleton, for the caller to store.
 *
 * Blank rows are dropped here rather than while typing, which is the only place
 * it can be done without deleting the row somebody is standing in. It is also
 * what makes `empty` answerable above: whether anything has been *stated* is a
 * question about the saved shape, not about how many boxes are on screen.
 */
export function assemble(draft: GuardrailsDraft): GuardrailsWrite {
  const stated = (items: string[]) =>
    items.map((item) => item.trim()).filter((item) => item.length > 0)

  return {
    mayClaim: stated(draft.mayClaim),
    neverClaim: stated(draft.neverClaim),
    bannedWords: stated(draft.bannedWords),
    disclaimer: draft.disclaimer.trim(),
    updatedAt: new Date().toISOString(),
  }
}

/** The stored record as this screen compares it — without the ledger's projection. */
export function comparable(guardrails: BrandGuardrails): GuardrailsWrite {
  const { facts: _projection, ...rules } = guardrails
  return rules
}

/**
 * What is stated, as one comparable value — the answer to "has anything
 * actually changed", which is what decides whether there is anything to save.
 *
 * Over the *stated* shape rather than the draft, so the two things that are not
 * edits do not read as ones: a blank row somebody opened and abandoned, and the
 * fresh `updatedAt` `assemble` stamps on every call. `null` and a record with
 * nothing in it are deliberately the same statement — that equality is what
 * makes the blocker above catch a cleared-out set of rules.
 */
export function statement(guardrails: GuardrailsWrite | null) {
  const g = guardrails
  return [
    g?.mayClaim ?? [],
    g?.neverClaim ?? [],
    g?.bannedWords ?? [],
    g?.disclaimer ?? '',
  ]
}
