import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { deleteVoice, getBrand, resetBrand, saveVoice } from '@/services/api/brand'
import type { BrandData, BrandVoice } from '@/components/brand/types'

/**
 * The workspace's Brand material, as one query.
 *
 * **One fetch for the whole thing, not one per section.** The five sections are
 * five views of one object: the Overview counts all of them, the tab bar counts
 * three, and every screen that reads a voice also wants to know how many others
 * there are. Five queries would mean five loading states on a screen that
 * arrives at once, and the same N+1 the campaigns list had before CON-152.
 *
 * The shape is deliberate too, and it is the same one CON-228 has to answer in:
 * every slot present, empty lists and `null` singletons included. An omitted key
 * and an empty slot are different things here — "your brand has no stated
 * guardrails" is a to-do, "we did not say" is nothing at all, and the whole
 * argument for this screen over a folder is that it can be measured against.
 *
 * What is behind it today is a stub (`services/api/brand.ts`): no endpoint, a
 * JSON seed, and `localStorage` where the database goes. That is invisible from
 * here on purpose — this file is written as though the API existed, so the day
 * it does the only edit is in the service.
 */
export const BRAND_KEY = ['brand'] as const

/**
 * Long enough that moving between tabs does not refetch, short enough that a
 * voice saved in one tab of the browser shows up in another before you wonder
 * why it hasn't. The mutations invalidate anyway; this is only about the walk
 * between Brand's own five screens.
 */
const FIVE_MINUTES = 1000 * 60 * 5

export function useBrand() {
  return useQuery({
    queryKey: BRAND_KEY,
    queryFn: getBrand,
    staleTime: FIVE_MINUTES,
  })
}

/**
 * Create or replace a voice.
 *
 * One mutation, because there is one write: the editor hands back a whole
 * voice, id and all, whether it started from nothing, from a starter or from an
 * existing entry. A separate `useCreateVoice` would be a second name for the
 * same request and a second place to remember to invalidate.
 */
export function useSaveVoice() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (voice: BrandVoice) => saveVoice(voice),
    onSuccess: (saved) => {
      // Written into the cache as well as invalidated: the editor navigates
      // back to the library the moment this resolves, and without the direct
      // write the list would paint one frame of its pre-save self while the
      // refetch is in flight — which reads as "it didn't save".
      qc.setQueryData<BrandData>(BRAND_KEY, (current) => {
        if (!current) return current
        const merged = current.voices.some((v) => v.id === saved.id)
          ? current.voices.map((v) => (v.id === saved.id ? saved : v))
          : [...current.voices, saved]
        // The same demotion the write performs, applied to the copy the list
        // is about to paint from. Left to the refetch, promoting a voice would
        // draw two defaults for a frame — and the one frame where the library
        // contradicts its own rule is the frame the user is looking at, since
        // it is the one they just caused.
        return {
          ...current,
          voices: saved.isDefault
            ? merged.map((v) => (v.id === saved.id ? v : { ...v, isDefault: false }))
            : merged,
        }
      })
      qc.invalidateQueries({ queryKey: BRAND_KEY })
    },
  })
}

export function useDeleteVoice() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteVoice(id),
    onSuccess: (_void, id) => {
      qc.setQueryData<BrandData>(BRAND_KEY, (current) => {
        if (!current) return current
        const gone = current.voices.find((v) => v.id === id)
        const voices = current.voices.filter((v) => v.id !== id)
        // Mirrors the service: deleting the default hands the flag on rather
        // than leaving the library with none. See `deleteVoice`.
        if (gone?.isDefault && voices.length > 0) {
          voices[0] = { ...voices[0], isDefault: true }
        }
        return { ...current, voices }
      })
      qc.invalidateQueries({ queryKey: BRAND_KEY })
    },
  })
}

/**
 * Put the stub workspace back to its seed — the harness's control, and no part
 * of the feature. It goes with the stub. See `services/api/brand.ts`.
 */
export function useResetBrand() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: resetBrand,
    onSuccess: (data) => {
      qc.setQueryData<BrandData>(BRAND_KEY, data)
    },
  })
}
