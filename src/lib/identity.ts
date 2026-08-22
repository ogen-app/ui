/**
 * Visual identity for the things a user has many of and must tell apart at a
 * glance — campaigns in the sidebar, workspaces in the account menu: one of
 * the seven `--identity-*` hues (see `src/index.css`) plus a short
 * abbreviation.
 *
 * The id is the hash input on purpose — it is opaque, server-assigned, and
 * cannot be changed, so a campaign or workspace keeps its colour across
 * renames, reorderings, sessions and devices with nothing stored anywhere.
 * List position would not: creating one campaign would recolour every campaign
 * after it.
 *
 * Colour is never the only signal. Seven hues collide once someone has more
 * than seven of something, and they say nothing at all to a user who cannot
 * separate them — which is why the abbreviation travels with it.
 */

/** How many hues the palette has. Keep in sync with `--identity-*`. */
export const IDENTITY_COLOR_COUNT = 7

/** 1-based slot in the identity palette, stable for a given id. */
function identityColorIndex(id: string): number {
  // FNV-1a. Ids are UUIDs, which share long structural prefixes and a fixed
  // length — a naive sum or char-shift hash clusters badly on those, while FNV
  // avalanches the low bits we actually take the modulo of.
  let hash = 0x811c9dc5
  for (let i = 0; i < id.length; i++) {
    hash ^= id.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193)
  }
  return ((hash >>> 0) % IDENTITY_COLOR_COUNT) + 1
}

/**
 * The identity colour as a CSS value, for the places that must set it
 * dynamically (SVG `fill`/`stroke`, inline `style`) and so cannot use a static
 * utility class.
 */
export function identityColorVar(id: string): string {
  return `var(--identity-${identityColorIndex(id)})`
}

/**
 * Up to two letters for a name: the initials of its first two words, or the
 * first two characters of a single-word name.
 */
export function identityAbbr(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean)
  if (words.length === 0) return '·'
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase()
  return `${words[0][0]}${words[1][0]}`.toUpperCase()
}
