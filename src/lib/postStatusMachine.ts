import type { PublishingAccountResolution } from '@/lib/publishingAccount'
import type { Post, PostStatus } from '@/types/posts'

// Mirrors src/models/post.go ValidPostTransitions. Keep in sync with the
// server — the server is the source of truth and will reject any edge
// not listed here with a 400.
//
// `scheduled` has five outgoing edges, but they are NOT all the same kind
// of move (see ACTION_META below):
//   - → published / → failed are driven automatically by the publisher
//     worker; the user never triggers them.
//   - → ready_for_publish / → draft are user-requested cancellations that
//     go through POST /api/posts/:id/cancel (which cancels the Zernio job),
//     not a plain status PUT — the worker lands the status change later.
//   - → scheduled_for_manual_publishing is the server's own convert-to-manual
//     move (CON-130), taken when a platform's auto-publish allowlist is turned
//     off under a post that is already scheduled. There is no client route to
//     it: `cancel` accepts only ready_for_publish or draft as a target.
//
// The three edges into `draft` from a status the post can come *back* from —
// scheduled_for_manual_publishing, failed and not_published — are CON-251's
// (the last two) and CON-130's (the first). None of those statuses holds a
// copy outside Ogen: the submission failed, or never left. Reopening them for
// editing is the point, and reopening as far as `draft` rather than only
// `ready_for_publish` is the rest of it, because needing the words changed is
// exactly how a post reaches them.
const POST_STATUS_TRANSITIONS: Record<PostStatus, PostStatus[]> = {
  draft: ['ready_for_publish'],
  ready_for_publish: ['scheduled', 'scheduled_for_manual_publishing', 'draft'],
  scheduled: [
    'failed',
    'published',
    'ready_for_publish',
    'draft',
    'scheduled_for_manual_publishing',
  ],
  scheduled_for_manual_publishing: ['published', 'not_published', 'draft'],
  failed: ['ready_for_publish', 'draft'],
  published: [],
  not_published: [
    'ready_for_publish',
    'scheduled_for_manual_publishing',
    'draft',
  ],
}

export function getAllowedNextStatuses(current: PostStatus): PostStatus[] {
  return POST_STATUS_TRANSITIONS[current] ?? []
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
//   - 'verify': POST /api/posts/:id/verify-external. Only for
//     scheduled_for_manual_publishing → published. The user has published
//     by hand on the platform; handing us the post's URL is what completes
//     the move. The server matches the URL through Zernio's on-demand sync
//     and, on a match, back-fills publisher_post_id, marks the post
//     published and writes a first analytics snapshot — none of which the
//     PUT path does, leaving the post published but unlinked and therefore
//     invisible to analytics. Unlike the other mechanisms this one doesn't
//     fire a request from the action itself: it opens the dialog that asks
//     for the URL (see usePostStatusActions), and that dialog owns the
//     call — including the fallback to a plain PUT when the user can't
//     supply a link (Zernio cannot verify LinkedIn personal accounts).
export type PostStatusActionMechanism =
  | 'transition'
  | 'schedule'
  | 'cancel'
  | 'verify'

type ActionMeta = {
  // ALL CAPS form, used as the prominent header button label.
  buttonLabel: string
  // Sentence-case form, used inside the overflow dropdown menu.
  menuLabel: string
  intent: PostStatusActionIntent
  kind: PostStatusActionKind
  // Omitted means 'transition'. Only set on user-cancel edges.
  mechanism?: PostStatusActionMechanism
  // The one way *back* out of this status, shown as the header's icon-only
  // back button instead of a labelled one. At most one edge per status
  // carries it, so the control never means "pick a destination": multi-step
  // retreats (scheduled straight to draft) are reached by pressing it twice.
  //
  // "Back" is the retreat from the status, not strictly its inverse — a post
  // scheduled for manual publishing goes back by admitting it never went
  // out. What the flag really marks is the move that isn't the one the
  // header should be urging.
  reverse?: true
}

// Reopening a post for editing: the same move, in the same words, from every
// status that has one. Nothing of a post in `ready_for_publish`,
// `scheduled_for_manual_publishing`, `failed` or `not_published` lives outside
// Ogen — it was never submitted, or the submission failed — so the document
// simply goes back to being a draft (CON-130, CON-251). A plain status PUT
// everywhere: none of these edges has a Zernio job to cancel.
const BACK_TO_DRAFT: ActionMeta = {
  buttonLabel: 'BACK TO DRAFT',
  menuLabel: 'Back to draft',
  intent: 'secondary',
  kind: 'user',
}

const ACTION_META: Record<
  PostStatus,
  Partial<Record<PostStatus, ActionMeta>>
> = {
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
    // The only one of the four that is also the way *back* out of its status:
    // from `ready_for_publish` there is nowhere else to retreat to.
    draft: { ...BACK_TO_DRAFT, reverse: true },
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
      reverse: true,
    },
    // Deliberately not `reverse`: unscheduling straight to draft is two
    // steps back, and the same place is reached by unscheduling and then
    // pressing back again. Kept here so the machine still mirrors the
    // server's edge list.
    draft: {
      buttonLabel: 'UNSCHEDULE TO DRAFT',
      menuLabel: 'Unschedule & move to draft',
      intent: 'secondary',
      kind: 'user',
      mechanism: 'cancel',
    },
    // The server's convert-to-manual move (CON-130), not the user's: it fires
    // when a platform's auto-publish allowlist is turned off under a post that
    // is already scheduled. Listed so the machine mirrors the server, `system`
    // so nothing offers it — the cancel endpoint takes only ready_for_publish
    // or draft, so there is no request the UI could send for this edge.
    scheduled_for_manual_publishing: {
      buttonLabel: 'SWITCH TO MANUAL PUBLISHING',
      menuLabel: 'Switch to manual publishing',
      intent: 'secondary',
      kind: 'system',
    },
  },
  scheduled_for_manual_publishing: {
    published: {
      buttonLabel: 'MARK AS PUBLISHED',
      menuLabel: 'Mark as published',
      intent: 'primary',
      kind: 'user',
      // Asks for the published post's URL and verifies it, rather than
      // flipping the status blind — see 'verify' above.
      mechanism: 'verify',
    },
    // The back button, not a second labelled one: publishing is the move the
    // header should be urging, and admitting it never went out is the way
    // back out of the status.
    not_published: {
      buttonLabel: 'MARK AS NOT PUBLISHED',
      menuLabel: 'Mark as not published',
      intent: 'destructive',
      kind: 'user',
      reverse: true,
    },
    // Reopening for editing, in all three statuses that carry it (see
    // BACK_TO_DRAFT). Not `reverse` in any of them: two of the three already
    // spend that flag on an edge the header shouldn't urge, and a control that
    // means "back to draft" in one status and something else one status over
    // is worse than a plain labelled button in all three.
    draft: BACK_TO_DRAFT,
  },
  failed: {
    ready_for_publish: {
      buttonLabel: 'RETRY TO PUBLISH',
      menuLabel: 'Retry to publish',
      intent: 'primary',
      kind: 'user',
    },
    draft: BACK_TO_DRAFT,
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
      reverse: true,
    },
    draft: BACK_TO_DRAFT,
  },
}

export function getActionMeta(
  from: PostStatus,
  to: PostStatus,
): ActionMeta | null {
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
  field:
    | 'platform_id'
    | 'platform_post_type'
    | 'scheduled_at'
    | 'social_account_id'
  message: string
}

/**
 * What `getTransitionBlockers` needs that the post itself doesn't carry.
 * Account selection depends on how many accounts the platform has connected
 * — server state — so it has to be handed in.
 */
export type TransitionContext = {
  /**
   * The post's publishing account, resolved against the platform's
   * connected accounts (`usePublishingAccount`).
   */
  account: Pick<PublishingAccountResolution, 'ambiguous' | 'mismatched'>
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
// - Account selection on the auto-publish edge: checkAccountSelection in
//   src/post_actions/schedule/schedule.go (CON-150). Scoped to `scheduled`
//   exactly as the server scopes it — a manual-publish post never reaches
//   the submit worker, so which account it "would" go out as is moot and
//   demanding a choice there would invent a requirement the API doesn't
//   have.
export function getTransitionBlockers(
  post: Post,
  next: PostStatus,
  context: TransitionContext,
): PostStatusBlocker[] {
  const blockers: PostStatusBlocker[] = []
  if (next !== 'draft') {
    if (!post.platform_id) {
      blockers.push({ field: 'platform_id', message: 'Pick a platform first' })
    }
    if (!post.platform_post_type) {
      blockers.push({
        field: 'platform_post_type',
        message: 'Pick a post type first',
      })
    }
  }
  if (next === 'scheduled' || next === 'scheduled_for_manual_publishing') {
    if (!post.scheduled_at) {
      blockers.push({
        field: 'scheduled_at',
        message: 'Set a publish date first',
      })
    } else if (new Date(post.scheduled_at).getTime() <= Date.now()) {
      blockers.push({
        field: 'scheduled_at',
        message: 'Publish date must be in the future',
      })
    }
  }
  if (next === 'scheduled') {
    if (context.account.mismatched) {
      blockers.push({
        field: 'social_account_id',
        message: 'Pick a connected account to publish as',
      })
    } else if (context.account.ambiguous) {
      blockers.push({
        field: 'social_account_id',
        message: 'Choose which account to publish as',
      })
    }
  }
  return blockers
}

// Whether a copy of this post already exists outside Ogen (CON-251) — the one
// question every read-only surface on the post screen asks.
//
// `scheduled` means Zernio holds the submission; `published` means the social
// network holds the post. In both, an edit here changes what Ogen displays and
// not what went out, so the document is locked and the record stands. The two
// differ by reversibility rather than permission, which is the caller's
// business: a scheduled post's lock can name its way out, a published one's
// cannot.
//
// Deliberately NOT `isTerminalStatus`. That is true of `published` alone today,
// so it would pass every test — and then silently lock the next status anyone
// gives an empty edge list to.
//
// Just as deliberately false for `scheduled_for_manual_publishing`: nothing has
// been submitted anywhere, and the date is a reminder to a human. `failed` and
// `not_published` are the copy coming back, which is precisely when an edit is
// the point.
//
// This is also the seam. The day a post is frozen for some other reason — an
// approval, a channel freeze, a client sign-off — this predicate changes and no
// call site does.
//
// A type predicate rather than a plain boolean so the caller that has to tell
// the two apart — the notice explaining the lock, which needs a different
// sentence for each — narrows instead of re-testing the status by hand.
export type SubmittedStatus = Extract<PostStatus, 'scheduled' | 'published'>

export function isSubmitted(status: PostStatus): status is SubmittedStatus {
  return status === 'scheduled' || status === 'published'
}

// Whether scheduled_at may be edited in the current status (settings-form
// date picker, calendar drag-and-drop). Locked while `scheduled`: the
// Zernio submission already carries the publish time, so a PUT would only
// change the displayed date — the post would still publish at the original
// time. Unschedule first, then re-schedule. Locked once `published`: the
// date is history.
//
// The same rule as the document's, for the same reason, so it is written as
// the same predicate rather than a second copy of the status list — if the two
// ever have to diverge, this is the one line that moves.
export function canEditScheduledAt(status: PostStatus): boolean {
  return !isSubmitted(status)
}

// Whether the publishing account may still be changed (CON-150). Locked for
// the same reason as scheduled_at, and in the same two statuses: the Zernio
// submission already names the account, so a PUT while `scheduled` would
// change the displayed account and nothing else — the post would still go
// out as the original one. Unschedule first. Once `published` it is history.
export function canEditPublishingAccount(status: PostStatus): boolean {
  return canEditScheduledAt(status)
}

// Whether this post can have numbers yet — the gate on asking
// `GET /api/posts/:id/analytics` at all.
//
// Deliberately narrower than "submitted". A `scheduled` post has handed a
// submission to Zernio and still gone out nowhere, so there is nothing to
// measure and the request could only ever answer 409; the same goes for
// `scheduled_for_manual_publishing`, where a human has not been yet. Only
// `published` means a copy of this post exists on a network — whether the
// publisher put it there or a person did and linked it back with
// `verify-external`, which is the transition that produces the publisher id
// the analytics sweep follows.
//
// So this is not `isTerminalStatus` and not `isSubmitted`. It agrees with
// `isTerminalStatus` on every status in the app today, which is exactly why it
// is written out: the day a second terminal status is added, that one would
// start claiming numbers it has none of.
export function canHaveAnalytics(status: PostStatus): boolean {
  return status === 'published'
}
