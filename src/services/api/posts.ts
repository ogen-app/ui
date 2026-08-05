import type { Post, PostPayload, PostStatus } from '@/types/posts'
import { apiJson, apiVoid } from './http'

const BASE = '/api/posts'

// The two statuses a Scheduled post can be pulled back to via the cancel
// endpoint (mirrors CancelTarget in src/jobs/queues/cancel_zernio_job.go).
export type CancelTarget = 'ready_for_publish' | 'draft'

export function listCampaignPosts(campaignId: string): Promise<Post[]> {
  return apiJson<Post[]>(`/api/campaigns/${campaignId}/posts`, 'Unable to fetch posts')
}

/**
 * Every post in the workspace, hydrated. Unfiltered — the endpoint takes no
 * query parameters, so callers narrow client-side. Used where a question spans
 * campaigns (the auto-publish allowlist is workspace-wide, so switching it off
 * has to look at every campaign's scheduled posts, not just the open one).
 */
export function listPosts(): Promise<Post[]> {
  return apiJson<Post[]>(BASE, 'Unable to fetch posts')
}

export function getPost(id: string): Promise<Post> {
  return apiJson<Post>(`${BASE}/${id}`, 'Unable to fetch post')
}

export function createPost(payload: PostPayload): Promise<Post> {
  return apiJson<Post>(BASE, 'Unable to create post', { method: 'POST', body: payload })
}

export function updatePost(id: string, payload: PostPayload): Promise<Post> {
  return apiJson<Post>(`${BASE}/${id}`, 'Unable to update post', { method: 'PUT', body: payload })
}

export function deletePost(id: string): Promise<void> {
  return apiVoid(`${BASE}/${id}`, 'Unable to delete post', { method: 'DELETE' })
}

export type ScheduleResult = {
  post: Post
  // The routed status: the server consults the workspace auto-publish
  // allowlist, so a schedule request can land in
  // `scheduled_for_manual_publishing` even though the user asked to
  // auto-publish.
  status: Extract<PostStatus, 'scheduled' | 'scheduled_for_manual_publishing'>
  auto_publish: boolean
  promoted: boolean
}

/**
 * Schedules a `ready_for_publish` post via the dedicated schedule endpoint
 * (`schedule.Service` in src/post_actions/schedule/schedule.go). Unlike the
 * status-PUT path, the server validates `scheduled_at` here (required, in
 * the future) and routes auto- vs manual-publish via the allowlist — the
 * returned post carries the routed status.
 */
export function schedulePost(id: string, scheduledAt: string): Promise<ScheduleResult> {
  return apiJson<ScheduleResult>(`${BASE}/${id}/schedule`, 'Unable to schedule post', {
    method: 'POST',
    body: { scheduled_at: scheduledAt },
  })
}

/**
 * Requests cancellation of a Scheduled post. The server enqueues a Zernio
 * cancel job and returns 202 immediately; the post stays in `scheduled`
 * until the worker confirms, then transitions to `target`. Callers should
 * poll/refetch the post to observe the eventual status change.
 */
export function cancelPost(id: string, target: CancelTarget): Promise<void> {
  return apiVoid(`${BASE}/${id}/cancel`, 'Unable to unschedule post', {
    method: 'POST',
    body: { target },
  })
}

/**
 * The engagement block `verify-external` echoes back for the post it
 * matched (mirrors `models.PostAnalyticsMetrics`). Nothing renders it yet —
 * the first snapshot it comes from is what later analytics reads build on.
 */
export type PostAnalyticsMetrics = {
  impressions: number
  reach: number
  likes: number
  comments: number
  shares: number
  saves: number
  clicks: number
  views: number
  engagement_rate: number
}

/**
 * `found: false` is a 200, not an error: the platform simply has no post at
 * that URL, which is what a typo looks like and what the dialog must be able
 * to show without treating it as a failure.
 */
export type VerifyExternalResponse = {
  found: boolean
  post?: {
    id: string
    publisher_post_id: string
    sync_status: string
  }
  analytics?: PostAnalyticsMetrics
}

/**
 * Confirms a manually-published post from the URL the user pasted, via
 * Zernio's on-demand external sync (CON-153). On a match the *server*
 * completes the publish: it back-fills `publisher_post_id`, sets the status
 * to `published`, writes a first analytics snapshot and emits
 * `post.analytics.updated`. The response carries only the linkage, so
 * callers must refetch the post to see the new status.
 *
 * The account whose token reads the platform is resolved from the post's
 * `social_account_id` (CON-150 rules) — it can't be passed here, so an
 * ambiguous account comes back as a 422 the user resolves in the
 * quick-settings bar, not in the request.
 */
export function verifyExternalPost(
  id: string,
  locator: { url?: string; post_id?: string },
): Promise<VerifyExternalResponse> {
  return apiJson<VerifyExternalResponse>(
    `${BASE}/${id}/verify-external`,
    'Unable to verify the published post',
    { method: 'POST', body: locator },
  )
}

export function postToPayload(post: Post): PostPayload {
  return {
    campaign_id: post.campaign_id,
    platform_id: post.platform_id,
    platform_post_type: post.platform_post_type,
    social_account_id: post.social_account_id,
    title: post.title,
    content: post.content,
    media_urls: post.media_urls,
    scheduled_at: post.scheduled_at,
    published_at: post.published_at,
    status: post.status,
    cta_type: post.cta_type,
    cta_url: post.cta_url,
    target_audience_notes: post.target_audience_notes,
    used_asset_ids: post.used_asset_ids,
    campaign_type_phase_id: post.campaign_type_phase_id,
  }
}
