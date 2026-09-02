// Per-platform video constraints (CON-148).
//
// Unlike `platformMedia.ts` — which owns a front-end table because the seeded
// image/PDF rules disagree with what the platforms accept — video rules are
// read straight off `GET /api/platforms`. They were seeded by CON-148 from
// Zernio's per-platform docs, so there is nothing to correct client-side.
//
// The one number we do NOT take from the server is the file-size ceiling. The
// API's hard cap is 5 GiB and the seeds go far past that (YouTube is 64 GB),
// but every byte accepted here is a byte Ogen pays to store and to stream to
// Zernio. `MAX_VIDEO_UPLOAD_BYTES` is our own, much lower ingest budget, and
// the effective limit is always the stricter of the two.

import { formatBytes } from '@/lib/platformMedia'
import type { Platform, VideoConstraints } from '@/types/campaigns'

const MB = 1024 * 1024

/**
 * Ogen's own ingest ceiling for one video, well under the API's 5 GiB cap.
 * Deliberately conservative: object storage and Zernio egress are billed on
 * volume, and no platform in the seed set needs more than this for the
 * short-form video Ogen actually publishes.
 */
export const MAX_VIDEO_UPLOAD_BYTES = 500 * MB

/**
 * A platform's video rules with our ingest budget already folded in.
 * `undefined` from `resolveVideoConstraints` means the platform takes no
 * video at all.
 */
export type VideoMediaConstraints = {
  /** The stricter of the platform's ceiling and `MAX_VIDEO_UPLOAD_BYTES`. */
  maxFileSizeBytes: number
  /** True when our budget, not the platform, is what binds. */
  cappedByOgen: boolean
  /** MIME types for the file picker, derived from `allowed_formats`. */
  allowedMimes: string[]
  /** Container short names as the server compares them: `["mp4", "mov"]`. */
  allowedFormats: string[]
  /** `null` when the platform sets no bound. */
  maxDurationSeconds: number | null
  minDurationSeconds: number | null
  maxWidth: number | null
  maxHeight: number | null
  allowedAspectRatios: string[]
  maxPerPost: number
  /** Publishing needs a non-empty post title (YouTube). */
  requiresTitle: boolean
}

/**
 * Mirrors `platforms.mimeToFormat` for the video branch — the server compares
 * `allowed_formats` against these short names, so the picker has to map back
 * the same way or `accept` and the rule disagree.
 */
const FORMAT_MIMES: Record<string, string> = {
  mp4: 'video/mp4',
  mov: 'video/quicktime',
  webm: 'video/webm',
  avi: 'video/x-msvideo',
  mkv: 'video/x-matroska',
  mpeg: 'video/mpeg',
  '3gp': 'video/3gpp',
}

/** Mirrors `models.VideoConstraints.IsZero`. */
function isZero(c: VideoConstraints | undefined): boolean {
  if (!c) return true
  return (
    !c.max_file_size_bytes &&
    (c.allowed_formats?.length ?? 0) === 0 &&
    !c.max_duration_seconds &&
    !c.min_duration_seconds &&
    !c.max_width &&
    !c.max_height &&
    (c.allowed_aspect_ratios?.length ?? 0) === 0 &&
    !c.max_attachments_per_post &&
    !c.requires_video_title
  )
}

/** `0` is the Go zero value reaching us as "unbounded", not as a real bound. */
function bound(value: number | undefined): number | null {
  return value && value > 0 ? value : null
}

/**
 * The platform's video rules, or `undefined` when it publishes no video.
 * Pass the platform row from `usePlatforms()`; `undefined` while it loads.
 */
export function resolveVideoConstraints(
  platform: Platform | undefined,
): VideoMediaConstraints | undefined {
  const c = platform?.video_constraints
  if (isZero(c) || !c) return undefined

  const platformMax = bound(c.max_file_size_bytes)
  const formats = c.allowed_formats ?? []
  return {
    maxFileSizeBytes:
      platformMax === null
        ? MAX_VIDEO_UPLOAD_BYTES
        : Math.min(platformMax, MAX_VIDEO_UPLOAD_BYTES),
    cappedByOgen: platformMax === null || platformMax > MAX_VIDEO_UPLOAD_BYTES,
    allowedMimes: formats
      .map((f) => FORMAT_MIMES[f.toLowerCase()])
      .filter(Boolean),
    allowedFormats: formats,
    maxDurationSeconds: bound(c.max_duration_seconds),
    minDurationSeconds: bound(c.min_duration_seconds),
    maxWidth: bound(c.max_width),
    maxHeight: bound(c.max_height),
    allowedAspectRatios: c.allowed_aspect_ratios ?? [],
    maxPerPost: c.max_attachments_per_post || 1,
    requiresTitle: !!c.requires_video_title,
  }
}

/** Mirrors the server's `mimeToFormat` so a picked file can be rule-checked. */
export function videoFormatOf(mimeType: string): string {
  for (const [format, mime] of Object.entries(FORMAT_MIMES)) {
    if (mime === mimeType) return format
  }
  return mimeType.startsWith('video/')
    ? mimeType.slice('video/'.length)
    : mimeType
}

/**
 * "12:04", or "0:38" — never a bare number of seconds. Named apart from
 * `assistantTools.formatDuration`, which renders the same input as "12m 4s":
 * an auto-import picking the wrong one compiles clean and reads wrong.
 */
export function formatTimecode(ms: number): string {
  const total = Math.round(ms / 1000)
  const hours = Math.floor(total / 3600)
  const minutes = Math.floor((total % 3600) / 60)
  const seconds = total % 60
  const mm = hours > 0 ? String(minutes).padStart(2, '0') : String(minutes)
  return `${hours > 0 ? `${hours}:` : ''}${mm}:${String(seconds).padStart(2, '0')}`
}

/** A duration ceiling as prose: "up to 2:20", "up to 12 h". */
function describeSeconds(seconds: number): string {
  if (seconds >= 3600) {
    const hours = seconds / 3600
    return `${hours % 1 === 0 ? hours : hours.toFixed(1)} h`
  }
  if (seconds >= 60) return formatTimecode(seconds * 1000)
  return `${seconds}s`
}

/** "MP4, MOV · up to 500 MB · up to 2:20" — the hint under the dropzone. */
export function describeVideoConstraints(c: VideoMediaConstraints): string {
  const parts = [c.allowedFormats.map((f) => f.toUpperCase()).join(', ')]
  parts.push(`up to ${formatBytes(c.maxFileSizeBytes)}`)
  if (c.maxDurationSeconds !== null) {
    parts.push(`up to ${describeSeconds(c.maxDurationSeconds)}`)
  }
  if (c.minDurationSeconds !== null) {
    parts.push(`at least ${describeSeconds(c.minDurationSeconds)}`)
  }
  return parts.filter(Boolean).join(' · ')
}
