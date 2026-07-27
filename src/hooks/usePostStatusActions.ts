import { useState } from 'react'
import type { Post, PostStatus } from '@/types/posts'
import {
  getActionMeta,
  getAllowedNextStatuses,
  getTransitionBlockers,
  isPublishMethodEdge,
  isTerminalStatus,
  PUBLISH_METHOD_TARGET,
  type PostStatusActionIntent,
  type PostStatusActionKind,
  type PostStatusActionMechanism,
  type PostStatusBlocker,
  type PublishMethod,
} from '@/lib/postStatusMachine'
import type { TransitionStatusResult } from '@/hooks/usePost'
import type { CancelTarget } from '@/services/api/posts'
import { toast } from '@/stores/toastStore'

export type PostStatusAction = {
  next: PostStatus
  buttonLabel: string
  menuLabel: string
  intent: PostStatusActionIntent
  kind: PostStatusActionKind
  mechanism: PostStatusActionMechanism
  disabled: boolean
  blockers: PostStatusBlocker[]
  run: () => Promise<TransitionStatusResult>
}

type UsePostStatusActionsOptions = {
  post: Post
  transitionStatus: (next: PostStatus) => Promise<TransitionStatusResult>
  schedule: () => Promise<TransitionStatusResult>
  cancelScheduled: (target: CancelTarget) => Promise<TransitionStatusResult>
  // True while a cancellation is in flight (see usePost.cancelling).
  // Disables every action so a second cancel job can't be enqueued.
  cancelling?: boolean
  // Resolves the `ready_for_publish` fork: only the matching edge is
  // offered, so SCHEDULE is a single action rather than two same-named ones.
  publishMethod: PublishMethod
}

type UsePostStatusActionsResult = {
  current: PostStatus
  isTerminal: boolean
  // All transitions defined in the machine for the current status,
  // including system-driven ones and both sides of the publish-method fork.
  actions: PostStatusAction[]
  // What the user may actually do right now: system edges dropped, the
  // publish-method fork resolved, most-prominent first. The header shows
  // the first of these; the status badge menu shows all of them.
  userActions: PostStatusAction[]
  // Shorthand for userActions[0].
  primary: PostStatusAction | null
  // True while any transition is in flight; gates concurrent clicks
  // since the underlying mutation owns the cache and only one PUT
  // should be in flight at a time.
  pending: boolean
}

const INTENT_RANK: Record<PostStatusActionIntent, number> = {
  primary: 0,
  secondary: 1,
  destructive: 2,
}

export function usePostStatusActions({
  post,
  transitionStatus,
  schedule,
  cancelScheduled,
  cancelling = false,
  publishMethod,
}: UsePostStatusActionsOptions): UsePostStatusActionsResult {
  const [pending, setPending] = useState(false)

  const actions: PostStatusAction[] = getAllowedNextStatuses(post.status).flatMap(
    (next) => {
      const meta = getActionMeta(post.status, next)
      if (!meta) return []
      const mechanism: PostStatusActionMechanism = meta.mechanism ?? 'transition'
      const blockers = getTransitionBlockers(post, next)
      return [
        {
          next,
          buttonLabel: meta.buttonLabel,
          menuLabel: meta.menuLabel,
          intent: meta.intent,
          kind: meta.kind,
          mechanism,
          disabled: blockers.length > 0 || pending || cancelling,
          blockers,
          run: async () => {
            if (blockers.length > 0) {
              const message = blockers.map((b) => b.message).join('; ')
              toast.error('Not ready yet', { description: message })
              return { ok: false, error: message }
            }
            setPending(true)
            // Route by mechanism so a schedule or user-cancel never
            // executes as a plain status PUT — see
            // PostStatusActionMechanism.
            const result =
              mechanism === 'cancel'
                ? await cancelScheduled(next as CancelTarget)
                : mechanism === 'schedule'
                  ? await schedule()
                  : await transitionStatus(next)
            setPending(false)
            reportActionResult(mechanism, result)
            return result
          },
        },
      ]
    },
  )

  // Hide system-driven transitions (e.g. the publisher worker marking
  // `scheduled` → `published`) — the user shouldn't trigger those — and keep
  // only the side of the publish-method fork the picker selected.
  const userActions = actions
    .filter((a) => a.kind === 'user')
    .filter(
      (a) =>
        !isPublishMethodEdge(post.status, a.next) ||
        a.next === PUBLISH_METHOD_TARGET[publishMethod],
    )
    .sort((a, b) => INTENT_RANK[a.intent] - INTENT_RANK[b.intent])

  return {
    current: post.status,
    isTerminal: isTerminalStatus(post.status),
    actions,
    userActions,
    primary: userActions[0] ?? null,
    pending,
  }
}

// Surfaces the outcome of a status action as a toast. Errors always
// notify; on success we only toast for scheduling — it's the one action
// with a non-obvious outcome (async, and the allowlist may route it to
// manual publishing). Other transitions flip the badge visibly, so a
// success toast there would just be noise.
function reportActionResult(
  mechanism: PostStatusActionMechanism,
  result: TransitionStatusResult,
) {
  if (!result.ok) {
    toast.error('Something went wrong', { description: result.error })
    return
  }
  if (mechanism !== 'schedule') return
  if (result.notice) {
    toast.message('Scheduled for manual publishing', {
      description: result.notice,
    })
  } else {
    toast.success('Post scheduled')
  }
}
