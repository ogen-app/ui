import { useMutation, useQueryClient } from '@tanstack/react-query'
import { BRAND_KEY, useBrand } from './useBrand'
import { setGuardrailsStance } from '@/services/api/brand'
import type { BrandData, GuardrailsStance } from '@/components/brand/types'

/**
 * Whether this workspace has *decided* it needs no guardrails.
 *
 * `guardrails: null` is both "we looked at this and concluded nothing needs
 * restricting" and "nobody has opened the screen", and the app drew every
 * workspace as the second. The answer is the server's now (CON-316), on the
 * brand aggregate beside the rules it is about — so this is a view over
 * `useBrand`, and the three screens that read it (the Guardrails page, the
 * Overview's card and the section's empty state) agree without asking twice.
 */
export function useGuardrailsStance(): GuardrailsStance | undefined {
  return useBrand().data?.guardrailsStance
}

/**
 * Take the decision, or take it back.
 *
 * A `409` means rules were written since this screen loaded — the server only
 * accepts `none: true` while there are none — so the default toast says why
 * and the refetch puts the rules on screen.
 */
export function useSetGuardrailsStance() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: setGuardrailsStance,
    scope: { id: 'brand-guardrails' },
    meta: { errorTitle: 'Unable to record the decision' },
    onSuccess: (stance) => {
      qc.setQueryData<BrandData>(BRAND_KEY, (current) =>
        current ? { ...current, guardrailsStance: stance } : current,
      )
    },
    onError: () => qc.invalidateQueries({ queryKey: BRAND_KEY }),
  })
}
