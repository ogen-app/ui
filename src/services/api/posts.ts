import type { Post, PostPayload, PostVersion } from '@/types/posts'
import { apiJson, apiVoid } from './http'

const BASE = '/api/posts'

// The two statuses a Scheduled post can be pulled back to via the cancel
// endpoint (mirrors CancelTarget in src/jobs/queues/cancel_zernio_job.go).
export type CancelTarget = 'ready_for_publish' | 'draft'

export function listCampaignPosts(campaignId: string): Promise<Post[]> {
  return apiJson<Post[]>(`/api/campaigns/${campaignId}/posts`, 'Unable to fetch posts')
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

export function listPostVersions(id: string): Promise<PostVersion[]> {
  // The backend serializes an empty list as null (Go nil slice).
  return apiJson<PostVersion[] | null>(
    `${BASE}/${id}/versions`,
    'Unable to fetch versions'
  ).then((versions) => versions ?? [])
}

export function createPostVersion(id: string, note: string): Promise<PostVersion> {
  return apiJson<PostVersion>(`${BASE}/${id}/versions`, 'Unable to save version', {
    method: 'POST',
    body: { note },
  })
}

export type RestoreVersionResult = {
  post: Post
  restored_from_version: number
  new_version_number: number
  auto_snapshot_created: boolean
  no_op: boolean
}

/**
 * Rolls the post's content back to `versionNumber`. Non-destructive: the
 * server copies the target content into a new version that becomes HEAD, and
 * auto-snapshots any unsnapshotted live edits first.
 */
export function restorePostVersion(
  id: string,
  versionNumber: number
): Promise<RestoreVersionResult> {
  return apiJson<RestoreVersionResult>(`${BASE}/${id}/restore`, 'Unable to restore version', {
    method: 'POST',
    body: { version_number: versionNumber },
  })
}

export function postToPayload(post: Post): PostPayload {
  return {
    campaign_id: post.campaign_id,
    platform_id: post.platform_id,
    platform_post_type: post.platform_post_type,
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
