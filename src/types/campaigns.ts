import type { Tag } from "@/types/content";

export type CampaignStatus = "draft" | "active";

export type CampaignPlatform = {
  id: string;
  post_types: string[];
};

export type PublisherAccount = {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string;
  is_active: boolean;
  connected_at: string;
};

export type PlatformPublisher = {
  id: string;
  name: string;
  state: string;
  connected: boolean;
  supported_post_types: string[];
  accounts: PublisherAccount[];
};

/**
 * The platform's text ceilings, seeded server-side (CON-91). Sibling of the
 * `image_constraints` / `pdf_constraints` / `video_constraints` objects on the
 * same row; `constraints` below stays the human-readable prose.
 *
 * `0` means unbounded, which is how the Go zero value reaches us — read these
 * through `contentLimitFor()` rather than directly.
 */
export type TextConstraints = {
  max_content_chars: number;
  max_title_chars: number;
  /** Per-post-type overrides of `max_content_chars`, keyed by slug. */
  per_post_type?: Record<string, number>;
};

export type Platform = {
  id: string;
  name: string;
  post_types: Record<string, string>;
  cadence: string;
  /** Prose, shown as-is in workspace settings. Not machine-readable. */
  constraints: string;
  text_constraints: TextConstraints;
  created_at: string;
  updated_at: string;
  publishers?: PlatformPublisher[];
};

export type CampaignTypePhase = {
  id: string;
  campaign_type_id: string;
  name: string;
  purpose: string;
  sequence: number;
};

export type CampaignType = {
  id: string;
  name: string;
  label: string;
  description: string;
  is_system: boolean;
  phases?: CampaignTypePhase[];
};

export type Campaign = {
  id: string;
  name: string;
  description: string;
  target_persona: string;
  key_messages: string;
  tone_guidelines: string;
  use_assets: boolean;
  asset_ids: string[];
  target_platforms: CampaignPlatform[];
  campaign_type_id: string;
  status: CampaignStatus;
  start_date: string | null;
  end_date: string | null;
  estimated_post_count: number | null;
  language: string;
  budget: number | null;
  currency: string;
  tag_ids: string[];
  tags: Tag[];
  platforms: Platform[];
  campaign_type?: CampaignType | null;
  created_by: string;
  created_at: string;
  updated_at: string;
};

// Payload of GET /api/campaigns/:id/overview (CON-113). Unlike the CRUD
// resources this endpoint speaks camelCase — mirror it verbatim.
export type CampaignOverviewBucket = {
  key: string;
  label: string;
  count: number;
};

export type CampaignOverviewPhase = {
  id: string;
  sequence: number;
  name: string;
  purpose: string;
  postCount: number;
};

export type CampaignOverview = {
  campaignId: string;
  name: string;
  status: string;
  type: string;
  language: string;
  brief: {
    description: string;
    targetPersona: string;
    keyMessages: string;
    toneGuidelines: string;
  };
  phases: CampaignOverviewPhase[];
  totalPosts: number;
  distribution: {
    unassignedPhasePostCount: number;
    byStatus: CampaignOverviewBucket[];
    byPlatform: CampaignOverviewBucket[];
    byContentType: CampaignOverviewBucket[];
  };
  generatedAt: string;
};

export type CreateCampaignPayload = {
  name: string;
  campaign_type_id: string;
  description?: string;
  target_persona?: string;
  key_messages?: string;
  tone_guidelines?: string;
  use_assets?: boolean;
  asset_ids?: string[];
  target_platforms?: CampaignPlatform[];
  status?: CampaignStatus;
  start_date?: string | null;
  end_date?: string | null;
  estimated_post_count?: number | null;
  budget?: number | null;
  currency?: string;
  language?: string;
  tag_ids?: string[];
};

export type UpdateCampaignPayload = CreateCampaignPayload;
