import type { PlatformValidationError } from '@/types/attachments'
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

/**
 * One message of a thread (CON-284). Index 0 is the root and the rest become
 * replies in order.
 *
 * An object rather than a bare string because the column is `jsonb` and the
 * server reads `{content}` — per-message media is *not* in here, it is the
 * attachments' `segment_index`.
 */
export type ThreadSegment = { content: string }

/**
 * One message of a split the server has worked out but not stored
 * (`POST /api/posts/thread/preview`).
 *
 * `char_count` is code points, the platforms' own unit and the one
 * `max_content_chars` is measured in — so it is taken from the answer rather
 * than recounted here, where a different idea of a character would show a
 * count the publish gate disagrees with.
 */
export type ThreadPreviewSegment = { content: string; char_count: number }

/**
 * What a body would publish as, asked of the server before anything is saved
 * (CON-284 R2).
 *
 * The endpoint runs the same `SplitThread` the write path runs and then the
 * same publish gate, so this is not an approximation of the outcome — it *is*
 * the outcome, minus the persisting. Attachments are deliberately not
 * considered: a preview knows nothing about which message carries which file,
 * so per-message media rules stay this client's job (`lib/threadSequence`).
 */
export type ThreadPreview = {
  segments: ThreadPreviewSegment[]
  /**
   * The per-message ceiling the split was packed to. `0` means the server had
   * none to use — a draft with no platform picked yet — in which case the body
   * comes back whole unless it carries dividers.
   */
  limit: number
  valid: boolean
  errors: PlatformValidationError[]
}

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
  /**
   * The ordered messages this post publishes as, when it is a thread (CON-284)
   * — `[]` for every ordinary post, and for a thread nobody has saved yet.
   *
   * **Read-only, and the server's own arithmetic.** The words live in
   * `content`, exactly as they do for every other post type; the server splits
   * that body on every write and stores the result here (R2's `SplitThread`).
   * Sending it back is not an error — it is *ignored* — so it is absent from
   * `PostPayload` altogether, which is the honest shape: there is no way for
   * this client to disagree with the server about where the breaks fall.
   *
   * What it is good for is reading: it is the only account of the split that
   * cannot drift, and `POST /api/posts/thread/preview` answers the same
   * question for a body that has not been saved yet. See
   * `docs/technical-decisions.md#thread-sequence`.
   */
  thread_segments: ThreadSegment[]
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
  /**
   * The platform permalink for the live post (CON-165) — `""` until there is
   * one. Written server-side from Zernio when a post publishes, and by the
   * manual `verify-external` path from the URL the user pasted.
   *
   * Unlike `publisher_post_id` this one *is* on `PostPayload`, and has to be:
   * the PUT is whole-resource and assigns the field unconditionally, so a
   * payload that omits it clears the permalink. It stays writable after
   * publish on purpose — recording a link is a post-publish act — which is
   * also why it is not among the fields CON-251's content lock freezes.
   */
  published_url: string
  /**
   * This post's own Brand voice and audience (CON-245), or `null` where it
   * takes the campaign's. `brand_voice_id` is also written *for* the post by
   * the generation flows — `content_plan` picks a voice per post as it plans —
   * so a post can arrive already bound without anyone having chosen here.
   *
   * Read-only through this type: both are written by `setPostBrand`
   * (`PUT /api/posts/:id/brand`) and deliberately absent from `PostPayload`.
   * The whole-post PUT reads them presence-aware, so an autosave that omits
   * them leaves the binding alone — which is the point of the targeted
   * endpoint, and why the picker never has to round-trip the post.
   */
  brand_voice_id: string | null
  brand_audience_id: string | null
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
  /** Round-tripped, never omitted — see `Post.published_url`. */
  published_url?: string
}
