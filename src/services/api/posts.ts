import type { Post, PostPayload, PostStatus } from '@/types/posts'
import { apiJson, apiVoid } from './http'

const BASE = '/api/posts'

// The two statuses a Scheduled post can be pulled back to via the cancel
// endpoint (mirrors CancelTarget in src/jobs/queues/cancel_zernio_job.go).
export type CancelTarget = 'ready_for_publish' | 'draft'

export function listCampaignPosts(campaignId: string): Promise<Post[]> {
  return apiJson<Post[]>(
    `/api/campaigns/${campaignId}/posts`,
    'Unable to fetch posts',
  )
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
  return apiJson<Post>(BASE, 'Unable to create post', {
    method: 'POST',
    body: payload,
  })
}

export function updatePost(id: string, payload: PostPayload): Promise<Post> {
  return apiJson<Post>(`${BASE}/${id}`, 'Unable to update post', {
    method: 'PUT',
    body: payload,
  })
}

export function deletePost(id: string): Promise<void> {
  return apiVoid(`${BASE}/${id}`, 'Unable to delete post', { method: 'DELETE' })
}

/**
 * Attaches documents to a post's sources, touching no other field (CON-233).
 *
 * One atomic UPDATE of `used_asset_ids` server-side: ids the post already has
 * keep their position, new ones append in the order given, and two attaches
 * landing at once both survive — which is what the whole-post PUT could not
 * promise, since each carried the set as its caller had read it. Adding an id
 * the post already holds is a no-op.
 *
 * 409 while the post is `scheduled` or `published`: sources are locked content
 * (CON-251), and the endpoint enforces the same lock the PUT does — though a
 * no-op add is let through. Returns the post hydrated, so `used_assets` comes
 * back with it and the sources card can name the new document without fetching.
 */
export function addPostAssets(id: string, assetIds: string[]): Promise<Post> {
  return apiJson<Post>(
    `${BASE}/${id}/assets`,
    'Unable to add this to the post',
    {
      method: 'POST',
      body: { asset_ids: assetIds },
    },
  )
}

/**
 * Detaches one document from a post's sources (CON-233). Removing an id the
 * post does not hold is a no-op, not a 404.
 *
 * This is the *only* way a source comes off a post: `used_asset_ids` is no
 * longer in the PUT payload (see `postToPayload`), so the editor's autosave
 * cannot write the field at all — which is the point. It used to be able to,
 * and a keystroke landing during an attach would clone the pre-attach list into
 * the debounce and put it straight back.
 *
 * 409 while the post is `scheduled` or `published`, exactly as the add half.
 */
export function removePostAsset(id: string, assetId: string): Promise<Post> {
  return apiJson<Post>(
    `${BASE}/${id}/assets/${assetId}`,
    'Unable to remove this from the post',
    { method: 'DELETE' },
  )
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
export function schedulePost(
  id: string,
  scheduledAt: string,
): Promise<ScheduleResult> {
  return apiJson<ScheduleResult>(
    `${BASE}/${id}/schedule`,
    'Unable to schedule post',
    {
      method: 'POST',
      body: { scheduled_at: scheduledAt },
    },
  )
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

/**
 * One saved snapshot of a post's text (CON-68).
 *
 * `content` only — a version does not carry the title, attachments, platform
 * or schedule, so restoring one changes the words and nothing else.
 *
 * `creator` says who took the snapshot: the assistant saves one before it
 * rewrites, the user saves one by asking.
 */
export type PostVersion = {
  id: string
  post_id: string
  version_number: number
  content: string
  note: string
  creator: 'user' | 'assistant'
  created_at: string
}

/** Every snapshot for the post, oldest first — the server orders it. */
export function listPostVersions(postId: string): Promise<PostVersion[]> {
  return apiJson<PostVersion[] | null>(
    `${BASE}/${postId}/versions`,
    'Unable to load versions',
    // A post with no versions answers `null`, not `[]`.
  ).then((rows) => rows ?? [])
}

/** Snapshots the post's *stored* content — flush pending edits before calling. */
export function createPostVersion(
  postId: string,
  note: string,
): Promise<PostVersion> {
  return apiJson<PostVersion>(
    `${BASE}/${postId}/versions`,
    'Unable to save a version',
    {
      method: 'POST',
      body: { note },
    },
  )
}

/**
 * Discards one snapshot. The post's content is untouched — this removes the
 * ability to go back to it, nothing else.
 *
 * NOTE: the server does not implement this yet. `DELETE /api/posts/:id/
 * versions/:versionId` is the shape the rest of the post routes imply, but
 * `handlers/posts.go` registers only GET and POST on `/versions`, so this
 * currently 404s. Requested on CON-44; the caller is behind the
 * `post-version-delete` flag until it lands.
 */
export function deletePostVersion(
  postId: string,
  versionId: string,
): Promise<void> {
  return apiVoid(
    `${BASE}/${postId}/versions/${versionId}`,
    'Unable to delete the version',
    { method: 'DELETE' },
  )
}

/**
 * Rolls the post's content back to an earlier version.
 *
 * Non-destructive, and worth knowing before writing copy against it: the
 * server copies the target version's content into a *brand-new* version that
 * becomes the latest, so history is never rewritten and the restore is itself
 * reversible. Unsnapshotted edits are saved as a version first, so nothing is
 * lost. Restoring the version that already matches the live content is a no-op.
 *
 * Returns the hydrated post, like `updatePost` — the caller can write it
 * straight into the editor's cache entry.
 */
export function restorePost(
  postId: string,
  versionNumber: number,
): Promise<Post> {
  return apiJson<Post>(
    `${BASE}/${postId}/restore`,
    'Unable to restore the version',
    {
      method: 'POST',
      body: { version_number: versionNumber },
    },
  )
}

/**
 * The post as a whole-resource payload — every field the PUT will otherwise
 * default away.
 *
 * `published_url` is on this list for exactly that reason (CON-165): the
 * handler assigns it from the request unconditionally, so an autosave that
 * left it out would clear the permalink of every published post the moment
 * someone edited it. It is the one field here that is normally the *server's*
 * to write, which is why it needs saying out loud — `publisher_post_id`, its
 * neighbour, is deliberately absent because the API does not take it.
 *
 * `used_asset_ids` is the one field that is absent on purpose, and this is the
 * only place that decides so. The server reads it presence-aware since CON-233
 * — an omitted key leaves the stored set alone, right down to dropping the
 * column from the UPDATE — so the post's sources now have exactly one writer,
 * the membership endpoints. Restating them here would put every autosave back
 * in the race it was in: a keystroke during an attach clones the pre-attach
 * list into the debounce, and its flush undoes the attach. Note the two fields
 * are opposites, not a contradiction — the handler defaults `published_url`
 * away when it is missing and *preserves* `used_asset_ids`, so each is listed
 * or omitted according to what the server does with silence.
 *
 * Two things follow. Attaching and detaching go through `addPostAssets` /
 * `removePostAsset`, never through `changeDoc` alone — an edit to the field
 * that only rides the autosave is now discarded. And a status transition can no
 * longer trip the CON-251 content lock by restating sources it did not mean to
 * change.
 *
 * `createPost` still sends the field (`PostPayload` keeps it optional): a post
 * being created has no stored set to preserve, and duplicating one carries its
 * reading list over.
 */
export function postToPayload(post: Post): PostPayload {
  return {
    campaign_id: post.campaign_id,
    published_url: post.published_url,
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
    campaign_type_phase_id: post.campaign_type_phase_id,
  }
}
