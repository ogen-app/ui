import { apiJson } from './http'
import { errorMessage } from './errors'
import { scopedFetch } from './base'
import { isRecord } from './json'
import { readSSEStream } from '@/lib/sse'
import type { Post, PostStatus } from '@/types/posts'

/**
 * Ideas becoming posts (CON-449). An idea is an angle worth posting; a
 * *planned* post holds a title and theses compiled from one or more ideas; a
 * draft has a body. Posts and ideas are many-to-many, and the link is the
 * provenance the learning loop follows back.
 */

/** An idea with a target date, drawn on the calendar as a dashed slot. */
export type IdeaSlot = {
  kind: 'idea'
  id: string
  title: string
  /** YYYY-MM-DD. */
  date: string
  campaign_id: string | null
  campaign_name: string
  platform_id: string | null
  platform_post_type: string | null
  phase_id: string | null
  verdict: 'yes' | 'later' | null
}

/** An idea a post was built from. */
export type PostSourceIdea = { id: string; title: string; origin: string }

/** A post an idea fed. */
export type IdeaPostRef = {
  id: string
  title: string
  status: PostStatus
  campaign_id: string
  platform_id: string
  scheduled_at: string | null
}

/** The calendar's ideas between two days (at most 93), one campaign or all. */
export function listIdeaSlots(
  from: string,
  to: string,
  campaignId: string | null,
): Promise<IdeaSlot[]> {
  const query = new URLSearchParams({ from, to })
  if (campaignId) query.set('campaign_id', campaignId)
  return apiJson<IdeaSlot[] | null>(
    `/api/ideas/slots?${query}`,
    'Unable to load the planned ideas',
  ).then((rows) => rows ?? [])
}

export function listPostIdeas(postId: string): Promise<PostSourceIdea[]> {
  return apiJson<PostSourceIdea[] | null>(
    `/api/posts/${encodeURIComponent(postId)}/ideas`,
    'Unable to load the ideas behind this post',
  ).then((rows) => rows ?? [])
}

export function listIdeaPosts(ideaId: string): Promise<IdeaPostRef[]> {
  return apiJson<IdeaPostRef[] | null>(
    `/api/ideas/${encodeURIComponent(ideaId)}/posts`,
    'Unable to load the posts made from this idea',
  ).then((rows) => rows ?? [])
}

/**
 * Overrides for a compile or a draft. Each defaults server-side: the campaign
 * to the one the ideas share, the platform, type, phase and date to the first
 * idea plan that sets them.
 */
export type IdeaPostOptions = {
  campaign_id?: string
  platform_id?: string
  platform_post_type?: string
  phase_id?: string
  target_date?: string
}

/** 1–10 ideas → one planned post, its theses synthesised from them. */
export function compileIdeas(
  ideaIds: string[],
  options: IdeaPostOptions & { title?: string } = {},
): Promise<{ post: Post; ideas: PostSourceIdea[] }> {
  return apiJson(`/api/ideas/compile`, 'Unable to compile the ideas', {
    method: 'POST',
    body: { idea_ids: ideaIds, ...options },
  })
}

export type DraftIdeasEvent =
  | { type: 'post'; postId: string; title: string }
  | { type: 'complete'; postIds: string[]; warnings: string[] }
  | { type: 'error'; message: string }

/**
 * 1–10 ideas → finished drafts, unscheduled: one per idea per platform, or
 * with `together` one per platform from all of them. Streams each post as it
 * is saved; a failure part-way keeps the posts already written.
 */
export async function draftIdeas(
  ideaIds: string[],
  options: Omit<IdeaPostOptions, 'platform_id'> & {
    platform_ids?: string[]
    together?: boolean
    instruction?: string
  },
  onEvent: (event: DraftIdeasEvent) => void,
  signal?: AbortSignal,
): Promise<void> {
  const res = await scopedFetch('/api/ideas/draft', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'text/event-stream',
    },
    body: JSON.stringify({ idea_ids: ideaIds, ...options }),
    signal,
  })
  if (!res.ok || !res.body) {
    throw new Error(await errorMessage(res, 'Unable to write the drafts'))
  }
  // A stream that closes with neither `complete` nor `error` — a dropped
  // connection, a server that went away — did not finish, and must not read
  // as a success with however few drafts made it.
  let ended = false
  await readSSEStream(res.body, ({ event, data }) => {
    if (event === 'complete' || event === 'error') ended = true
    let parsed: unknown
    try {
      parsed = JSON.parse(data)
    } catch {
      return
    }
    if (!isRecord(parsed)) return
    if (event === 'post' && typeof parsed.postId === 'string') {
      onEvent({
        type: 'post',
        postId: parsed.postId,
        title: typeof parsed.title === 'string' ? parsed.title : '',
      })
    } else if (event === 'complete') {
      const posts = Array.isArray(parsed.posts) ? parsed.posts : []
      onEvent({
        type: 'complete',
        postIds: posts
          .filter(isRecord)
          .map((p) => (typeof p.postId === 'string' ? p.postId : ''))
          .filter(Boolean),
        warnings: Array.isArray(parsed.warnings)
          ? parsed.warnings.filter((w): w is string => typeof w === 'string')
          : [],
      })
    } else if (event === 'error') {
      onEvent({
        type: 'error',
        message:
          typeof parsed.message === 'string'
            ? parsed.message
            : 'Unable to write the drafts',
      })
    }
  })
  if (!ended) {
    onEvent({
      type: 'error',
      message: 'The connection closed before the drafts were finished',
    })
  }
}
