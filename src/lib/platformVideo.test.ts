import { describe, expect, it } from 'vitest'
import type { Platform, VideoConstraints } from '@/types/campaigns'
import { makePlatform, videoConstraints as constraints } from './platformFixtures.ts'
import {
  MAX_VIDEO_UPLOAD_BYTES,
  describeVideoConstraints,
  formatTimecode,
  resolveVideoConstraints,
  videoFormatOf,
} from './platformVideo.ts'

function platform(video_constraints: VideoConstraints): Platform {
  return makePlatform({ video_constraints })
}

describe('resolveVideoConstraints', () => {
  it('reads an unloaded platform as unknown, not as "no video"', () => {
    expect(resolveVideoConstraints(undefined)).toBeUndefined()
  })

  it('treats the all-zero rule set as "this platform takes no video"', () => {
    expect(resolveVideoConstraints(platform(constraints()))).toBeUndefined()
  })

  it('clamps the platform ceiling to Ogen’s own ingest budget', () => {
    // YouTube is seeded at 64 GB. We are not storing 64 GB.
    const c = resolveVideoConstraints(
      platform(constraints({ max_file_size_bytes: 68719476736, allowed_formats: ['mp4'] })),
    )
    expect(c?.maxFileSizeBytes).toBe(MAX_VIDEO_UPLOAD_BYTES)
    expect(c?.cappedByOgen).toBe(true)
  })

  it('keeps a platform ceiling that is already stricter than ours', () => {
    const c = resolveVideoConstraints(
      platform(constraints({ max_file_size_bytes: 10 * 1024 * 1024, allowed_formats: ['mp4'] })),
    )
    expect(c?.maxFileSizeBytes).toBe(10 * 1024 * 1024)
    expect(c?.cappedByOgen).toBe(false)
  })

  it('reads a zero bound as unbounded rather than as a bound of zero', () => {
    const c = resolveVideoConstraints(
      platform(constraints({ allowed_formats: ['mp4'], max_duration_seconds: 140 })),
    )
    expect(c?.maxDurationSeconds).toBe(140)
    // Not seeded for this platform — 0 must not become "0 seconds allowed".
    expect(c?.minDurationSeconds).toBeNull()
    expect(c?.maxWidth).toBeNull()
  })

  it('maps container names to the MIME types the picker needs', () => {
    const c = resolveVideoConstraints(
      platform(constraints({ allowed_formats: ['mp4', 'mov', 'webm', 'avi', 'mkv'] })),
    )
    expect(c?.allowedMimes).toEqual([
      'video/mp4',
      'video/quicktime',
      'video/webm',
      'video/x-msvideo',
      'video/x-matroska',
    ])
  })

  it('drops a container it has no MIME for rather than emitting a bad accept', () => {
    const c = resolveVideoConstraints(
      platform(constraints({ allowed_formats: ['mp4', 'flv'] })),
    )
    expect(c?.allowedMimes).toEqual(['video/mp4'])
    // The rule itself keeps the format, so the server stays the authority.
    expect(c?.allowedFormats).toEqual(['mp4', 'flv'])
  })

  it('defaults a missing per-post cap to one', () => {
    const c = resolveVideoConstraints(platform(constraints({ allowed_formats: ['mp4'] })))
    expect(c?.maxPerPost).toBe(1)
  })
})

describe('videoFormatOf', () => {
  it('mirrors the server’s mimeToFormat for the mapped containers', () => {
    expect(videoFormatOf('video/mp4')).toBe('mp4')
    expect(videoFormatOf('video/quicktime')).toBe('mov')
    expect(videoFormatOf('video/x-matroska')).toBe('mkv')
  })

  it('falls back to the subtype, as the server does', () => {
    expect(videoFormatOf('video/ogg')).toBe('ogg')
  })
})

describe('formatTimecode', () => {
  it('reads as a clock, never as a count of seconds', () => {
    expect(formatTimecode(38_000)).toBe('0:38')
    expect(formatTimecode(64_000)).toBe('1:04')
    expect(formatTimecode(3_600_000)).toBe('1:00:00')
    expect(formatTimecode(3_723_000)).toBe('1:02:03')
  })
})

describe('describeVideoConstraints', () => {
  it('states the effective limit, not the platform’s headline number', () => {
    const c = resolveVideoConstraints(
      platform(
        constraints({
          max_file_size_bytes: 5368709120,
          allowed_formats: ['mp4'],
          max_duration_seconds: 900,
          min_duration_seconds: 3,
        }),
      ),
    )!
    expect(describeVideoConstraints(c)).toBe('MP4 · up to 500 MB · up to 15:00 · at least 3s')
  })

  it('drops bounds the platform does not set', () => {
    const c = resolveVideoConstraints(
      platform(constraints({ allowed_formats: ['mp4', 'mov'] })),
    )!
    expect(describeVideoConstraints(c)).toBe('MP4, MOV · up to 500 MB')
  })
})
