import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  readStance,
  writeStance,
  type GuardrailsStance,
} from '@/services/api/brandLocal'
import { todayISO } from '@/components/brand/facts'

export const GUARDRAILS_STANCE_KEY = ['brand', 'guardrails', 'stance'] as const

const NO_STANCE: GuardrailsStance = { none: false, decidedAt: null }

/**
 * Whether this workspace has *decided* it needs no guardrails.
 *
 * The question, and why the app could not answer it before, is on `readStance`
 * — in one line: `guardrails: null` is both "we looked at this and concluded
 * nothing needs restricting" and "nobody has opened the screen", and the app
 * was drawing every workspace as the second.
 *
 * A query over `localStorage` rather than a `useState` in the screen that sets
 * it, because three screens read the answer — the Guardrails page, the
 * Overview's card and the section's own empty state — and a decision held in
 * one component's state is a decision the other two cannot see. When the
 * endpoint exists this file changes in the `queryFn` and nowhere else.
 */
export function useGuardrailsStance() {
  return useQuery({
    queryKey: GUARDRAILS_STANCE_KEY,
    queryFn: async () => readStance(),
    // No `initialData`, deliberately, and it cost an afternoon: seeding the
    // query marks the value fresh, and the client's default `staleTime` is 30
    // seconds — so a page load inside half a minute of any other one answered
    // "no stance taken" without ever reading the store. The read is
    // `localStorage`, so the undefined frame lasts one tick, and the two
    // callers already treat absent and "not decided" as the same thing.
    placeholderData: NO_STANCE,
  })
}

export function useSetGuardrailsStance() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (none: boolean) => {
      const stance: GuardrailsStance = {
        none,
        // The date is the record. A stance somebody took last year is a
        // different thing from the same stance taken this morning, and the one
        // question anybody asks of a decision like this is when it was made.
        decidedAt: none ? todayISO() : null,
      }
      writeStance(stance)
      return stance
    },
    onSuccess: (stance) => qc.setQueryData(GUARDRAILS_STANCE_KEY, stance),
  })
}
