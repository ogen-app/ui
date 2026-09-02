// Local mapping of platform IDs (sqids from the backend) to user-facing
// display info. The API is queried for IDs, publishers, cadence, and
// constraints, but display names and post-type labels live here so we
// fully control the wording the user sees.
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

import type { Icon } from "@phosphor-icons/react";
import { FacebookLogoIcon, InstagramLogoIcon, LinkedinLogoIcon, ThreadsLogoIcon, XLogoIcon, YoutubeLogoIcon } from "@phosphor-icons/react";

import { isFeatureEnabled, type FeatureFlag } from "@/config/featureFlags";
import type { Platform, PlatformPublisher, PublisherAccount } from "@/types/campaigns";

export type PlatformPostType = {
  slug: string;
  label: string;
  /**
   * A post type this build has written but not released. Both readers drop it
   * while the flag is off — `buildPlatformView` for anything asking what can
   * publish, `releasedPostTypes` for the editor's picker — so it reaches no
   * menu and no editor: the same gate every other half-built feature goes
   * through, applied to the one thing a platform's vocabulary can be
   * half-built in.
   *
   * While it is *on* the flag also stands in for the publisher's vocabulary,
   * which is `aheadOfPublishers` below — a type the server has not learned to
   * name yet is exactly what running ahead behind a flag is for.
   *
   * Only for types that are *new*. A type the app already offered must not
   * acquire one: withdrawing it would change how the app behaves with the flag
   * off, which is the one thing a flag may never do.
   */
  flag?: FeatureFlag;
};

export type PlatformInfo = {
  id: string;
  name: string;
  icon: Icon;
  // Official brand color, hard-coded so the icon renders in its native hue
  // wherever it appears across the app.
  color: string;
  // Zernio's wire identifier for this platform (e.g. "twitter" for X) —
  // the value POST /api/integrations/zernio/connect-links expects. Mirrors
  // the backend allowlist in publishers/zernio/platforms.go.
  zernioId: string;
  postTypes: PlatformPostType[];
};

export const PLATFORMS: PlatformInfo[] = [
  {
    id: "AXqWG7U2qnpt",
    name: "LinkedIn",
    icon: LinkedinLogoIcon,
    color: "#0A66C2",
    zernioId: "linkedin",
    postTypes: [
      { slug: "text-post", label: "Text post" },
      { slug: "image-post", label: "Image post" },
      // LinkedIn's carousel is a PDF document, not a run of images — the one
      // place the slug means something different from Instagram and Threads.
      { slug: "carousel", label: "Carousel" },
      { slug: "video", label: "Video" },
      { slug: "article", label: "Article" },
    ],
  },
  {
    id: "8S8bWQTG6qD",
    name: "YouTube",
    icon: YoutubeLogoIcon,
    color: "#FF0000",
    zernioId: "youtube",
    postTypes: [
      { slug: "video", label: "Video" },
      { slug: "short", label: "Short" },
    ],
  },
  {
    id: "zBU1zqVICGfk",
    name: "Facebook",
    icon: FacebookLogoIcon,
    color: "#1877F2",
    zernioId: "facebook",
    postTypes: [
      { slug: "text-post", label: "Text post" },
      { slug: "image-post", label: "Image post" },
      { slug: "video", label: "Video" },
      { slug: "reel", label: "Reel" },
      { slug: "link-post", label: "Link post" },
    ],
  },
  {
    id: "81mUCmc2xsKd",
    name: "X (Twitter)",
    icon: XLogoIcon,
    color: "#000000",
    zernioId: "twitter",
    postTypes: [
      { slug: "text-post", label: "Text post" },
      { slug: "image-post", label: "Image post" },
      { slug: "video", label: "Video" },
      { slug: "thread", label: "Thread" },
    ],
  },
  {
    id: "pQ4yxT3SuE57",
    name: "Threads",
    icon: ThreadsLogoIcon,
    color: "#000000",
    zernioId: "threads",
    postTypes: [
      { slug: "text-post", label: "Text post" },
      { slug: "image-post", label: "Image post" },
      { slug: "carousel", label: "Carousel" },
      { slug: "video", label: "Video" },
      // "Thread" and not "Sequence" on the network called Threads: a chain is
      // what Meta's own app calls a thread ("add to thread"), the same word X
      // uses, and one vocabulary across both beats one that reads better on a
      // single screen. Zernio takes the identical `threadItems` on both
      // (CON-196).
      //
      // Flagged where X's is not, because this one is new: X has offered
      // `thread` all along and taking it away would be a change with the flag
      // off. The flag is also the *only* gate this one has, because
      // `supportedPlatforms` in the Go repo lists `thread` for `twitter` only
      // — so the publisher will not report it here until the slug lands, and
      // `aheadOfPublishers` lets the flag answer in its place rather than
      // hiding the feature from the network it is named after.
      { slug: "thread", label: "Thread", flag: "thread-sequence" },
    ],
  },
  {
    id: "rzgpTkARLH0L",
    name: "Instagram",
    icon: InstagramLogoIcon,
    color: "#E4405F",
    zernioId: "instagram",
    postTypes: [
      // No text-post: Instagram publishes nothing without media, and the
      // platforms table has never seeded the slug for it.
      { slug: "image-post", label: "Image post" },
      { slug: "carousel", label: "Carousel" },
      { slug: "reel", label: "Reel" },
      { slug: "story", label: "Story" },
    ],
  },
];

const BY_ID: Map<string, PlatformInfo> = new Map(PLATFORMS.map((p) => [p.id, p]));

export function getPlatformInfo(id: string): PlatformInfo | undefined {
  return BY_ID.get(id);
}

const BY_ZERNIO_ID: Map<string, PlatformInfo> = new Map(
  PLATFORMS.map((p) => [p.zernioId, p]),
);

/**
 * The platform behind one of Zernio's wire ids (`twitter`, `linkedin`, …).
 *
 * The connect flow speaks Zernio's vocabulary end to end — it is what
 * `connect-links` takes, what the backend redirects back with, and what the
 * pending connection reports — so the surfaces that meet it need a way home to
 * our own name and mark. Undefined for a platform Zernio supports and we don't
 * yet name, which callers should render as the raw id rather than nothing.
 */
export function getPlatformByZernioId(zernioId: string): PlatformInfo | undefined {
  return BY_ZERNIO_ID.get(zernioId);
}

function unionSupportedSlugs(
  publishers: { supported_post_types: string[] }[],
): Set<string> {
  const out = new Set<string>();
  for (const p of publishers) for (const slug of p.supported_post_types) out.add(slug);
  return out;
}

// A resolved view of a platform: the dictionary metadata joined with the
// publisher state from the API. The post-type universe is bounded by what at
// least one publisher supports — dictionary-only entries are excluded, with
// the one deliberate exception `aheadOfPublishers` names.
export type PlatformView = {
  platform: Platform;
  info: PlatformInfo;
  // post types supported by at least one publisher (connected or not)
  allowed: PlatformPostType[];
  // post types supported by at least one CONNECTED publisher
  available: PlatformPostType[];
  // allowed but not currently available (publisher exists, not connected)
  unavailable: PlatformPostType[];
  publishers: PlatformPublisher[];
  connectedPublishers: PlatformPublisher[];
  connectedPublisherName: string | null;
};

/**
 * Whether a released-but-flagged type may stand in for a slug no publisher has
 * declared.
 *
 * A flag means this build is ahead of the API — and on Threads the publisher's
 * *vocabulary* is part of what the API cannot back yet: `supportedPlatforms` in
 * the Go repo lists `thread` for `twitter` only. Intersecting with it would
 * hide the feature from a network it was written for, which is the opposite of
 * what running ahead behind a flag is for. So while the flag is on, the
 * platform's own state answers in the slug's place: a publisher exists, so the
 * type is allowed; that publisher is connected, so it is available.
 *
 * Narrow on purpose. It costs nothing with the flag off — `released` has
 * already dropped the type by then — and it never touches an unflagged one, so
 * a slug the server has genuinely withdrawn still disappears from the app.
 */
function aheadOfPublishers(pt: PlatformPostType): boolean {
  return pt.flag !== undefined;
}

export function buildPlatformView(
  platform: Platform,
  info: PlatformInfo,
): PlatformView {
  const publishers = platform.publishers ?? [];
  const connectedPublishers = publishers.filter((p) => p.connected);
  const allowedSlugs = unionSupportedSlugs(publishers);
  const availableSlugs = unionSupportedSlugs(connectedPublishers);
  // Two gates, and they answer different questions. `pt.flag` is whether this
  // build has released the type at all; `allowedSlugs` is what a publisher can
  // send — deployment and configuration. The release gate comes first, because
  // an unreleased type has no business being asked about.
  const released = info.postTypes.filter(
    (pt) => !pt.flag || isFeatureEnabled(pt.flag),
  );
  const allowed = released.filter(
    (pt) =>
      allowedSlugs.has(pt.slug) ||
      (aheadOfPublishers(pt) && publishers.length > 0),
  );
  const available = allowed.filter(
    (pt) =>
      availableSlugs.has(pt.slug) ||
      (aheadOfPublishers(pt) && connectedPublishers.length > 0),
  );
  const unavailable = allowed.filter((pt) => !available.includes(pt));
  return {
    platform,
    info,
    allowed,
    available,
    unavailable,
    publishers,
    connectedPublishers,
    connectedPublisherName: connectedPublishers[0]?.name ?? null,
  };
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
  return view.connectedPublishers.flatMap((p) => p.accounts);
}

export function buildPlatformViews(platforms: Platform[]): PlatformView[] {
  return platforms.flatMap((platform) => {
    const info = getPlatformInfo(platform.id);
    return info ? [buildPlatformView(platform, info)] : [];
  });
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
export function releasedPostTypes(platformId: string): PlatformPostType[] {
  return (
    getPlatformInfo(platformId)?.postTypes.filter(
      (pt) => !pt.flag || isFeatureEnabled(pt.flag),
    ) ?? []
  );
}

export function getPostTypeLabel(platformId: string, slug: string): string {
  return (
    getPlatformInfo(platformId)?.postTypes.find((pt) => pt.slug === slug)
      ?.label ?? slug
  );
}
