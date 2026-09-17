// Per-platform media constraints, owned on the front end.
//
// The backend carries its own `image_constraints` / `pdf_constraints` per
// platform row and returns them on `GET /api/platforms`, but several of the
// seeded values disagree with what the platforms (and Zernio) actually
// accept — e.g. the seed lets Instagram carry 20 carousel images where the
// API caps it at 10, and lets Facebook carry 30 MB where ~4 MB is the
// practical ceiling. Until those are reconciled server-side the editor
// checks against this table, which is sourced from Zernio's per-platform
// docs (docs.zernio.com/platforms/*).
//
// FOLLOW-UP: verify each row against the live platform APIs and move the
// authoritative copy back to the platform rows, then delete this file.
//
// CON-292 did not close that. It made the platform catalogue operator-editable
// but left the existing rows' constraint jsonb untouched, so the disagreements
// above still stand and this table still wins — which now has a second cost:
// lowering Instagram's image cap in Harbor changes nothing the editor checks.
// The three platforms CON-292 seeded are the exception and are carried here
// verbatim from that migration, whose values were verified against
// docs.zernio.com on 2026-09-10 — the same source this table is drawn from.
//
// Video is deliberately absent, for the opposite reason: its rules were
// seeded by CON-148 from the same Zernio docs this table is sourced from, so
// there is nothing to override. `lib/platformVideo.ts` reads them off
// `GET /api/platforms` and applies Ogen's own ingest budget on top.
//
// Keyed by `zernio_id` — see `platformDictionary.ts`.

export type ImageMediaConstraints = {
  maxFileSizeBytes: number
  /**
   * Separate ceiling for GIFs, where a platform treats them as their own kind
   * of upload rather than as a large image. Absent means the still-image
   * limit applies to them too.
   */
  maxGifFileSizeBytes?: number
  /** MIME types the platform accepts for images. */
  allowedMimes: string[]
  animatedGifSupported: boolean
  /** Hard cap on images in one post, whatever the post type asks for. */
  maxPerPost: number
}

export type DocumentMediaConstraints = {
  maxFileSizeBytes: number
  allowedMimes: string[]
  maxPages: number
  maxPerPost: number
}

export type PlatformMediaConstraints = {
  image?: ImageMediaConstraints
  /** Only LinkedIn publishes documents (its "carousel" is a PDF). */
  document?: DocumentMediaConstraints
}

const MB = 1024 * 1024

const PLATFORM_MEDIA: Record<string, PlatformMediaConstraints> = {
  // LinkedIn — up to 20 images per post; the carousel format is a PDF
  // document, not a multi-image post.
  linkedin: {
    image: {
      maxFileSizeBytes: 8 * MB,
      allowedMimes: ['image/jpeg', 'image/png', 'image/gif'],
      animatedGifSupported: false,
      maxPerPost: 20,
    },
    document: {
      maxFileSizeBytes: 100 * MB,
      allowedMimes: ['application/pdf'],
      maxPages: 300,
      maxPerPost: 1,
    },
  },
  // Facebook — WebP is converted to JPEG on the way in; 4 MB is the size
  // Facebook rejects above in practice, well under its documented limit.
  facebook: {
    image: {
      maxFileSizeBytes: 4 * MB,
      allowedMimes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
      animatedGifSupported: true,
      maxPerPost: 10,
    },
  },
  // X — 1 MB per still image, strictly enforced by Zernio; GIFs are a
  // separate upload path and go to 15 MB. The 5 MB that used to sit here
  // matched neither, and matched the (equally wrong) seeded platform row, so
  // an oversized image passed both checks and only failed at publish.
  //
  // NOT ENFORCED: one animated GIF consumes all four image slots, so a GIF
  // plus three images passes here and Zernio rejects it. Expressing that
  // needs a per-kind slot cost these constraints have no room for — CON-123.
  twitter: {
    image: {
      maxFileSizeBytes: 1 * MB,
      maxGifFileSizeBytes: 15 * MB,
      allowedMimes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
      animatedGifSupported: true,
      maxPerPost: 4,
    },
  },
  // Threads — carousels cap at 10; images are auto-compressed above 8 MB.
  threads: {
    image: {
      maxFileSizeBytes: 8 * MB,
      allowedMimes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
      animatedGifSupported: true,
      maxPerPost: 10,
    },
  },
  // Instagram — JPEG/PNG only, carousels cap at 10, and every slide is
  // cropped to the first slide's aspect ratio.
  instagram: {
    image: {
      maxFileSizeBytes: 8 * MB,
      allowedMimes: ['image/jpeg', 'image/png'],
      animatedGifSupported: false,
      maxPerPost: 10,
    },
  },
  // The three below agree with their seeded rows rather than correcting them —
  // see the CON-292 paragraph in the header. They are copied here anyway because
  // an absent entry means *no image checks at all*, which is a worse answer than
  // a duplicated one.
  //
  // TikTok — photo carousels go to 35 images, which is far and away the widest
  // any platform allows.
  tiktok: {
    image: {
      maxFileSizeBytes: 20 * MB,
      allowedMimes: ['image/jpeg', 'image/png', 'image/webp'],
      animatedGifSupported: false,
      maxPerPost: 35,
    },
  },
  // Pinterest — one image per pin; there is no carousel format.
  pinterest: {
    image: {
      maxFileSizeBytes: 32 * MB,
      allowedMimes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
      animatedGifSupported: true,
      maxPerPost: 1,
    },
  },
  // Reddit — a gallery takes 2–20 images; a single image post is the same
  // upload with one.
  reddit: {
    image: {
      maxFileSizeBytes: 20 * MB,
      allowedMimes: ['image/jpeg', 'image/png', 'image/gif'],
      animatedGifSupported: true,
      maxPerPost: 20,
    },
  },
}

/**
 * The media rules for a network, by `zernio_id`.
 *
 * Empty for a platform with no entry — which, since this table gates the
 * editor's image checks, means *unchecked* rather than *unlimited*. Anything
 * added to `lib/platformDictionary` needs a row here too; see
 * `docs/platform-support.md`.
 */
export function getPlatformMedia(zernioId: string): PlatformMediaConstraints {
  return PLATFORM_MEDIA[zernioId] ?? {}
}

/**
 * The size ceiling for one file, which is not always the platform's headline
 * number — see `maxGifFileSizeBytes`.
 */
export function imageSizeLimit(
  c: ImageMediaConstraints,
  mimeType: string,
): number {
  if (mimeType === 'image/gif' && c.maxGifFileSizeBytes !== undefined) {
    return c.maxGifFileSizeBytes
  }
  return c.maxFileSizeBytes
}

export function formatBytes(bytes: number): string {
  if (bytes >= MB) {
    const mb = bytes / MB
    return `${mb % 1 === 0 ? mb : mb.toFixed(1)} MB`
  }
  return `${Math.max(1, Math.round(bytes / 1024))} KB`
}

/** "JPEG, PNG · up to 8 MB · max 10" — the hint under the dropzone. */
export function describeImageConstraints(c: ImageMediaConstraints): string {
  const formats = c.allowedMimes
    .map((m) => m.replace('image/', '').toUpperCase())
    .join(', ')
  // The GIF ceiling is called out only where it differs, so the common case
  // keeps the short hint. Silently showing the still-image number would read
  // as a limit on GIFs that is off by an order of magnitude.
  const gif =
    c.maxGifFileSizeBytes !== undefined &&
    c.maxGifFileSizeBytes !== c.maxFileSizeBytes
      ? ` (GIF up to ${formatBytes(c.maxGifFileSizeBytes)})`
      : ''
  return `${formats} · up to ${formatBytes(c.maxFileSizeBytes)}${gif} · max ${c.maxPerPost} per post`
}
