import type { Campaign, PublisherAccount } from '@/types/campaigns'
import type { Asset } from '@/types/content'

export type PostStatus =
  | 'draft'
  | 'ready_for_publish'
  | 'scheduled'
  | 'scheduled_for_manual_publishing'
  | 'failed'
  | 'published'
  | 'not_published'

export type PostCTAType = 'link' | 'button' | 'none'

export type Post = {
  id: string
  campaign_id: string
  platform_id: string
  platform_post_type: string
  /**
   * Which of the platform's connected accounts this post publishes as
   * (CON-150). Empty when unspecified: the submit worker then auto-selects
   * the platform's single account, or refuses when there is more than one.
   */
  social_account_id: string
  title: string
  content: string
  media_urls: string[]
  scheduled_at: string | null
  published_at: string | null
  status: PostStatus
  cta_type: PostCTAType
  cta_url: string
  target_audience_notes: string
  /**
   * The documents this post writes from — and the post assistant's entire
   * reading list, not a label (see `lib/postSources`). Generated posts arrive
   * with the subset of retrieved assets the model drew on (CON-118); the
   * Sources card is where a person changes it.
   */
  used_asset_ids: string[]
  campaign_type_phase_id: string | null
  /**
   * The publisher's own id for this post, set when it went out through a
   * publisher — either by auto-publish or by verifying a manual one
   * (CON-149). Absent means nothing links this post to the thing that was
   * actually posted, so its analytics can never resolve; that absence is
   * what the "add post link" affordance keys off.
   *
   * Read-only: the server owns it, and it is deliberately not in
   * `PostPayload` — an autosave must never write it back.
   */
  publisher_post_id?: string
  created_by: string
  created_at: string
  updated_at: string
  campaign: Campaign | null
  platform: {
    id: string
    name: string
    post_types: Record<string, string>
    cadence: string
    constraints: string
    created_at: string
    updated_at: string
  } | null
  /**
   * The chosen account, hydrated. Optional on the wire (`omitempty`), and
   * the server hydrates disconnected accounts too — so a post that already
   * went out can still name the account it went out as, long after that
   * account left the platform's connected list.
   */
  social_account?: PublisherAccount | null
  /**
   * `used_asset_ids`, hydrated by the server on every read and write. Free
   * detail: the editor names what it reads from without fetching the asset
   * list, which carries every document's full markdown.
   */
  used_assets: Asset[]
  campaign_type_phase: unknown | null
}

/**
 * The slim per-post projection behind the Campaigns list (CON-152) — exactly
 * the fields `lib/campaignReadiness` reads, and nothing else. No title, no
 * content, no hydrated relations: those are the payload, and the list only
 * ever renders counts derived from them.
 *
 * A full `Post` structurally satisfies this, which is the point. The readiness
 * rules are typed against `PostSummary`, so the Campaigns list can feed them
 * projections while the Overview screen keeps feeding them real posts — one
 * rule set, no divergence (docs/attention-rules.md).
 */
export type PostSummary = Pick<
  Post,
  | 'id'
  | 'campaign_id'
  | 'status'
  | 'scheduled_at'
  | 'published_at'
  | 'platform_id'
  | 'platform_post_type'
  | 'campaign_type_phase_id'
  | 'media_urls'
  | 'created_at'
  | 'updated_at'
>

/** One campaign's projected posts, as the server groups them. */
export type CampaignPostSummary = {
  campaign_id: string
  posts: PostSummary[]
}

/**
 * `GET /api/campaigns/summaries`. Campaigns with no posts are simply absent —
 * the client defaults them to an empty list rather than the server sending a
 * row per empty campaign.
 */
export type CampaignSummariesResponse = {
  summaries: CampaignPostSummary[]
  generated_at: string
}

export const DELETABLE_STATUSES: PostStatus[] = [
  'draft',
  'failed',
  'not_published',
]

export type PostPayload = {
  campaign_id: string
  platform_id?: string
  platform_post_type?: string
  social_account_id?: string
  title?: string
  content?: string
  media_urls?: string[]
  scheduled_at?: string | null
  published_at?: string | null
  status?: PostStatus
  cta_type?: PostCTAType
  cta_url?: string
  target_audience_notes?: string
  used_asset_ids?: string[]
  campaign_type_phase_id?: string | null
}
