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

import type { Platform, PlatformPublisher, PublisherAccount } from "@/types/campaigns";

export type PlatformPostType = {
  slug: string;
  label: string;
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

export function unionSupportedSlugs(
  publishers: { supported_post_types: string[] }[],
): Set<string> {
  const out = new Set<string>();
  for (const p of publishers) for (const slug of p.supported_post_types) out.add(slug);
  return out;
}

export function partitionPostTypesBySupport(
  postTypes: PlatformPostType[],
  supportedSlugs: Set<string>,
): { supported: PlatformPostType[]; unsupported: PlatformPostType[] } {
  const supported: PlatformPostType[] = [];
  const unsupported: PlatformPostType[] = [];
  for (const pt of postTypes) {
    (supportedSlugs.has(pt.slug) ? supported : unsupported).push(pt);
  }
  return { supported, unsupported };
}

// A resolved view of a platform: the dictionary metadata joined with the
// publisher state from the API. The post-type universe is bounded by what
// at least one publisher supports — dictionary-only entries are excluded.
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

export function buildPlatformView(
  platform: Platform,
  info: PlatformInfo,
): PlatformView {
  const publishers = platform.publishers ?? [];
  const connectedPublishers = publishers.filter((p) => p.connected);
  const allowedSlugs = unionSupportedSlugs(publishers);
  const availableSlugs = unionSupportedSlugs(connectedPublishers);
  const allowed = info.postTypes.filter((pt) => allowedSlugs.has(pt.slug));
  const available = allowed.filter((pt) => availableSlugs.has(pt.slug));
  const unavailable = allowed.filter((pt) => !availableSlugs.has(pt.slug));
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

export function getPostTypeLabel(platformId: string, slug: string): string {
  return (
    getPlatformInfo(platformId)?.postTypes.find((pt) => pt.slug === slug)
      ?.label ?? slug
  );
}
