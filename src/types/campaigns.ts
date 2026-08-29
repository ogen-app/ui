import type { Tag } from '@/types/content'
import type { GoalCadence } from '@/lib/postGoal'

/**
 * Server-owned and no longer user-facing: `draft` and `active` both mean
 * active, and the UI neither shows nor sets this. It stays on the DTO only so
 * an update round-trips the server's own value instead of clearing it. Once
 * campaigns are created `active` server-side and the lifecycle moves to
 * soft-delete/archive (CON-156 §6), this and its pass-through come out.
 */
export type CampaignStatus = 'draft' | 'active'

export type CampaignPlatform = {
  id: string
  post_types: string[]
}

export type PublisherAccount = {
  id: string
  username: string
  display_name: string
  avatar_url: string
  is_active: boolean
  connected_at: string
}

export type PlatformPublisher = {
  id: string
  name: string
  state: string
  connected: boolean
  supported_post_types: string[]
  accounts: PublisherAccount[]
}

/**
 * The platform's text ceilings, seeded server-side (CON-91). Sibling of the
 * `image_constraints` / `pdf_constraints` / `video_constraints` objects on the
 * same row; `constraints` below stays the human-readable prose.
 *
 * `0` means unbounded, which is how the Go zero value reaches us — read these
 * through `contentLimitFor()` rather than directly.
 */
export type TextConstraints = {
  max_content_chars: number
  max_title_chars: number
  /** Per-post-type overrides of `max_content_chars`, keyed by slug. */
  per_post_type?: Record<string, number>
}

/**
 * The platform's video rule set, seeded server-side (CON-148). Mirrors
 * `models.VideoConstraints`.
 *
 * Unlike the image and PDF rules — which the front end deliberately overrides
 * in `lib/platformMedia.ts` because their seeds disagree with what the
 * platforms accept — these are read straight off the wire. They were seeded by
 * CON-148 from Zernio's per-platform docs, not by the disputed CON-73 batch,
 * so there is nothing to correct here yet.
 *
 * An all-zero object is how "this platform does not take video" reaches us;
 * the individual duration/resolution fields are only enforced when non-zero,
 * so a platform can opt into just the checks it cares about. Read these
 * through `lib/platformVideo.ts`, never directly — the server's file-size
 * ceiling is not the one we upload against.
 */
export type VideoConstraints = {
  max_file_size_bytes: number
  /** Container names, not MIME types — `["mp4", "mov"]`. */
  allowed_formats: string[]
  max_duration_seconds: number
  /** Reels and Shorts have a floor as well as a ceiling. */
  min_duration_seconds: number
  /** `0` is unbounded, not "no pixels allowed". */
  max_width: number
  max_height: number
  allowed_aspect_ratios: string[]
  max_attachments_per_post: number
  /** YouTube rejects an untitled upload; feed platforms derive one. */
  requires_video_title: boolean
}

export type Platform = {
  id: string
  name: string
  post_types: Record<string, string>
  cadence: string
  /** Prose, shown as-is in workspace settings. Not machine-readable. */
  constraints: string
  text_constraints: TextConstraints
  video_constraints: VideoConstraints
  created_at: string
  updated_at: string
  publishers?: PlatformPublisher[]
}

export type CampaignTypePhase = {
  id: string
  campaign_type_id: string
  name: string
  purpose: string
  sequence: number
}

/**
 * `name` is the slug, and the only part of the row the UI reads for display —
 * it keys into `lib/campaignTypeDictionary` for the label, the sentence, and
 * the icon. The response also carries `label` and `description`; they are left
 * off this type on purpose, so nobody wires seeded copy back into the UI.
 */
export type CampaignType = {
  id: string
  name: string
  is_system: boolean
  phases?: CampaignTypePhase[]
}

export type Campaign = {
  id: string
  name: string
  description: string
  target_persona: string
  key_messages: string
  tone_guidelines: string
  use_assets: boolean
  asset_ids: string[]
  target_platforms: CampaignPlatform[]
  campaign_type_id: string
  status: CampaignStatus
  start_date: string | null
  end_date: string | null
  /**
   * The post goal's rate: posts per `goal_cadence` period, **not** a
   * whole-campaign total (CON-182 reinterpreted the column, and backfilled
   * every existing campaign to a monthly cadence). Read it through
   * `lib/postGoal`, never as a total.
   */
  estimated_post_count: number | null
  goal_cadence: GoalCadence
  /**
   * Scheduling settings (CON-181), which the content-plan flow places every
   * generated draft by. `publishing_time` is a zero-padded 24-hour "HH:MM" read
   * in `timezone`; `timezone` is an IANA name where `""` means UTC;
   * `publishing_days` is the enabled weekday set as lowercase `"mon"`…`"sun"`
   * tokens; `spread_minutes` is the ± jitter around the time. See
   * `lib/campaignScheduling`.
   */
  publishing_time: string
  timezone: string
  publishing_days: string[]
  spread_minutes: number
  language: string
  budget: number | null
  currency: string
  tag_ids: string[]
  tags: Tag[]
  platforms: Platform[]
  campaign_type?: CampaignType | null
  created_by: string
  created_at: string
  updated_at: string
}

export type CreateCampaignPayload = {
  name: string
  campaign_type_id: string
  description?: string
  target_persona?: string
  key_messages?: string
  tone_guidelines?: string
  use_assets?: boolean
  asset_ids?: string[]
  target_platforms?: CampaignPlatform[]
  status?: CampaignStatus
  start_date?: string | null
  end_date?: string | null
  estimated_post_count?: number | null
  goal_cadence?: GoalCadence
  /**
   * Omitting any of these does not leave the stored value alone — the server
   * normalizes an absent field to its default (09:00 / UTC / every day / ±15),
   * so a partial payload silently resets the campaign's schedule. Build every
   * update through `campaignToPayload`, which round-trips them.
   */
  publishing_time?: string
  timezone?: string
  publishing_days?: string[]
  spread_minutes?: number
  budget?: number | null
  currency?: string
  language?: string
  tag_ids?: string[]
}

export type UpdateCampaignPayload = CreateCampaignPayload
