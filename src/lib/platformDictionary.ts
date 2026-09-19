// The platforms this build supports, keyed by Zernio's wire slug.
//
// The API is queried for rows, publishers, cadence and constraints, but display
// names, marks and post-type labels live here so we fully control the wording
// and the look. Since CON-292 the catalogue itself is the operator's — rows are
// added and enabled in Harbor, not in a migration we ship — so this table is
// what decides whether the app can *render* one of them.
//
// It is deliberately a gate and not a fallback. A platform this build has never
// heard of is not half-supported: it would reach the app with no mark, no
// preview frame, no caption fold, no media rules and no analytics mapping, and
// would be broken in five places at once rather than merely plain. So
// `buildPlatformViews` drops an unknown row (and says so in dev), and the way to
// launch a network is to ship its support here first and have an operator flip
// `enabled` after — a one-toggle launch, no deploy. `docs/platform-support.md`
// is the checklist of what "support" means.
//
// **Keyed by `zernio_id`, never by sqid.** A row's sqid is minted by the server,
// so for a platform an operator creates it is unknowable at build time; filing
// this table under it is what used to make pre-built support undiscoverable. The
// rest of the app already agreed — preview renderers, `PLATFORM_FOLDS`, the
// auto-publish allowlist, connect links and `supportsSequence` are all keyed by
// slug — so this was the last table out of step.
//
// `postTypes` lists only the slugs a publisher can actually send. The
// platforms table seeds a far wider vocabulary — 46 slugs, including polls,
// events, live video, Spaces, Guides — and none of them can leave Ogen: no
// publisher implements them, so `buildPlatformView` filtered every one out of
// `allowed` and they reached the user only as the editor's "N other post
// types" line, advertising formats nothing can publish.
//
// So the dictionary is the set we can *render and publish*, not the set the
// platform's API has. `allowed` still does the real filtering — it is what
// varies by deployment and by which publishers are configured — and this list
// bounds it to the slugs that have a label, a preview and a server-side rule.
// Adding a format back means adding it in all three places, which is the work
// it actually takes.

import type { Icon } from '@phosphor-icons/react'
import {
  FacebookLogoIcon,
  InstagramLogoIcon,
  LinkedinLogoIcon,
  PinterestLogoIcon,
  RedditLogoIcon,
  ThreadsLogoIcon,
  TiktokLogoIcon,
  XLogoIcon,
  YoutubeLogoIcon,
} from '@phosphor-icons/react'

import { isFeatureEnabled, type FeatureFlag } from '@/config/featureFlags'
import type {
  Platform,
  PlatformPublisher,
  PublisherAccount,
} from '@/types/campaigns'

export type PlatformPostType = {
  slug: string
  label: string
  /**
   * A post type this build has written but not released. Both readers drop it
   * while the flag is off — `buildPlatformView` for anything asking what can
   * publish, `releasedPostTypes` for the editor's picker — so it reaches no
   * menu and no editor: the same gate every other half-built feature goes
   * through, applied to the one thing a platform's vocabulary can be
   * half-built in.
   *
   * Only for types that are *new*. A type the app already offered must not
   * acquire one: withdrawing it would change how the app behaves with the flag
   * off, which is the one thing a flag may never do.
   */
  flag?: FeatureFlag
}

export type PlatformInfo = {
  // Zernio's wire identifier for this platform (e.g. "twitter" for X) — the
  // value POST /api/integrations/zernio/connect-links expects, the `zernio_id`
  // column on the platform row, and the key this whole table is filed under.
  //
  // There is deliberately no sqid here. The row carries it, and it is the
  // server's to mint; see the file header.
  zernioId: string
  name: string
  icon: Icon
  // Official brand color, hard-coded so the icon renders in its native hue
  // wherever it appears across the app.
  color: string
  postTypes: PlatformPostType[]
}

export const PLATFORMS: PlatformInfo[] = [
  {
    zernioId: 'linkedin',
    name: 'LinkedIn',
    icon: LinkedinLogoIcon,
    color: '#0A66C2',
    postTypes: [
      { slug: 'text-post', label: 'Text post' },
      { slug: 'image-post', label: 'Image post' },
      // LinkedIn's carousel is a PDF document, not a run of images — the one
      // place the slug means something different from Instagram and Threads.
      { slug: 'carousel', label: 'Carousel' },
      { slug: 'video', label: 'Video' },
      { slug: 'article', label: 'Article' },
    ],
  },
  {
    zernioId: 'youtube',
    name: 'YouTube',
    icon: YoutubeLogoIcon,
    color: '#FF0000',
    postTypes: [
      { slug: 'video', label: 'Video' },
      { slug: 'short', label: 'Short' },
    ],
  },
  {
    zernioId: 'facebook',
    name: 'Facebook',
    icon: FacebookLogoIcon,
    color: '#1877F2',
    postTypes: [
      { slug: 'text-post', label: 'Text post' },
      { slug: 'image-post', label: 'Image post' },
      { slug: 'video', label: 'Video' },
      { slug: 'reel', label: 'Reel' },
      { slug: 'link-post', label: 'Link post' },
    ],
  },
  {
    zernioId: 'twitter',
    name: 'X (Twitter)',
    icon: XLogoIcon,
    color: '#000000',
    postTypes: [
      { slug: 'text-post', label: 'Text post' },
      { slug: 'image-post', label: 'Image post' },
      { slug: 'video', label: 'Video' },
      // Withdrawn for three weeks over CON-284's divider mismatch — the
      // composer writes `***` and the server's `isRuleLine` read hyphens, so
      // every authored break collapsed into one message. ogen#156 widened it
      // to the CommonMark thematic break and the type came back.
      { slug: 'thread', label: 'Thread' },
    ],
  },
  {
    zernioId: 'threads',
    name: 'Threads',
    icon: ThreadsLogoIcon,
    color: '#000000',
    postTypes: [
      { slug: 'text-post', label: 'Text post' },
      { slug: 'image-post', label: 'Image post' },
      { slug: 'carousel', label: 'Carousel' },
      { slug: 'video', label: 'Video' },
      // "Thread" and not "Sequence" on the network called Threads: a chain is
      // what Meta's own app calls a thread ("add to thread"), the same word X
      // uses, and one vocabulary across both beats one that reads better on a
      // single screen. Zernio takes the identical `threadItems` on both
      // (CON-196).
      //
      // The publisher declares the slug since CON-284, so the ordinary
      // publisher gate is the only one it needs — the stand-in that used to
      // answer in the publisher's place is gone with the vocabulary gap it
      // covered.
      { slug: 'thread', label: 'Thread' },
    ],
  },
  {
    zernioId: 'instagram',
    name: 'Instagram',
    icon: InstagramLogoIcon,
    color: '#E4405F',
    postTypes: [
      // No text-post: Instagram publishes nothing without media, and the
      // platforms table has never seeded the slug for it.
      { slug: 'image-post', label: 'Image post' },
      { slug: 'carousel', label: 'Carousel' },
      { slug: 'reel', label: 'Reel' },
      { slug: 'story', label: 'Story' },
    ],
  },
  // The three below are seeded `enabled = false` (CON-292 §19.2) and reach no
  // tenant until an operator turns one on. They are here rather than added with
  // the toggle because that is the order this table exists to enforce: support
  // ships first, the switch comes after. Labels are ours, not the seeded
  // `post_types` wording — a picker row is not the place for "(up to 35
  // images)".
  {
    zernioId: 'tiktok',
    name: 'TikTok',
    icon: TiktokLogoIcon,
    color: '#000000',
    postTypes: [
      { slug: 'video', label: 'Video' },
      { slug: 'image-post', label: 'Photo' },
      { slug: 'carousel', label: 'Photo carousel' },
    ],
  },
  {
    zernioId: 'pinterest',
    name: 'Pinterest',
    icon: PinterestLogoIcon,
    color: '#E60023',
    postTypes: [
      { slug: 'image-post', label: 'Image Pin' },
      { slug: 'video', label: 'Video Pin' },
    ],
  },
  {
    zernioId: 'reddit',
    name: 'Reddit',
    icon: RedditLogoIcon,
    color: '#FF4500',
    postTypes: [
      { slug: 'text-post', label: 'Text post' },
      { slug: 'link-post', label: 'Link post' },
      { slug: 'image-post', label: 'Image post' },
      { slug: 'carousel', label: 'Gallery' },
      { slug: 'video', label: 'Video' },
    ],
  },
]

const BY_ZERNIO_ID: Map<string, PlatformInfo> = new Map(
  PLATFORMS.map((p) => [p.zernioId, p]),
)

/**
 * The display metadata for one of Zernio's wire ids (`twitter`, `linkedin`, …),
 * or undefined for a network this build does not support.
 *
 * The one lookup into this table, and the only identifier it answers to. A sqid
 * names a *row*, not a network — start from `usePlatformCatalog().resolve` when
 * that is all you hold.
 */
export function getPlatformByZernioId(
  zernioId: string,
): PlatformInfo | undefined {
  return BY_ZERNIO_ID.get(zernioId)
}

function unionSupportedSlugs(
  publishers: { supported_post_types: string[] }[],
): Set<string> {
  const out = new Set<string>()
  for (const p of publishers)
    for (const slug of p.supported_post_types) out.add(slug)
  return out
}

// A resolved view of a platform: the dictionary metadata joined with the
// publisher state from the API. The post-type universe is bounded by what at
// least one publisher supports — dictionary-only entries are excluded, with no
// exceptions. There was one, for the stretch when this build knew `thread` on
// Threads and the publisher did not; CON-284 taught it the word, and the
// stand-in came out with the gap.
export type PlatformView = {
  platform: Platform
  info: PlatformInfo
  // post types supported by at least one publisher (connected or not)
  allowed: PlatformPostType[]
  // post types supported by at least one CONNECTED publisher
  available: PlatformPostType[]
  // allowed but not currently available (publisher exists, not connected)
  unavailable: PlatformPostType[]
  publishers: PlatformPublisher[]
  connectedPublishers: PlatformPublisher[]
  connectedPublisherName: string | null
}

export function buildPlatformView(
  platform: Platform,
  info: PlatformInfo,
): PlatformView {
  const publishers = platform.publishers ?? []
  const connectedPublishers = publishers.filter((p) => p.connected)
  const allowedSlugs = unionSupportedSlugs(publishers)
  const availableSlugs = unionSupportedSlugs(connectedPublishers)
  // Two gates, and they answer different questions. `pt.flag` is whether this
  // build has released the type at all; `allowedSlugs` is what a publisher can
  // send — deployment and configuration. The release gate comes first, because
  // an unreleased type has no business being asked about.
  const released = info.postTypes.filter(
    (pt) => !pt.flag || isFeatureEnabled(pt.flag),
  )
  const allowed = released.filter((pt) => allowedSlugs.has(pt.slug))
  const available = allowed.filter((pt) => availableSlugs.has(pt.slug))
  const unavailable = allowed.filter((pt) => !available.includes(pt))
  return {
    platform,
    info,
    allowed,
    available,
    unavailable,
    publishers,
    connectedPublishers,
    connectedPublisherName: connectedPublishers[0]?.name ?? null,
  }
}

/**
 * Every account connected for a platform, across every publisher.
 *
 * Not interchangeable with `connectedPublishers.length`, which is what this
 * replaced in several places: the server sets a publisher's `connected` from
 * `len(accounts) > 0`, so with Zernio as the only publisher that count is
 * 0 or 1 no matter how many accounts a platform holds. Anything asking "how
 * many accounts" — a caption, a did-the-new-one-land check, whether a choice
 * is required — has to count these instead (CON-150).
 */
export function connectedAccounts(view: PlatformView): PublisherAccount[] {
  return view.connectedPublishers.flatMap((p) => p.accounts)
}

/**
 * The rows this build can render, in the order the server sent them.
 *
 * A row whose `zernio_id` is not in `PLATFORMS` is dropped — see the file
 * header for why that is the design and not a gap. It is the one outcome here
 * that looks identical to a bug from the outside, so it is announced in dev:
 * the likeliest cause by far is a `zernio_id` in Harbor that does not match the
 * slug this build shipped support under, and that is a two-minute fix once
 * somebody can see it.
 */
export function buildPlatformViews(platforms: Platform[]): PlatformView[] {
  return platforms.flatMap((platform) => {
    const info = getPlatformByZernioId(platform.zernio_id)
    if (!info) {
      if (import.meta.env.DEV) {
        console.warn(
          `[platforms] ignoring "${platform.name}" (zernio_id "${platform.zernio_id}", id ${platform.id}): this build ships no support for it. Add it to PLATFORMS in lib/platformDictionary.ts — see docs/platform-support.md.`,
        )
      }
      return []
    }
    return [buildPlatformView(platform, info)]
  })
}

/**
 * A platform's post types, minus the ones this build has not released yet.
 *
 * The `flag` gate on its own. `buildPlatformView` applies it together with the
 * publisher gate, which is the right pair when the question is "can this go
 * out" — but the editor's picker asks a different one: the *campaign* decides
 * which types it offers, and a type no connected publisher supports is shown
 * as unconnected rather than hidden. That picker still must not offer an
 * unreleased type, so it takes the release gate by itself.
 */
export function releasedPostTypes(
  info: PlatformInfo | undefined,
): PlatformPostType[] {
  return (
    info?.postTypes.filter((pt) => !pt.flag || isFeatureEnabled(pt.flag)) ?? []
  )
}

export function getPostTypeLabel(
  info: PlatformInfo | undefined,
  slug: string,
): string {
  return info?.postTypes.find((pt) => pt.slug === slug)?.label ?? slug
}
