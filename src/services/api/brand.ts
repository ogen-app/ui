import type {
  BrandAudience,
  BrandData,
  BrandGuardrails,
  BrandVoice,
  CampaignBrand,
  PostBrand,
} from '@/components/brand/types'
import {
  EMPTY_CAMPAIGN_BRAND,
  EMPTY_POST_BRAND,
} from '@/components/brand/binding'
import { getActiveWorkspaceId } from '@/lib/activeWorkspace'
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
 * they are actually allowed to set. Two of them are not yet real — `summary`
 * answers `""` until the generation job ships, and `usage` / `postsBehind`
 * answer `0` until CON-245 puts a voice reference on posts. Those are the same
 * states the screens already draw for material nothing has been written in, so
 * they read as an honest empty rather than as a bug.
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

/* -- Binding — still a stub ------------------------------------------------
 *
 * What a campaign and a post have chosen out of the library (§8). CON-228
 * deliberately left this out: it is the *consumer* half, and it belongs to
 * CON-245, which is open and unmerged. So `Campaign` and `Post` still have no
 * column to put this in, and the four functions below keep faking one.
 *
 * **This is the last of the stub, and it is shaped differently from what is
 * above.** A voice is its own resource with its own endpoint. A campaign's
 * binding is not — CON-245 makes it two nullable columns on the campaign and
 * two on the post (`brand_voice_id`, `brand_audience_id`), written by
 * `PUT /api/campaigns/:id`, `PUT /api/posts/:id`, or the targeted
 * `PUT /api/posts/:id/brand`. So these take an id and a whole value rather than
 * pretending to be REST, and when CON-245 lands they are deleted rather than
 * rewritten: the hooks fold into `useCampaign` and `usePost`.
 *
 * Kept in its own storage key rather than inside `BrandData`, because per-row
 * bindings were never part of what the workspace-level fetch answers.
 */

/**
 * Long enough to see, short enough not to be in the way. Not zero, and that is
 * the point of the number: a promise that resolves immediately hides every
 * loading state the pickers have.
 */
const LATENCY_MS = 220

function settle<T>(value: T): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), LATENCY_MS))
}

type BindingStore = {
  campaigns: Record<string, CampaignBrand>
  posts: Record<string, PostBrand>
}

const EMPTY_STORE: BindingStore = { campaigns: {}, posts: {} }

function bindingKey(): string {
  return `ogen.brand.binding.${getActiveWorkspaceId() ?? 'default'}`
}

function readBindings(): BindingStore {
  try {
    const stored = localStorage.getItem(bindingKey())
    if (stored)
      return { ...EMPTY_STORE, ...(JSON.parse(stored) as BindingStore) }
  } catch {
    // An unreadable stub answers with nothing bound, which every screen already
    // draws. A corrupt fake is a nuisance; a campaign that will not open until
    // you clear storage by hand is a bug report about one.
  }
  return structuredClone(EMPTY_STORE)
}

function writeBindings(store: BindingStore): void {
  try {
    localStorage.setItem(bindingKey(), JSON.stringify(store))
  } catch {
    // Quota or private mode. Lost on the next read; the screen still shows what
    // the mutation returned.
  }
}

/**
 * A campaign's share of the library.
 *
 * Answers with a stated empty rather than `null` for a campaign nobody has
 * bound. "Has chosen nothing" is a real, common and perfectly valid state — it
 * is what every campaign that existed before this feature is in — and making
 * callers distinguish it from "no row" would be a distinction with no consumer.
 */
export function getCampaignBrand(campaignId: string): Promise<CampaignBrand> {
  return settle(readBindings().campaigns[campaignId] ?? EMPTY_CAMPAIGN_BRAND)
}

export function saveCampaignBrand(
  campaignId: string,
  value: CampaignBrand,
): Promise<CampaignBrand> {
  const store = readBindings()
  writeBindings({
    ...store,
    campaigns: { ...store.campaigns, [campaignId]: value },
  })
  return settle(value)
}

/** One post's overrides. Empty is the state almost every post stays in. */
export function getPostBrand(postId: string): Promise<PostBrand> {
  return settle(readBindings().posts[postId] ?? EMPTY_POST_BRAND)
}

export function savePostBrand(
  postId: string,
  value: PostBrand,
): Promise<PostBrand> {
  const store = readBindings()
  writeBindings({ ...store, posts: { ...store.posts, [postId]: value } })
  return settle(value)
}
