/**
 * Resolving a binding: given the library, a campaign's choice and a post's
 * override, *what voice is this post in, and who said so*.
 *
 * Pure functions over already-fetched data, in one file, because §8's claim is
 * that three levels are explainable and a fourth is not — and the only way to
 * keep that honest is for the whole resolution to be readable in one sitting.
 * Every screen that shows a binding shows `source` alongside it, so a user
 * never has to hold this file in their head to know why their post came out the
 * way it did.
 *
 * **This mirrors `brandresolve` on the server, and that is the whole job.** The
 * server is what the generation flows actually obey (CON-245 §5); a screen that
 * named a voice the generator would not have used would be worse than saying
 * nothing. Keep the two walks identical — when they disagree, this one is
 * wrong.
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
  voiceId: null,
  audienceId: null,
}

/** A post that has overridden nothing — which is most posts. */
export const EMPTY_POST_BRAND: PostBrand = { voiceId: null, audienceId: null }

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
  /** The campaign's choice, inherited. */
  | 'campaign'
  /** The library's own default — nobody chose, and this is the fallback. */
  | 'library'
  /** Nothing to resolve to: an empty library, or a reference to a deleted entry. */
  | 'none'

export type ResolvedVoice = {
  voice: BrandVoice | null
  source: BindingSource
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
 * Walk the three levels, most specific first, and say where the answer came
 * from.
 *
 * Each level falls through when it names something that is not there any more,
 * rather than resolving to nothing — a campaign pointing at a deleted voice
 * should behave like a campaign that never chose, which is what every level
 * below it is for. The server does the same thing for a different reason: its
 * FKs are `ON DELETE SET NULL`, so by the time it resolves, the dead reference
 * is already `null`. Ours is the window before the campaign is refetched.
 */
export function resolveVoice(
  brand: BrandData,
  campaign: CampaignBrand,
  post: PostBrand,
): ResolvedVoice {
  const chosen = voiceById(brand, post.voiceId)
  if (chosen) return { voice: chosen, source: 'post' }

  const inherited = voiceById(brand, campaign.voiceId)
  if (inherited) return { voice: inherited, source: 'campaign' }

  const libraryDefault = brand.voices.find((v) => v.isDefault)
  if (libraryDefault) return { voice: libraryDefault, source: 'library' }

  return { voice: null, source: 'none' }
}

/**
 * The same walk, one step shorter — a post's choice, then the campaign's, and
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
