import type { Post, PostStatus } from '@/types/posts'

// Mirrors src/models/post.go ValidPostTransitions. Keep in sync with the
// server — the server is the source of truth and will reject any edge
// not listed here with a 400.
//
// `scheduled` has four outgoing edges, but they are NOT all the same kind
// of move (see ACTION_META below):
//   - → published / → failed are driven automatically by the publisher
//     worker; the user never triggers them.
//   - → ready_for_publish / → draft are user-requested cancellations that
//     go through POST /api/posts/:id/cancel (which cancels the Zernio job),
//     not a plain status PUT — the worker lands the status change later.
export const POST_STATUS_TRANSITIONS: Record<PostStatus, PostStatus[]> = {
  draft: ['ready_for_publish'],
  ready_for_publish: ['scheduled', 'scheduled_for_manual_publishing', 'draft'],
  scheduled: ['failed', 'published', 'ready_for_publish', 'draft'],
  scheduled_for_manual_publishing: ['published', 'not_published'],
  failed: ['ready_for_publish'],
  published: [],
  not_published: ['ready_for_publish', 'scheduled_for_manual_publishing'],
}

export function getAllowedNextStatuses(current: PostStatus): PostStatus[] {
  return POST_STATUS_TRANSITIONS[current] ?? []
}

export function canTransition(from: PostStatus, to: PostStatus): boolean {
  if (from === to) return true
  return getAllowedNextStatuses(from).includes(to)
}

export function isTerminalStatus(status: PostStatus): boolean {
  return getAllowedNextStatuses(status).length === 0
}

export type PostStatusActionIntent = 'primary' | 'secondary' | 'destructive'

// `kind: 'system'` means the transition is driven by a backend process
// (e.g. the publisher worker marks `scheduled` → `published`), not by the
// user clicking a button. The UI hides these — they're listed only so the
// machine is complete. `kind: 'user'` transitions surface as buttons.
export type PostStatusActionKind = 'user' | 'system'

// How a `kind: 'user'` transition is executed against the API. This keeps
// automatic/worker-completed moves from being blended with synchronous
// ones:
//   - 'transition' (default): synchronous PUT /api/posts/:id; the status
//     flips immediately in the response.
//   - 'schedule': POST /api/posts/:id/schedule. Only for
//     ready_for_publish → scheduled. The dedicated endpoint validates
//     scheduled_at (required, in the future) and routes auto- vs
//     manual-publish via the workspace allowlist — the response carries
//     the routed status, which may be scheduled_for_manual_publishing.
//     The PUT path must not be used for this edge: its RouteAndPersist
//     deliberately skips the date validation, so a dateless/past
//     schedule would publish almost immediately.
//   - 'cancel': POST /api/posts/:id/cancel. The post stays in `scheduled`
//     until the Zernio cancel job confirms, then the backend moves it to
//     the target status. The UI learns the new status by polling, NOT from
//     the request response. A plain PUT here would flip the local status
//     while the auto-publish job keeps running — the publisher would then
//     publish a post the user thought they had unscheduled.
export type PostStatusActionMechanism = 'transition' | 'schedule' | 'cancel'

type ActionMeta = {
  // ALL CAPS form, used as the prominent header button label.
  buttonLabel: string
  // Sentence-case form, used inside the overflow dropdown menu.
  menuLabel: string
  intent: PostStatusActionIntent
  kind: PostStatusActionKind
  // Omitted means 'transition'. Only set on user-cancel edges.
  mechanism?: PostStatusActionMechanism
}

const ACTION_META: Record<PostStatus, Partial<Record<PostStatus, ActionMeta>>> = {
  draft: {
    ready_for_publish: {
      buttonLabel: 'MARK AS READY',
      menuLabel: 'Mark as ready',
      intent: 'primary',
      kind: 'user',
    },
  },
  ready_for_publish: {
    scheduled: {
      buttonLabel: 'SCHEDULE',
      menuLabel: 'Schedule',
      intent: 'primary',
      kind: 'user',
      mechanism: 'schedule',
    },
    // Stays a plain PUT: the server respects an explicit manual-publish
    // choice on this edge (no allowlist routing, no Zernio job), whereas
    // the schedule endpoint would route an allowlisted platform to
    // auto-publish against the user's intent.
    //
    // Labelled plainly "Schedule", same as the edge above: which of the two
    // fires is decided by the publish-method picker, not by picking a
    // differently-named action. See PublishMethod.
    scheduled_for_manual_publishing: {
      buttonLabel: 'SCHEDULE',
      menuLabel: 'Schedule',
      intent: 'primary',
      kind: 'user',
    },
    draft: {
      buttonLabel: 'BACK TO DRAFT',
      menuLabel: 'Back to draft',
      intent: 'secondary',
      kind: 'user',
    },
  },
  scheduled: {
    // System edges: the publisher worker drives these; never shown as
    // buttons. Listed so the machine mirrors the server.
    published: {
      buttonLabel: 'MARK AS PUBLISHED',
      menuLabel: 'Mark as published',
      intent: 'primary',
      kind: 'system',
    },
    failed: {
      buttonLabel: 'MARK AS FAILED',
      menuLabel: 'Mark as failed',
      intent: 'destructive',
      kind: 'system',
    },
    // User-cancel edges: go through POST /api/posts/:id/cancel so the
    // Zernio job is cancelled before the post leaves `scheduled`.
    ready_for_publish: {
      buttonLabel: 'UNSCHEDULE',
      menuLabel: 'Unschedule',
      intent: 'secondary',
      kind: 'user',
      mechanism: 'cancel',
    },
    draft: {
      buttonLabel: 'UNSCHEDULE TO DRAFT',
      menuLabel: 'Unschedule & move to draft',
      intent: 'secondary',
      kind: 'user',
      mechanism: 'cancel',
    },
  },
  scheduled_for_manual_publishing: {
    published: {
      buttonLabel: 'MARK AS PUBLISHED',
      menuLabel: 'Mark as published',
      intent: 'primary',
      kind: 'user',
    },
    not_published: {
      buttonLabel: 'MARK AS NOT PUBLISHED',
      menuLabel: 'Mark as not published',
      intent: 'destructive',
      kind: 'user',
    },
  },
  failed: {
    ready_for_publish: {
      buttonLabel: 'RETRY TO PUBLISH',
      menuLabel: 'Retry to publish',
      intent: 'primary',
      kind: 'user',
    },
  },
  published: {},
  not_published: {
    scheduled_for_manual_publishing: {
      buttonLabel: 'RESCHEDULE',
      menuLabel: 'Reschedule',
      intent: 'primary',
      kind: 'user',
    },
    ready_for_publish: {
      buttonLabel: 'MOVE TO READY FOR PUBLISH',
      menuLabel: 'Move to ready for publish',
      intent: 'secondary',
      kind: 'user',
    },
  },
}

export function getActionMeta(from: PostStatus, to: PostStatus): ActionMeta | null {
  return ACTION_META[from]?.[to] ?? null
}

/**
 * How a ready post leaves the gate. The server has no field for this — the
 * choice IS the status you land in, which is why `ready_for_publish` has two
 * outgoing schedule edges carrying the same label. The UI picks one up front
 * (see the quick-settings bar) so only a single SCHEDULE button is ever
 * offered, instead of two identically-named actions in a menu.
 *
 * `auto` is a request, not a guarantee: POST /api/posts/:id/schedule routes
 * to manual publishing anyway when the workspace isn't allowlisted for the
 * platform, and the response's notice says so.
 */
export type PublishMethod = 'auto' | 'manual'

export const PUBLISH_METHOD_TARGET: Record<PublishMethod, PostStatus> = {
  auto: 'scheduled',
  manual: 'scheduled_for_manual_publishing',
}

export const PUBLISH_METHOD_LABELS: Record<PublishMethod, string> = {
  auto: 'Auto-publish',
  manual: 'Manual publish',
}

export const PUBLISH_METHOD_HINTS: Record<PublishMethod, string> = {
  auto: 'Ogen posts it for you at the scheduled time.',
  manual: 'Ogen reminds you at the scheduled time — you post it yourself.',
}

/**
 * True for the two `ready_for_publish` edges that differ only by publish
 * method. Exactly one of them is offered at a time.
 */
export function isPublishMethodEdge(from: PostStatus, to: PostStatus): boolean {
  return (
    from === 'ready_for_publish' &&
    (to === 'scheduled' || to === 'scheduled_for_manual_publishing')
  )
}

export type PostStatusBlocker = {
  field: 'platform_id' | 'platform_post_type' | 'scheduled_at'
  message: string
}

// Mirrors the server's pre-transition rules. Returns blockers the UI
// should show before letting the user attempt the transition; the server
// re-validates and rejects violations anyway.
//
// - Platform fields: requirePlatformIfNotDraft in src/handlers/posts.go —
//   any non-draft status requires both.
// - scheduled_at on the schedule edges: ErrScheduledAtRequired /
//   ErrScheduledAtInPast in src/post_actions/schedule/schedule.go. The
//   server only enforces these on POST /api/posts/:id/schedule (the
//   `scheduled` edge); the manual-publish edge goes through the PUT path,
//   which doesn't validate the date — there the check is client-only, kept
//   for the same reason (a reminder date that is missing or already past
//   is meaningless).
export function getTransitionBlockers(post: Post, next: PostStatus): PostStatusBlocker[] {
  const blockers: PostStatusBlocker[] = []
  if (next !== 'draft') {
    if (!post.platform_id) {
      blockers.push({ field: 'platform_id', message: 'Pick a platform first' })
    }
    if (!post.platform_post_type) {
      blockers.push({ field: 'platform_post_type', message: 'Pick a post type first' })
    }
  }
  if (next === 'scheduled' || next === 'scheduled_for_manual_publishing') {
    if (!post.scheduled_at) {
      blockers.push({ field: 'scheduled_at', message: 'Set a publish date first' })
    } else if (new Date(post.scheduled_at).getTime() <= Date.now()) {
      blockers.push({
        field: 'scheduled_at',
        message: 'Publish date must be in the future',
      })
    }
  }
  return blockers
}

// Whether scheduled_at may be edited in the current status (settings-form
// date picker, calendar drag-and-drop). Locked while `scheduled`: the
// Zernio submission already carries the publish time, so a PUT would only
// change the displayed date — the post would still publish at the original
// time. Unschedule first, then re-schedule. Locked once `published`: the
// date is history.
export function canEditScheduledAt(status: PostStatus): boolean {
  return status !== 'scheduled' && status !== 'published'
}
