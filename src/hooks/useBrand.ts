import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  deleteAudience,
  deleteGuardrails,
  deleteVoice,
  getBrand,
  saveAudience,
  saveGuardrails,
  saveVoice,
} from '@/services/api/brand'
import { setPostBrand } from '@/services/api/posts'
import { postKey } from '@/hooks/usePost'
import { landSavedPost } from '@/lib/postCache'
import type {
  BrandAudience,
  BrandData,
  BrandGuardrails,
  BrandVoice,
} from '@/components/brand/types'

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
 * That shape is now the endpoint's, not a guess about it: CON-228 answers in
 * exactly this form, and the swap from the stub touched only the service — the
 * bet this file was written on.
 *
 * Keyed without the workspace id, like `WORKSPACE_MEMBERS_KEY`: the request is
 * scoped by the tab's `X-Workspace-Id`, and every path that changes which
 * workspace the tab is in tears the whole cache down — a switch and an
 * active-workspace delete clear the query client (`useSwitchWorkspace`,
 * `useDeleteWorkspace`), stale-workspace recovery and login/logout end in a
 * full load or a clear. That teardown is what keeps an unkeyed entry from ever
 * surviving into another workspace.
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
    meta: { errorTitle: 'Unable to save the voice' },
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
            ? merged.map((v) =>
                v.id === saved.id ? v : { ...v, isDefault: false },
              )
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
    meta: { errorTitle: 'Unable to delete the voice' },
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
 * Create or replace an audience — the voice mutation without the demotion,
 * because there is no audience default to keep. CON-228 scopes the one-default
 * invariant to voices and templates; see `resolveAudience` in
 * `components/brand/binding.ts`.
 */
export function useSaveAudience() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (audience: BrandAudience) => saveAudience(audience),
    meta: { errorTitle: 'Unable to save the audience' },
    onSuccess: (saved) => {
      qc.setQueryData<BrandData>(BRAND_KEY, (current) => {
        if (!current) return current
        const merged = current.audiences.some((a) => a.id === saved.id)
          ? current.audiences.map((a) => (a.id === saved.id ? saved : a))
          : [...current.audiences, saved]
        return { ...current, audiences: merged }
      })
      qc.invalidateQueries({ queryKey: BRAND_KEY })
    },
  })
}

export function useDeleteAudience() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteAudience(id),
    meta: { errorTitle: 'Unable to delete the audience' },
    onSuccess: (_void, id) => {
      qc.setQueryData<BrandData>(BRAND_KEY, (current) =>
        current
          ? {
              ...current,
              audiences: current.audiences.filter((a) => a.id !== id),
            }
          : current,
      )
      qc.invalidateQueries({ queryKey: BRAND_KEY })
    },
  })
}

/**
 * Write the guardrails.
 *
 * A singleton, so there is no merge to do and no id to match on — the editor
 * hands back the whole set and it replaces the whole set. The direct cache
 * write is here for the reason it is on the other two: the editor navigates
 * back to the section the instant this resolves, and without it the section
 * paints one frame of its pre-save self, which reads as "it didn't save".
 */
export function useSaveGuardrails() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (guardrails: BrandGuardrails) => saveGuardrails(guardrails),
    meta: { errorTitle: 'Unable to save the guardrails' },
    onSuccess: (saved) => {
      qc.setQueryData<BrandData>(BRAND_KEY, (current) =>
        current ? { ...current, guardrails: saved } : current,
      )
      qc.invalidateQueries({ queryKey: BRAND_KEY })
    },
  })
}

/** Back to `null` — the section empty, which is a state it draws. */
export function useDeleteGuardrails() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: deleteGuardrails,
    meta: { errorTitle: 'Unable to clear the guardrails' },
    onSuccess: () => {
      qc.setQueryData<BrandData>(BRAND_KEY, (current) =>
        current ? { ...current, guardrails: null } : current,
      )
      qc.invalidateQueries({ queryKey: BRAND_KEY })
    },
  })
}

/* -- Binding ---------------------------------------------------------------
 *
 * A campaign's choice out of the library, and a post's override on top of it,
 * are **not queries in this file any more.** CON-245 put all four ids on the
 * campaign and post rows, so `useCampaign` and `usePost` already carry them —
 * two more queries keyed by the same ids would be a second copy of a field the
 * caller is holding, with its own staleness.
 *
 * What is left is one write. The campaign's goes through `useUpdateCampaign`
 * with `campaignToPayload(campaign, { brand_voice_id })`, because a campaign
 * has no targeted sub-action and its PUT reads the refs presence-aware. A
 * post's has one, and is below.
 */

/**
 * Sets a post's voice or audience, in place.
 *
 * A mutation of its own rather than part of the editor's autosave: the picker
 * writes two ids through a targeted endpoint that touches nothing else, and
 * routing it through the document would make choosing a voice a content edit —
 * which a submitted post refuses (CON-251) and which would be wrong anyway,
 * since a binding is an input to the *next* generation rather than a change to
 * what is written.
 *
 * The server answers with the whole post, so the cache takes it: the panel is
 * edited in place and a refetch round-trip would paint one frame of the
 * pre-save selection, which reads as the click not having landed. `postKey` is
 * the editor's own entry, and the list caches follow through `landSavedPost` —
 * the post row shows nothing about a binding today, but the two caches
 * disagreeing about a post is how they start drifting.
 */
export function useSetPostBrand(postId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (refs: PostBrandRefs) => setPostBrand(postId, refs),
    meta: { errorTitle: 'Unable to set the voice' },
    onSuccess: async (saved) => {
      qc.setQueryData(postKey(postId), saved)
      await landSavedPost(qc, saved)
    },
  })
}

/**
 * What one write may say. Both optional, and that is the contract rather than a
 * convenience: omitting a ref leaves it alone server-side, so a voice change
 * cannot silently clear the audience beside it.
 */
export type PostBrandRefs = {
  brand_voice_id?: string | null
  brand_audience_id?: string | null
}
