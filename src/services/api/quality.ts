import { apiUrl } from './base'
import { errorMessage } from './errors'
import { isRecord } from './json'
import { readSSEStream } from '@/lib/sse'
import type { PostEvaluation } from '@/types/quality'

/**
 * Thrown when the backend answers 503 — the quality flow isn't wired on this
 * deployment (no model configured, or the Genkit runtime failed to start).
 * Typed rather than a message, because it is a deployment fact rather than a
 * failure: the panel says the feature is unavailable instead of offering a
 * retry that cannot succeed.
 */
export class QualityUnavailableError extends Error {
  constructor() {
    super('Quality assessment is not available on this server')
    this.name = 'QualityUnavailableError'
  }
}

/**
 * The stored assessment for a post (CON-92), or `null` when it has never been
 * assessed. The backend says 404 for that case; it is an ordinary state — the
 * panel's "not assessed yet" prompt — so it resolves rather than throws.
 */
export async function getPostAssessment(postId: string): Promise<PostEvaluation | null> {
  const res = await fetch(apiUrl(`/api/posts/${postId}/assessment`), {
    credentials: 'include',
  })
  if (res.status === 404) return null
  if (res.status === 503) throw new QualityUnavailableError()
  if (!res.ok) throw new Error(await errorMessage(res, 'Unable to load the assessment'))
  return (await res.json()) as PostEvaluation
}

export type AssessEvent =
  /** One flow stage finished. Six arrive on a full run, two on a cached one. */
  | { type: 'step'; step: string }
  | {
      type: 'complete'
      evaluation: PostEvaluation | null
      /**
       * The inputs the model sees were unchanged, so the stored evaluation
       * came back without a model call. No new timestamp, and no cost.
       */
      cached: boolean
    }
  | { type: 'error'; message: string }

/**
 * Runs a fresh assessment and dispatches its SSE events.
 *
 * The flow persists before it emits `complete`, so by the time the evaluation
 * arrives it is already the stored one — there is nothing for the caller to
 * save. A stream that ends without a terminal event means the request was cut
 * short; refetch the stored assessment to find out whether it landed.
 */
export async function streamPostAssessment(
  postId: string,
  onEvent: (event: AssessEvent) => void,
  signal?: AbortSignal,
): Promise<void> {
  const res = await fetch(apiUrl(`/api/posts/${postId}/assess`), {
    method: 'POST',
    credentials: 'include',
    headers: { Accept: 'text/event-stream' },
    signal,
  })

  if (res.status === 503) throw new QualityUnavailableError()
  if (!res.ok || !res.body) {
    throw new Error(await errorMessage(res, 'Unable to assess this post'))
  }

  await readSSEStream(res.body, ({ event, data }) => {
    const parsed = safeParse(data)
    switch (event) {
      case 'step':
        if (typeof parsed.step === 'string') {
          onEvent({ type: 'step', step: parsed.step })
        }
        break
      case 'complete':
        onEvent({
          type: 'complete',
          evaluation: isRecord(parsed.evaluation)
            ? (parsed.evaluation as unknown as PostEvaluation)
            : null,
          cached: parsed.cached === true,
        })
        break
      case 'error':
        onEvent({
          type: 'error',
          message:
            typeof parsed.message === 'string' ? parsed.message : 'The assessment failed',
        })
        break
    }
  })
}

function safeParse(data: string): Record<string, unknown> {
  try {
    const parsed: unknown = JSON.parse(data)
    return isRecord(parsed) ? parsed : {}
  } catch {
    return {}
  }
}

