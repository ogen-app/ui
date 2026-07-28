/**
 * Raw colours and fonts for the post previews — a deliberate exception to the
 * semantic-token rule in `docs/colors.md`.
 *
 * Everywhere else in the app, a hard-coded colour is a bug: the token layer is
 * what makes restyling and dark mode possible. These components are different.
 * They are a *simulation of someone else's interface*, so they have to stay
 * fixed to LinkedIn's blue and Facebook's greys no matter what Ogen's theme
 * does — a preview that followed our tokens would stop being a preview.
 * `platformDictionary.ts` sets the same precedent for the brand logo colours.
 *
 * Keep the raw values here rather than inline in the components, so the
 * exception stays one auditable file.
 */

/** Real feeds all render in the viewer's system UI font. */
export const PREVIEW_FONT =
  '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif'

/**
 * One border and one shadow across all three cards.
 *
 * The networks each use a slightly different hairline — Facebook's #ced0d4 is
 * noticeably darker than LinkedIn's 8% black — and reproducing that difference
 * made the cards look inconsistent rather than authentic when switching
 * platforms in the same panel. The shadow lifts the card off the panel, which
 * is what makes it read as a preview *of* something.
 */
export const PREVIEW_BORDER = '#dbdbdb'
export const PREVIEW_SHADOW = '0 1px 3px rgba(0,0,0,0.08), 0 4px 12px rgba(0,0,0,0.06)'

export const LINKEDIN = {
  link: '#0a66c2',
  text: 'rgba(0,0,0,0.9)',
  muted: 'rgba(0,0,0,0.6)',
  action: 'rgba(0,0,0,0.6)',
  surface: '#ffffff',
} as const

export const FACEBOOK = {
  link: '#1877f2',
  text: '#080809',
  muted: '#65676b',
  action: '#65676b',
  surface: '#ffffff',
  cardFill: '#f0f2f5',
} as const

export const INSTAGRAM = {
  text: '#000000',
  muted: '#737373',
  surface: '#ffffff',
  accent: '#0095f6',
} as const
