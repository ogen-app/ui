import type { TFunction } from 'i18next'
import type { BrandUsage } from './types'

/**
 * The counts a piece of brand material is described by, worded once.
 *
 * Here rather than in the components because the Overview's row and the
 * section's own card say the same two things about the same voice, and two
 * places phrasing "never used" differently is how a screen starts to read as
 * though two people wrote it.
 *
 * **Both take `t` as their first argument**, which is the rule for any pure
 * function that produces words: it is what lets the same helper be called from
 * a component and from a card without either of them holding a label frozen to
 * whichever language loaded first. `components/analytics/format.ts` is the same
 * shape for the same reason.
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
