// Test-only builders for the `GET /api/platforms` wire shape. Four test
// suites used to carry their own copies of the all-zero video rules and a
// platform literal; adding a field to the wire type meant editing every one.
// Production code never imports this module.

import type { Platform, VideoConstraints } from '@/types/campaigns'

/**
 * The all-zero rule set — with no overrides, exactly how "this platform takes
 * no video" reaches the client (the Go zero value, `IsZero` on the server).
 */
export function videoConstraints(
  overrides: Partial<VideoConstraints> = {},
): VideoConstraints {
  return {
    max_file_size_bytes: 0,
    allowed_formats: [],
    max_duration_seconds: 0,
    min_duration_seconds: 0,
    max_width: 0,
    max_height: 0,
    allowed_aspect_ratios: [],
    max_attachments_per_post: 0,
    requires_video_title: false,
    ...overrides,
  }
}

/** A platform row (LinkedIn by default) with every field the type demands. */
export function makePlatform(overrides: Partial<Platform> = {}): Platform {
  return {
    id: 'AXqWG7U2qnpt',
    name: 'LinkedIn',
    post_types: {},
    cadence: '',
    constraints: '',
    text_constraints: { max_content_chars: 0, max_title_chars: 0 },
    video_constraints: videoConstraints(),
    created_at: '',
    updated_at: '',
    ...overrides,
  }
}
