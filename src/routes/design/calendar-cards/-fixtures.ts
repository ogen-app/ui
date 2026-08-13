import type { Post, PostStatus } from '@/types/posts'
import type { Platform } from '@/types/campaigns'

/*
 * Fixtures for the calendar-card harness. Everything here is inert data — no
 * request, no cache, no clock — so the page renders identically on every load
 * and with the API down. That is the whole point of the harness: a card state
 * you can only reach by waiting for a publish to fail is one nobody ever
 * looks at.
 */

/** Platform ids, straight out of `lib/platformDictionary`. */
export const PLATFORM = {
  linkedin: 'AXqWG7U2qnpt',
  youtube: '8S8bWQTG6qD',
  facebook: 'zBU1zqVICGfk',
  x: '81mUCmc2xsKd',
  threads: 'pQ4yxT3SuE57',
  instagram: 'rzgpTkARLH0L',
  /** A post that has not picked one yet — not an unknown id. */
  none: '',
} as const

/** The day every fixture sits on, so the harness never moves under you. */
const DAY = '2026-08-12'
const FIXED_ISO = `${DAY}T08:00:00.000Z`

/**
 * A wall-clock time on the fixture day, as the wire would carry it.
 * Built local-then-UTC because that is the round trip the cards make:
 * `new Date(iso).toLocaleTimeString()` lands back on the hour written here.
 */
export function at(hhmm: string): string {
  return new Date(`${DAY}T${hhmm}:00`).toISOString()
}

let seq = 0

/**
 * One post. Every field the type demands, defaulted to the most ordinary
 * value it can hold, so a specimen names only the thing it is about.
 *
 * The default is deliberately a *clean* card — a scheduled draft on a platform
 * with a post type and no account to be ambiguous about — because every
 * problem state in this harness is that card plus one broken field.
 */
export function post(overrides: Partial<Post> = {}): Post {
  seq += 1
  return {
    id: `fixture-${seq}`,
    campaign_id: 'fixture-campaign',
    platform_id: PLATFORM.linkedin,
    platform_post_type: 'text-post',
    social_account_id: '',
    title: 'Roadmap teaser',
    content: '',
    media_urls: [],
    scheduled_at: at('09:30'),
    published_at: null,
    status: 'draft',
    cta_type: 'none',
    cta_url: '',
    target_audience_notes: '',
    used_asset_ids: [],
    campaign_type_phase_id: null,
    created_by: 'fixture',
    created_at: FIXED_ISO,
    updated_at: FIXED_ISO,
    campaign: null,
    platform: null,
    used_assets: [],
    campaign_type_phase: null,
    ...overrides,
  }
}

/** Every status, in lifecycle order rather than the type's declaration order. */
export const STATUSES: PostStatus[] = [
  'draft',
  'ready_for_publish',
  'scheduled',
  'scheduled_for_manual_publishing',
  'published',
  'failed',
  'not_published',
]

/*
 * Title lengths that straddle `titleSize`'s two thresholds (30 and 48
 * characters), plus the two ends: nothing at all, and more than two lines of
 * any size can hold.
 */
export const TITLES = {
  short: 'Roadmap teaser', // 14
  medium: 'Quarterly roadmap teaser for the launch', // 39
  long: 'Why we rebuilt the scheduling pipeline from scratch this quarter', // 64
  overflowing:
    'Why we rebuilt the scheduling pipeline from scratch this quarter, what it cost us in review cycles, and the three things we would do differently',
  empty: '',
} as const

/**
 * Stand-in media: real photographs, from `public/temp`.
 *
 * These were flat SVG swatches — a fill, a cross and a label — which was
 * defensible while the question was only "does the fade reach the card's own
 * colour without a seam". It stopped being defensible once the rows started
 * sitting *on* the picture, because the thing that makes 11px grey unreadable
 * is not a tone, it is detail: a swatch has one value everywhere and a
 * photograph has a highlight exactly where a letter is. A fade tuned against
 * flat fills is tuned against the easy case.
 *
 * They are files rather than data URIs, which is the one thing the harness gave
 * up here — it still needs no API, but it does now need the dev server to be
 * serving `public/`. Fixture *content* either way, so the colours in them are
 * nobody's tokens.
 *
 * `public/temp` is demo material and is not committed; a missing file shows as
 * a plain card, which is a legible failure rather than a broken harness.
 */
export const MEDIA = {
  /** Pale sky over water — the easy case, and the one the fade disappears in. */
  pale: '/temp/03.jpg',
  /** A saturated mid-tone: the ordinary photograph, not the worst case. */
  vivid: '/temp/02.jpg',
  /** Near-black under a warm blur. The longest journey to the card's pale
   *  fill, so if the join shows anywhere it shows here — and the hardest
   *  ground for the first row to be legible on. */
  dark: '/temp/01.jpg',
  /** A face, mid-tone, with a subject that the crop can behead — the picture
   *  most likely to be the reason someone recognises the post. */
  portrait: '/temp/04.jpg',
  /** Wider than the card, so the sides go rather than the top and bottom. */
  landscape: '/temp/05.jpg',
  /** Pale at the top, dark at the bottom: the fade crosses the whole range
   *  inside one card, which is where a curve and a straight line look least
   *  alike. */
  split: '/temp/07.jpg',
  /** Fine repeating structure — the case where a wash reads as blur rather
   *  than as a fade. */
  detailed: '/temp/06.jpg',
} as const

/*
 * Two connected accounts on one platform, seeded into the platforms query so
 * the account states are real rather than described.
 *
 * With no platforms loaded — the harness's natural state — a post resolves to
 * zero accounts, which is neither ambiguous nor mismatched, so every other
 * specimen stays clean. Ambiguity needs *two* accounts to exist, and it is
 * parked on YouTube precisely because nothing else in the harness publishes
 * there. `resolvePublishingAccount` is the rule; this is its input.
 */
export const ACCOUNT_A = 'acct-ogen-main'
export const ACCOUNT_GONE = 'acct-disconnected-last-march'

const account = (id: string, name: string) => ({
  id,
  username: name.toLowerCase().replace(/\s+/g, ''),
  display_name: name,
  avatar_url: '',
  is_active: true,
  connected_at: FIXED_ISO,
})

/**
 * Only `id` and `publishers` are read (`buildPlatformViews` →
 * `connectedAccounts`), so the rest of the row is not worth fabricating.
 */
export const SEEDED_PLATFORMS = [
  {
    id: PLATFORM.youtube,
    publishers: [
      {
        id: 'zernio',
        name: 'Zernio',
        state: 'connected',
        connected: true,
        supported_post_types: ['video', 'short'],
        accounts: [account(ACCOUNT_A, 'Ogen Main'), account('acct-ogen-labs', 'Ogen Labs')],
      },
    ],
  },
] as unknown as Platform[]
