import { useCallback, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import {
  cancelPost,
  getPost,
  postToPayload,
  updatePost,
} from '@/services/api/posts'
import type { Post } from '@/types/posts'

/** How long to wait for the Zernio cancel job to land before giving up. */
const CANCEL_TIMEOUT_MS = 30_000
const POLL_INTERVAL_MS = 1_000

export type ConvertProgress = {
  done: number
  total: number
  /** Posts that could not be converted, with the reason. */
  failed: { post: Post; reason: string }[]
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

/**
 * Turns auto-scheduled posts into manually-published ones, preserving the date.
 *
 * There is no single transition for this. `scheduled` cannot move to
 * `scheduled_for_manual_publishing`, and leaving `scheduled` at all means
 * cancelling the Zernio job — which is asynchronous, so each post takes:
 *
 *   1. POST /cancel  → the worker eventually lands the post in ready_for_publish
 *   2. poll          → wait for that to actually happen
 *   3. PUT status    → ready_for_publish → scheduled_for_manual_publishing
 *
 * Between 1 and 3 the post is unscheduled. If the tab closes in that window it
 * stays that way: the date is still on the post, but nothing will publish it
 * until someone reschedules. Posts are processed one at a time so that a
 * failure interrupts a single post rather than leaving a whole batch in flight,
 * and every failure is reported rather than swallowed.
 *
 * This belongs on the server as one transactional endpoint — see the note in
 * the caller. It is done here because no such endpoint exists yet.
 */
export function useConvertToManualPublish() {
  const queryClient = useQueryClient()
  const [progress, setProgress] = useState<ConvertProgress | null>(null)

  const convert = useCallback(
    async (posts: Post[]): Promise<ConvertProgress> => {
      const failed: ConvertProgress['failed'] = []
      setProgress({ done: 0, total: posts.length, failed })

      for (const [i, post] of posts.entries()) {
        try {
          await cancelPost(post.id, 'ready_for_publish')

          const landed = await waitForCancel(post.id)
          if (!landed) {
            failed.push({
              post,
              reason: 'the publisher did not confirm the cancellation in time',
            })
            continue
          }

          await updatePost(post.id, {
            ...postToPayload(landed),
            status: 'scheduled_for_manual_publishing',
          })
        } catch (e) {
          failed.push({
            post,
            reason: e instanceof Error ? e.message : 'unknown error',
          })
        } finally {
          setProgress({ done: i + 1, total: posts.length, failed: [...failed] })
        }
      }

      // Every per-campaign post list and the workspace-wide one are now stale.
      await queryClient.invalidateQueries({ queryKey: ['posts'] })
      await queryClient.invalidateQueries({ queryKey: ['campaigns'] })

      const result = { done: posts.length, total: posts.length, failed }
      setProgress(result)
      return result
    },
    [queryClient],
  )

  return { convert, progress }
}

/**
 * Waits for the cancel worker to move the post out of `scheduled`, returning
 * the post once it has. Returns null on timeout so the caller can report the
 * post as untouched instead of writing a status change on top of a job that
 * may still be running.
 */
async function waitForCancel(id: string): Promise<Post | null> {
  const deadline = Date.now() + CANCEL_TIMEOUT_MS

  while (Date.now() < deadline) {
    await sleep(POLL_INTERVAL_MS)
    const post = await getPost(id)
    if (post.status === 'ready_for_publish') return post
    // Anything else terminal means the race was lost — the post published
    // before the cancel landed, or the publisher failed it. Either way there
    // is nothing to convert.
    if (post.status !== 'scheduled') return null
  }

  return null
}
