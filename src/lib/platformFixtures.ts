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

/**
 * A platform row (LinkedIn by default) with every field the type demands.
 *
 * The sqid is arbitrary and deliberately not one of the seeded ones: nothing in
 * the app is filed under a sqid since CON-292, so a test that depends on a
 * particular one is testing something that no longer exists. `zernio_id` is the
 * field to override when a test means "this is Instagram".
 */
export function makePlatform(overrides: Partial<Platform> = {}): Platform {
  return {
    id: 'plat-1',
    name: 'LinkedIn',
    zernio_id: 'linkedin',
    enabled: true,
    connect_supported: true,
    post_types: {},
    supported_post_types: [],
    sort_order: 0,
    cadence: '',
    constraints: '',
    text_constraints: { max_content_chars: 0, max_title_chars: 0 },
    video_constraints: videoConstraints(),
    created_at: '',
    updated_at: '',
    ...overrides,
  }
}
