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
 * One border and one shadow across every card.
 *
 * The networks each use a slightly different hairline — Facebook's #ced0d4 is
 * noticeably darker than LinkedIn's 8% black — and reproducing that difference
 * made the cards look inconsistent rather than authentic when switching
 * platforms in the same panel. The shadow lifts the card off the panel, which
 * is what makes it read as a preview *of* something.
 */
export const PREVIEW_BORDER = '#dbdbdb'
export const PREVIEW_SHADOW = '0 1px 3px rgba(0,0,0,0.08), 0 4px 12px rgba(0,0,0,0.06)'

// The card surface itself is PreviewSurface's job, so these carry only what
// differs per network.
export const LINKEDIN = {
  link: '#0a66c2',
  text: 'rgba(0,0,0,0.9)',
  muted: 'rgba(0,0,0,0.6)',
  action: 'rgba(0,0,0,0.6)',
} as const

export const FACEBOOK = {
  link: '#1877f2',
  text: '#080809',
  muted: '#65676b',
  action: '#65676b',
  cardFill: '#f0f2f5',
} as const

export const INSTAGRAM = {
  text: '#000000',
  muted: '#737373',
  /** The near-white behind an image that hasn't filled its frame. */
  surface: '#fafafa',
  /** Carousel dots: Instagram's blue for the current slide, grey for the rest. */
  dot: '#0095f6',
  dotMuted: '#c7c7c7',
} as const

export const TWITTER = {
  link: '#1d9bf0',
  text: '#0f1419',
  muted: '#536471',
  action: '#536471',
  border: '#cfd9de',
  surface: '#f7f9f9',
  /** X's own red, for the over-length marker on a thread post. */
  danger: '#f4212e',
} as const

export const THREADS = {
  text: '#000000',
  muted: '#999999',
  surface: '#fafafa',
  dot: '#000000',
  dotMuted: '#d1d1d1',
  /** Meta's red, for the over-length marker on a post of a thread. */
  danger: '#ff3040',
} as const

// YouTube is a watch page rather than a feed card, so it needs two more
// values than the others: the chip fill behind its pill buttons and the
// description panel, and the near-black its Subscribe button uses.
export const YOUTUBE = {
  text: '#0f0f0f',
  muted: '#606060',
  chip: '#f2f2f2',
  subscribe: '#0f0f0f',
  brand: '#ff0000',
} as const
