/**
 * Resolving a binding: given the library, a campaign's share of it and a post's
 * overrides, *what voice is this post in, and who said so*.
 *
 * Pure functions over already-fetched data, in one file, because §8's claim is
 * that three levels are explainable and a fourth is not — and the only way to
 * keep that honest is for the whole resolution to be readable in one sitting.
 * Every screen that shows a binding shows `source` alongside it, so a user
 * never has to hold this file in their head to know why their post came out the
 * way it did.
 */

import type {
  BrandAudience,
  BrandData,
  BrandVoice,
  CampaignBrand,
  PostBrand,
} from './types'

/** A campaign that has chosen nothing. What an untouched campaign resolves as. */
export const EMPTY_CAMPAIGN_BRAND: CampaignBrand = {
  voiceIds: [],
  defaultVoiceId: null,
  audienceId: null,
}

/** A post that has overridden nothing — which is most posts. */
export const EMPTY_POST_BRAND: PostBrand = { voice: null, audienceId: null }

/**
 * Which level actually supplied the value.
 *
 * On the surface rather than inferred at each call site, because "why is this
 * post in that voice" is the question the whole feature has to be able to
 * answer, and the answer is exactly this word.
 */
export type BindingSource =
  /** Chosen on this post. */
  | 'post'
  /** The campaign's default, inherited. */
  | 'campaign'
  /** The library's own default — nobody chose, and this is the fallback. */
  | 'library'
  /** Nothing to resolve to: an empty library, or a reference to a deleted entry. */
  | 'none'

export type ResolvedVoice = {
  voice: BrandVoice | null
  /** The post's local bend, if it has one. Never inherited — a delta is local. */
  delta: string | null
  source: BindingSource
  /**
   * The voice has been edited since this post was written.
   *
   * Not a warning: the post's text stands, and the reference is an input to the
   * *next* generation rather than a filter over this one (§8). It is an offer
   * to regenerate, and screens should word it as one.
   */
  stale: boolean
}

export type ResolvedAudience = {
  audience: BrandAudience | null
  source: BindingSource
}

function voiceById(
  brand: BrandData,
  id: string | null,
): BrandVoice | undefined {
  return id ? brand.voices.find((v) => v.id === id) : undefined
}

/**
 * The voices a campaign draws on, in the order they were picked.
 *
 * References to deleted voices drop out silently. The alternative — a "missing
 * voice" row — would be a repair job handed to whoever next opened the campaign
 * for something a workspace admin did somewhere else entirely, and there is
 * nothing they could usefully do about it beyond what dropping it already does.
 */
export function castOf(
  brand: BrandData,
  campaign: CampaignBrand,
): BrandVoice[] {
  return campaign.voiceIds
    .map((id) => brand.voices.find((v) => v.id === id))
    .filter((v): v is BrandVoice => v !== undefined)
}

/**
 * Walk the three levels, most specific first, and say where the answer came
 * from.
 *
 * Each level falls through when it names something that is not there any more,
 * rather than resolving to nothing — a campaign pointing at a deleted voice
 * should behave like a campaign that never chose, which is what every level
 * below it is for.
 */
export function resolveVoice(
  brand: BrandData,
  campaign: CampaignBrand,
  post: PostBrand,
  /** ISO. The post's own `updated_at`, for the staleness read. */
  postUpdatedAt?: string,
): ResolvedVoice {
  const delta = post.voice?.delta ?? null

  const chosen = voiceById(brand, post.voice?.id ?? null)
  if (chosen)
    return {
      voice: chosen,
      delta,
      source: 'post',
      ...staleness(chosen, postUpdatedAt),
    }

  // A delta with no id is a one-off instruction nobody named. It belongs to the
  // post, so the post is the source even though there is no library entry
  // behind it — this is the state promotion exists to rescue.
  if (post.voice && post.voice.id === null && delta !== null) {
    return { voice: null, delta, source: 'post', stale: false }
  }

  const campaignDefault = voiceById(brand, campaign.defaultVoiceId)
  if (campaignDefault) {
    return {
      voice: campaignDefault,
      delta,
      source: 'campaign',
      ...staleness(campaignDefault, postUpdatedAt),
    }
  }

  // No stated default, but a cast of one is a default in everything but name.
  // Past one, the campaign genuinely has not said, and the library answers.
  const cast = castOf(brand, campaign)
  if (cast.length === 1) {
    return {
      voice: cast[0],
      delta,
      source: 'campaign',
      ...staleness(cast[0], postUpdatedAt),
    }
  }

  const libraryDefault = brand.voices.find((v) => v.isDefault)
  if (libraryDefault) {
    return {
      voice: libraryDefault,
      delta,
      source: 'library',
      ...staleness(libraryDefault, postUpdatedAt),
    }
  }

  return { voice: null, delta, source: 'none', stale: false }
}

function staleness(
  voice: BrandVoice,
  postUpdatedAt?: string,
): { stale: boolean } {
  if (!postUpdatedAt) return { stale: false }
  return { stale: new Date(voice.updatedAt) > new Date(postUpdatedAt) }
}

/**
 * The same walk, two steps shorter — a post's choice, then the campaign's, and
 * then nothing.
 *
 * **There is deliberately no library step here, and voices deliberately have
 * one.** The asymmetry looks like an omission and is a decision, made on the
 * server and locked in CON-245 §5: a voice resolves post → campaign →
 * workspace default → legacy prose, and an audience resolves post → campaign →
 * legacy prose. `docs/brand-materials.md` is where it comes from — *the
 * assigned voice per post, the audience per campaign* — and §6 is the reason:
 * audiences are a separate library from voices precisely because they cross,
 * one voice addressing two of them. A default collapses a choice whose answer
 * is the same nine times in ten, which is true of a workspace's voice and is
 * the opposite of true for who a campaign is written to.
 *
 * This file resolved to the library for a while, on the argument that no
 * audience means generating for nobody. The argument is not wrong; it is
 * simply not ours to act on unilaterally. `brandresolve` on the server is what
 * the flows actually obey, and a screen that named an audience the generator
 * would not have used would be worse than the gap it was papering over. If the
 * case is to be made, CON-263 is where.
 *
 * `none` therefore means what it says: nothing has chosen, and the flows fall
 * back to the campaign's legacy `target_persona` prose.
 */
export function resolveAudience(
  brand: BrandData,
  campaign: CampaignBrand,
  post: PostBrand,
): ResolvedAudience {
  const chosen = brand.audiences.find((a) => a.id === post.audienceId)
  if (chosen) return { audience: chosen, source: 'post' }

  const inherited = brand.audiences.find((a) => a.id === campaign.audienceId)
  if (inherited) return { audience: inherited, source: 'campaign' }

  return { audience: null, source: 'none' }
}
