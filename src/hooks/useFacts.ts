import { useMutation, useQueryClient } from '@tanstack/react-query'
import { BRAND_KEY, useBrand } from './useBrand'
import { createFact, deleteFact, updateFact } from '@/services/api/brand'
import { ApiError } from '@/services/api/errors'
import type { BrandFact } from '@/components/brand/facts'
import type { BrandData } from '@/components/brand/types'

/** One array for "none yet", so the ledger's re-seed does not fire per render. */
const NO_FACTS: BrandFact[] = []

/**
 * The facts ledger — `brand.facts`, one row per fact (CON-316).
 *
 * Derived from `useBrand` rather than fetched, for the reason `useBrand` is one
 * query: this is a view over the same object every other Brand screen reads,
 * and a second request for the same rows would make the Overview wait twice.
 */
export function useFacts() {
  const { data, isPending, isError } = useBrand()
  return { facts: data?.facts ?? NO_FACTS, isPending, isError }
}

/**
 * The ledger's three writes, one row each.
 *
 * Per row because the server is: two people editing different facts both
 * land, where the whole-list write this replaced let the later one put back
 * whatever the earlier one had changed. Each result goes straight into the
 * cache so the table shows the row the moment the modal closes, and the brand
 * is invalidated behind it because `guardrails.facts` is a projection of the
 * same rows.
 *
 * The create and update don't toast their own failures — a duplicate statement
 * or a bad date is the modal's to say, beside the field — and a `404` refetches,
 * because it means a teammate removed the row this screen is still showing.
 */
export function useFactMutations() {
  const qc = useQueryClient()

  const land = (change: (facts: BrandFact[]) => BrandFact[]) => {
    qc.setQueryData<BrandData>(BRAND_KEY, (current) =>
      current ? { ...current, facts: change(current.facts) } : current,
    )
    qc.invalidateQueries({ queryKey: BRAND_KEY })
  }
  const onError = (error: Error) => {
    if (error instanceof ApiError && error.status === 404) {
      qc.invalidateQueries({ queryKey: BRAND_KEY })
    }
  }

  const create = useMutation({
    mutationFn: createFact,
    scope: { id: 'brand-facts' },
    meta: { errorToast: false },
    onSuccess: (saved) => land((facts) => [...facts, saved]),
    onError,
  })
  const update = useMutation({
    mutationFn: updateFact,
    scope: { id: 'brand-facts' },
    meta: { errorToast: false },
    onSuccess: (saved) =>
      land((facts) =>
        facts.map((fact) => (fact.id === saved.id ? saved : fact)),
      ),
    onError,
  })
  const remove = useMutation({
    mutationFn: deleteFact,
    scope: { id: 'brand-facts' },
    meta: { errorTitle: 'Unable to remove the fact' },
    onSuccess: (_void, id) =>
      land((facts) => facts.filter((fact) => fact.id !== id)),
    onError,
  })

  return {
    /** A fact with no id yet is added; one with an id is replaced. */
    save: (fact: BrandFact) =>
      fact.id ? update.mutateAsync(fact) : create.mutateAsync(fact),
    remove: (id: string) => remove.mutateAsync(id),
  }
}
