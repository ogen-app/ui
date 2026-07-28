/**
 * Campaign identity colour: one of the seven `--campaign-*` hues (see
 * `src/index.css`), picked by hashing the campaign's id.
 *
 * The id is the input on purpose — it is opaque, server-assigned, and cannot
 * be changed, so a campaign keeps its colour across renames, reorderings,
 * sessions and devices with nothing stored anywhere. List position would not:
 * creating one campaign would recolour every campaign after it.
 */

/** How many hues the palette has. Keep in sync with `--campaign-*`. */
export const CAMPAIGN_COLOR_COUNT = 7

/** 1-based slot in the campaign palette, stable for a given id. */
export function campaignColorIndex(id: string): number {
  // FNV-1a. Campaign ids are UUIDs, which share long structural prefixes and
  // a fixed length — a naive sum or char-shift hash clusters badly on those,
  // while FNV avalanches the low bits we actually take the modulo of.
  let hash = 0x811c9dc5
  for (let i = 0; i < id.length; i++) {
    hash ^= id.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193)
  }
  return ((hash >>> 0) % CAMPAIGN_COLOR_COUNT) + 1
}

/**
 * The campaign's colour as a CSS value, for the places that must set it
 * dynamically (SVG `fill`/`stroke`, inline `style`) and so cannot use a static
 * utility class.
 */
export function campaignColorVar(id: string): string {
  return `var(--campaign-${campaignColorIndex(id)})`
}
