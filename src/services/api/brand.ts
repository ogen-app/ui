import type {
  BrandAudience,
  BrandData,
  BrandGuardrails,
  BrandVoice,
} from '@/components/brand/types'
import { apiJson, apiVoid } from './http'

/**
 * Brand's data layer — `/api/brand`, tenant-scoped (CON-228).
 *
 * This file was a stub for the length of CON-227: a promise, a small delay, and
 * `localStorage` where a database goes. It was built so that "when the endpoint
 * lands, each body becomes one `apiJson` call and **nothing above this file
 * changes**", and that is what happened — the hook, the routes and the
 * components are untouched by the swap. The wire shapes match `types.ts`
 * exactly, camelCase and all, because CON-228 was written from the prototype
 * rather than the other way round.
 *
 * ## What the server owns
 *
 * `id`, `updatedAt`, `summary`, `usage`, `postsBehind` and `origin` are
 * server-owned: ignored on write, authoritative on the way back. So the editors
 * may keep assembling a whole entity without having to know which of its fields
 * they are actually allowed to set. Two of them are still not real — `summary`
 * answers `""` until the generation job ships, and `postsBehind` answers `0`
 * because it needs a per-post snapshot of the voice's version that CON-245 §13
 * deferred. `usage` **is** real now: CON-245 put the refs on campaigns and
 * posts and counts against them. Those are the same states the screens already
 * draw for material nothing has been written in, so they read as an honest
 * empty rather than as a bug.
 *
 * ## The binding is not here any more
 *
 * A campaign's and a post's choice out of the library used to be four faked
 * functions at the bottom of this file, over `localStorage`, because there were
 * no columns to put them in. CON-245 added all four
 * (`campaigns.brand_voice_id`, `brand_audience_id`, and the same pair on
 * `posts`), so they now ride the resources that own them: a campaign's on the
 * campaign PUT, a post's on `setPostBrand` in `services/api/posts`. That was
 * always the plan for them — *deleted rather than rewritten* — and it is why
 * the hooks folded into `useCampaign` and `usePost` at the same time.
 *
 * `origin` is **write-once**: set on create, preserved verbatim on every
 * replace. That is what keeps *forked, never linked* honest — improving a
 * starter template must never silently rewrite somebody's voice.
 *
 * ## Two invariants that are no longer ours
 *
 * The one-default rule and the empty-guardrails rule moved to the server, where
 * they belong. Saving a voice with `isDefault` demotes its siblings in one
 * transaction, and a partial unique index makes a second default impossible
 * even under a racing double-write; deleting the default hands the flag to the
 * earliest survivor. Audiences are outside it — they have no default (see
 * `saveAudience`). A guardrails `PUT` with every list empty is a `422` rather
 * than a way to reach `null` — emptiness is `DELETE`, because "we have not
 * written these" and "we wrote them and they say nothing" are the two states
 * that section exists to keep apart. The optimistic cache writes in `useBrand`
 * still mirror both, but only so the library cannot contradict its own rule for
 * the one frame before the refetch lands.
 *
 * Not wired here: `POST /api/brand/uploads`, and the `look` / `templates`
 * writes. The endpoints exist; the editors that would call them do not.
 */

export function getBrand(): Promise<BrandData> {
  return apiJson<BrandData>('/api/brand', 'Unable to load the brand')
}

/**
 * Create or replace one voice.
 *
 * One function for both, because the editor makes one gesture: it hands back a
 * whole voice, whether that voice started from nothing, from a starter, or from
 * an existing entry. The split into `POST` and `PUT` is a fact about the wire
 * rather than about what the user did, so it is settled here and nowhere else.
 *
 * **Ids are the server's.** A voice with no id has never been stored, which is
 * what the editor means by handing back `''` (`assemble`, in `VoiceEditor`).
 * The alternative — minting a UUID on the client and letting the server take
 * it — would make "does this exist yet" a question with two answers, and the
 * client's would be a guess.
 */
export function saveVoice(voice: BrandVoice): Promise<BrandVoice> {
  const { id, ...body } = voice
  return id
    ? apiJson<BrandVoice>(
        `/api/brand/voices/${id}`,
        'Unable to save the voice',
        { method: 'PUT', body: voice },
      )
    : apiJson<BrandVoice>('/api/brand/voices', 'Unable to save the voice', {
        method: 'POST',
        body,
      })
}

/**
 * Delete a voice. Nothing cascades — a post already written keeps its text,
 * because the voice was an input to writing it rather than a filter over it.
 */
export function deleteVoice(id: string): Promise<void> {
  return apiVoid(`/api/brand/voices/${id}`, 'Unable to delete the voice', {
    method: 'DELETE',
  })
}

/**
 * Create or replace one audience — `saveVoice` without the one-default
 * invariant, because an audience has no default to keep.
 *
 * `brand_audiences` has no `is_default` column and CON-245's resolver has no
 * workspace step for an audience: a post is written to one because a campaign
 * said so, and a campaign that has chosen nobody falls back to its legacy
 * `target_persona` prose rather than to the library. The reasoning is on
 * `resolveAudience` in `components/brand/binding.ts`; CON-263 is where it would
 * be revisited.
 */
export function saveAudience(audience: BrandAudience): Promise<BrandAudience> {
  const { id, ...body } = audience
  return id
    ? apiJson<BrandAudience>(
        `/api/brand/audiences/${id}`,
        'Unable to save the audience',
        { method: 'PUT', body: audience },
      )
    : apiJson<BrandAudience>(
        '/api/brand/audiences',
        'Unable to save the audience',
        { method: 'POST', body },
      )
}

export function deleteAudience(id: string): Promise<void> {
  return apiVoid(
    `/api/brand/audiences/${id}`,
    'Unable to delete the audience',
    {
      method: 'DELETE',
    },
  )
}

/**
 * Write the guardrails — a singleton, so always a replace and never an insert.
 *
 * A `422` here is the server refusing an all-empty set, and the message it
 * sends points at `DELETE`. It surfaces through the mutation cache's default
 * error toast like any other refusal (`lib/queryClient.ts`); there is nothing
 * for this file to translate.
 */
export function saveGuardrails(
  guardrails: BrandGuardrails,
): Promise<BrandGuardrails> {
  return apiJson<BrandGuardrails>(
    '/api/brand/guardrails',
    'Unable to save the guardrails',
    { method: 'PUT', body: guardrails },
  )
}

/** Put the section back to empty — the only way to reach `null`. */
export function deleteGuardrails(): Promise<void> {
  return apiVoid('/api/brand/guardrails', 'Unable to clear the guardrails', {
    method: 'DELETE',
  })
}
