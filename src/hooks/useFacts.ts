import { useMemo } from 'react'
import { useBrand, useDeleteGuardrails, useSaveGuardrails } from './useBrand'
import { factsFrom, saveFactMeta } from '@/services/api/brandLocal'
import type { BrandFact } from '@/components/brand/facts'
import type { BrandGuardrails } from '@/components/brand/types'

/**
 * The facts ledger, assembled out of the one place the server keeps it.
 *
 * A fact is still a member of `guardrails.facts` on the wire — the section
 * split is a UI decision, not a storage one, and moving the statements
 * somewhere else would have taken them away from the generator that already
 * reads them. What the ledger adds is the metadata around each statement, which
 * has nowhere to live yet: see `services/api/brandLocal`, which is where the
 * temporary half is and where it says so.
 *
 * Derived from `useBrand` rather than fetched, for the reason `useBrand` is one
 * query: this is a view over the same object every other Brand screen reads,
 * and a second request for the same row would make the Overview wait twice.
 */
export function useFacts() {
  const { data, isPending, isError } = useBrand()
  const statements = data?.guardrails?.facts
  const facts = useMemo(() => factsFrom(statements ?? []), [statements])
  return { facts, guardrails: data?.guardrails ?? null, isPending, isError }
}

/**
 * Write the ledger back.
 *
 * Two writes that have to be one gesture: the statements go to the guardrails
 * endpoint, and the metadata to the sidecar. The sidecar goes first and
 * unconditionally — it is a `localStorage` write that cannot fail in a way
 * worth branching on, and doing it after the request would drop the dates of
 * anybody who navigated while the save was in flight.
 *
 * **Emptying the ledger can mean deleting the guardrails.** The server refuses
 * an all-empty `PUT` (a `422`, deliberately — `DELETE` is the only route to
 * `null`), so removing the last fact from a workspace that has no rules and no
 * disclaimer either is a delete, not a save. Anything else and it is an
 * ordinary replace that leaves the other four lists exactly as they were.
 */
export function useSaveFacts() {
  const { data } = useBrand()
  const save = useSaveGuardrails()
  const remove = useDeleteGuardrails()
  const current = data?.guardrails ?? null

  return {
    isPending: save.isPending || remove.isPending,
    save(facts: BrandFact[], options?: { onSuccess?: () => void }) {
      const kept = facts.filter((fact) => fact.statement.trim().length > 0)
      saveFactMeta(kept)

      const next: BrandGuardrails = {
        facts: kept.map((fact) => fact.statement.trim()),
        mayClaim: current?.mayClaim ?? [],
        neverClaim: current?.neverClaim ?? [],
        bannedWords: current?.bannedWords ?? [],
        disclaimer: current?.disclaimer ?? '',
        updatedAt: new Date().toISOString(),
      }

      if (statesNothing(next)) {
        // Nothing stored and nothing to store: the ledger was emptied on a
        // workspace that had only facts. Saving would be refused and deleting
        // something that does not exist would be a request for nothing.
        if (!current) {
          options?.onSuccess?.()
          return
        }
        remove.mutate(undefined, { onSuccess: options?.onSuccess })
        return
      }

      save.mutate(next, { onSuccess: options?.onSuccess })
    },
  }
}

/** The all-empty shape the server answers `422` to. */
function statesNothing(g: BrandGuardrails): boolean {
  return (
    g.facts.length === 0 &&
    g.mayClaim.length === 0 &&
    g.neverClaim.length === 0 &&
    g.bannedWords.length === 0 &&
    g.disclaimer.trim().length === 0
  )
}
