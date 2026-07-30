// Local mapping of platform IDs (sqids from the backend) to user-facing
// display info. The API is queried for IDs, publishers, cadence, and
// constraints, but display names and post-type labels live here so we
// fully control the wording the user sees.
//
// It is also, for now, where two product gates are enforced: YouTube is
// hidden and video post types are withheld, because Ogen has no video
// pipeline. Both are front-end-only — the API still offers them to anyone
// who asks — so they are a display gate, not a rule. CON-145 moves them
// server-side, after which the `hidden` and `video` flags can go.

import type { Icon } from "@phosphor-icons/react";
import { FacebookLogoIcon, InstagramLogoIcon, LinkedinLogoIcon, ThreadsLogoIcon, XLogoIcon, YoutubeLogoIcon } from "@phosphor-icons/react";

import type { Platform, PlatformPublisher } from "@/types/campaigns";

export type PlatformPostType = {
  slug: string;
  label: string;
  // A video-first format. Ogen has no video pipeline — nothing uploads,
  // stores or publishes one — so picking these produced a post that could
  // never leave Draft. Hidden from every picker rather than offered and then
  // explained. See the note on `hidden` below; CON-145 moves both gates to
  // the server, where they actually bind.
  video?: true;
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
  // Kept out of every platform picker. YouTube is video end to end, so with
  // no video pipeline there is nothing it could publish — offering it is an
  // invitation to build a campaign that dead-ends. The entry stays in the
  // table so posts and campaigns that already point at it still render a
  // name and a logo instead of a blank.
  hidden?: true;
  postTypes: PlatformPostType[];
};

const ALL_PLATFORMS: PlatformInfo[] = [
  {
    id: "AXqWG7U2qnpt",
    name: "LinkedIn",
    icon: LinkedinLogoIcon,
    color: "#0A66C2",
    zernioId: "linkedin",
    postTypes: [
      { slug: "text-post", label: "Text post" },
      { slug: "image-post", label: "Image post" },
      { slug: "carousel", label: "Carousel" },
      { slug: "video", label: "Video", video: true },
      { slug: "article", label: "Article" },
      { slug: "poll", label: "Poll" },
      { slug: "newsletter", label: "Newsletter" },
      { slug: "event", label: "Event" },
      { slug: "live-video", label: "Live video", video: true },
    ],
  },
  {
    id: "8S8bWQTG6qD",
    name: "YouTube",
    icon: YoutubeLogoIcon,
    color: "#FF0000",
    zernioId: "youtube",
    hidden: true,
    postTypes: [
      { slug: "video", label: "Video", video: true },
      { slug: "short", label: "Short", video: true },
      { slug: "live-stream", label: "Live stream", video: true },
      { slug: "premiere", label: "Premiere", video: true },
      { slug: "community-post", label: "Community post" },
      { slug: "podcast", label: "Podcast", video: true },
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
      { slug: "video", label: "Video", video: true },
      { slug: "reel", label: "Reel", video: true },
      { slug: "story", label: "Story" },
      { slug: "live-video", label: "Live video", video: true },
      { slug: "carousel", label: "Carousel" },
      { slug: "poll", label: "Poll" },
      { slug: "event", label: "Event" },
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
      { slug: "video", label: "Video", video: true },
      { slug: "long-form-post", label: "Long-form post" },
      { slug: "poll", label: "Poll" },
      { slug: "space", label: "Space" },
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
      { slug: "video", label: "Video", video: true },
      { slug: "poll", label: "Poll" },
      { slug: "gif-post", label: "GIF post" },
    ],
  },
  {
    id: "rzgpTkARLH0L",
    name: "Instagram",
    icon: InstagramLogoIcon,
    color: "#E4405F",
    zernioId: "instagram",
    postTypes: [
      { slug: "image-post", label: "Image post" },
      { slug: "carousel", label: "Carousel" },
      { slug: "reel", label: "Reel", video: true },
      { slug: "story", label: "Story" },
      { slug: "live-video", label: "Live video", video: true },
      { slug: "broadcast-channel", label: "Broadcast channel" },
      { slug: "collaborative-post", label: "Collaborative post" },
      { slug: "guide", label: "Guide" },
    ],
  },
];

// What the app offers. Every picker reads this; `ALL_PLATFORMS` stays private
// so a hidden platform cannot be selected back into existence by accident.
export const PLATFORMS: PlatformInfo[] = ALL_PLATFORMS.filter((p) => !p.hidden);

// Resolution is deliberately wider than selection: a post created before
// YouTube was hidden still has to render as "YouTube", not as a blank row.
const BY_ID: Map<string, PlatformInfo> = new Map(ALL_PLATFORMS.map((p) => [p.id, p]));

export function getPlatformInfo(id: string): PlatformInfo | undefined {
  return BY_ID.get(id);
}

/** True for a platform we resolve for display but never offer. */
export function isHiddenPlatform(id: string): boolean {
  return BY_ID.get(id)?.hidden === true;
}

/**
 * The post types a user may pick. The one place the video gate is applied —
 * everything downstream (campaign settings, the quick bar, the post-type
 * select, the readiness rules) reads its universe from here or from
 * `PlatformView`, which is built on it.
 */
export function selectablePostTypes(info: PlatformInfo): PlatformPostType[] {
  return info.postTypes.filter((pt) => !pt.video);
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
  // Zernio supports video on most of these platforms; Ogen does not, so the
  // publisher's list is intersected with what we can actually produce.
  const allowed = selectablePostTypes(info).filter((pt) => allowedSlugs.has(pt.slug));
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

export function buildPlatformViews(platforms: Platform[]): PlatformView[] {
  return platforms.flatMap((platform) => {
    const info = getPlatformInfo(platform.id);
    // `GET /api/platforms` still returns YouTube (CON-145) — dropping it here
    // is what keeps it out of campaign settings and workspace settings, both
    // of which render whatever views they are handed.
    return info && !info.hidden ? [buildPlatformView(platform, info)] : [];
  });
}

export function getPostTypeLabel(platformId: string, slug: string): string {
  return (
    getPlatformInfo(platformId)?.postTypes.find((pt) => pt.slug === slug)
      ?.label ?? slug
  );
}
