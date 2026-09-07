import type { TFunction } from 'i18next'
import { MIN_VOICE_SAMPLES, type BrandUsage, type BrandVoice } from './types'

/**
 * What a piece of brand material is described by, worded once.
 *
 * Here rather than in the components because the Overview's row and the
 * section's own card say the same things about the same voice, and two places
 * phrasing "never used" differently is how a screen starts to read as though
 * two people wrote it.
 *
 * **Every one of these takes `t` as its first argument**, which is the rule for
 * any pure function that produces words: it is what lets the same helper be
 * called from a component and from a card without either of them holding a
 * label frozen to whichever language loaded first.
 * `components/analytics/format.ts` is the same shape for the same reason.
 */

export function sampleCount(t: TFunction, n: number): string {
  if (n === 0) return t('brand.facts.samplesNone')
  return t('brand.facts.samples', { count: n })
}

/**
 * What has actually been written with this — the answer to "is anyone using
 * it", which is the one thing about a library entry that cannot be read off its
 * name.
 *
 * Drafts and published are kept apart rather than totalled because they are two
 * different facts about the same material: drafts are still ours to regenerate,
 * published posts are out in the world and are the reason the entry cannot
 * simply be deleted. And **never used** is the value worth printing most — an
 * entry nobody writes in is the library's own dead weight, and it is invisible
 * if zero renders as blank.
 */
export function usageLine(t: TFunction, usage: BrandUsage): string {
  const parts: string[] = []
  if (usage.published > 0)
    parts.push(t('brand.facts.usagePublished', { count: usage.published }))
  if (usage.drafts > 0)
    parts.push(t('brand.facts.usageDrafts', { count: usage.drafts }))
  // Commas, not middle dots: on the library cards these are items in a
  // bulleted fact, and the bullet is already doing the separating. The Overview
  // joins them the same way for the same reason — and the comma itself comes
  // off the catalogue, because how a language joins a list is the language's
  // business and not this file's.
  return parts.length > 0
    ? parts.join(t('brand.facts.separator'))
    : t('brand.facts.usageNever')
}

/**
 * What the star on a voice actually says, in a sentence, for anybody who is not
 * looking at the colour.
 *
 * Two readings rather than one, because the interesting state is the second: a
 * default voice with nothing behind it is the case where the whole library is
 * decorative, and "default" on its own would report that as success.
 *
 * Here rather than in `VoicesSection` for the reason the two above are: the
 * library card and the Overview's row both render this star and both need the
 * sentence behind it, and a fact that reads one way in a list and another way
 * on the index is two facts as far as anybody using a screen reader is
 * concerned.
 */
export function defaultVoiceLabel(t: TFunction, voice: BrandVoice): string {
  return voice.samples.length >= MIN_VOICE_SAMPLES
    ? t('brand.voices.defaultBacked')
    : t('brand.voices.defaultThin')
}
