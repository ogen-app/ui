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
// Video is deliberately absent — Ogen does not handle video yet, so the
// video-only platform (YouTube) has no entry and its post types never
// reach the attachment UI.
//
// Keyed by platform Sqid — see `platformDictionary.ts`.

export type ImageMediaConstraints = {
  maxFileSizeBytes: number
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

export const PLATFORM_MEDIA: Record<string, PlatformMediaConstraints> = {
  // LinkedIn — up to 20 images per post; the carousel format is a PDF
  // document, not a multi-image post.
  AXqWG7U2qnpt: {
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
  zBU1zqVICGfk: {
    image: {
      maxFileSizeBytes: 4 * MB,
      allowedMimes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
      animatedGifSupported: true,
      maxPerPost: 10,
    },
  },
  // X — one animated GIF consumes all four image slots.
  '81mUCmc2xsKd': {
    image: {
      maxFileSizeBytes: 5 * MB,
      allowedMimes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
      animatedGifSupported: true,
      maxPerPost: 4,
    },
  },
  // Threads — carousels cap at 10; images are auto-compressed above 8 MB.
  pQ4yxT3SuE57: {
    image: {
      maxFileSizeBytes: 8 * MB,
      allowedMimes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
      animatedGifSupported: true,
      maxPerPost: 10,
    },
  },
  // Instagram — JPEG/PNG only, carousels cap at 10, and every slide is
  // cropped to the first slide's aspect ratio.
  rzgpTkARLH0L: {
    image: {
      maxFileSizeBytes: 8 * MB,
      allowedMimes: ['image/jpeg', 'image/png'],
      animatedGifSupported: false,
      maxPerPost: 10,
    },
  },
}

export function getPlatformMedia(platformId: string): PlatformMediaConstraints {
  return PLATFORM_MEDIA[platformId] ?? {}
}

/**
 * `accept` attribute for the file picker: every MIME the platform takes,
 * or all supported kinds when no platform is selected yet (the server
 * accepts images and PDFs regardless; per-platform rules are a warning,
 * not an upload block).
 */
export function acceptFor(platformId: string): string {
  const media = getPlatformMedia(platformId)
  const mimes = [...(media.image?.allowedMimes ?? []), ...(media.document?.allowedMimes ?? [])]
  return mimes.length > 0
    ? mimes.join(',')
    : 'image/jpeg,image/png,image/webp,image/gif,application/pdf'
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
  return `${formats} · up to ${formatBytes(c.maxFileSizeBytes)} · max ${c.maxPerPost} per post`
}
