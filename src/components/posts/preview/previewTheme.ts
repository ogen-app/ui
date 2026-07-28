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

export const LINKEDIN = {
  link: '#0a66c2',
  text: 'rgba(0,0,0,0.9)',
  muted: 'rgba(0,0,0,0.6)',
  action: 'rgba(0,0,0,0.6)',
  border: 'rgba(0,0,0,0.08)',
  surface: '#ffffff',
} as const

export const FACEBOOK = {
  link: '#1877f2',
  text: '#080809',
  muted: '#65676b',
  action: '#65676b',
  border: '#ced0d4',
  surface: '#ffffff',
  cardFill: '#f0f2f5',
} as const

export const INSTAGRAM = {
  text: '#000000',
  muted: '#737373',
  border: '#dbdbdb',
  surface: '#ffffff',
  accent: '#0095f6',
} as const
