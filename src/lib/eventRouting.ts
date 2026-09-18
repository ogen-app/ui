import type { QueryFilters } from '@tanstack/react-query'
import { postKey } from '@/hooks/usePost'
import { postAssessmentKey } from '@/hooks/usePostAssessment'
import { campaignKey } from '@/hooks/useCampaigns'
import { ASSETS_KEY } from '@/hooks/useContent'
import { PLATFORMS_KEY } from '@/hooks/usePlatforms'
import { ZERNIO_ACCOUNTS_KEY, ZERNIO_HEALTH_KEY } from '@/hooks/useZernio'
import { localRunKey } from '@/lib/localRuns'
import {
  postNotesKey,
  postVersionsKey,
  WORKSPACE_POSTS_KEY,
} from '@/lib/queryKeys'
import type { AppEvent, EventSubject } from '@/types/events'

/**
 * What a broadcast event means to the query cache.
 *
 * This is the whole point of consuming `/api/events`: almost nothing in the
 * catalogue wants a notification, it wants an `invalidateQueries`. Screens then
 * update themselves — a teammate schedules a post and your calendar moves — with
 * no new UI anywhere.
 *
 * Two rules keep it honest:
 * - **Narrow beats blanket.** A refetch nobody asked for costs a round trip and
 *   can flicker a screen the user is reading. An event names one record; the
 *   filters it produces should too.
 * - **Nothing here shows anything.** Toasts are decided in `eventStreamStore`
 *   against a short allowlist, because most of this fires while the user is
 *   already looking at the thing that changed.
 */

/**
 * Post rows live under `['campaigns', <id>, 'posts']`, and an event names the
 * post without naming its campaign — so a list refresh has to match on shape.
 * Only *mounted* lists refetch, which is at most the calendar the user is on.
 */
const CAMPAIGN_POST_LISTS: QueryFilters = {
  predicate: (query) =>
    query.queryKey[0] === 'campaigns' && query.queryKey[2] === 'posts',
}

/**
 * The workspace-wide post list (`useAssetUsage`, auto-publish) holds the same
 * rows under its own root, deliberately outside `['campaigns']` — so no
 * campaign filter ever reaches it and it has to travel with the lists above
 * wherever a post changed.
 */
const WORKSPACE_POST_LIST: QueryFilters = { queryKey: WORKSPACE_POSTS_KEY }

const ZERNIO_SURFACES: QueryFilters[] = [
  // Platforms first: it — not the account list — is what the composer's account
  // picker and the post's mismatch warning actually read.
  { queryKey: PLATFORMS_KEY },
  { queryKey: ZERNIO_ACCOUNTS_KEY },
  { queryKey: ZERNIO_HEALTH_KEY },
]

/** Splits `entity:post:abc` and friends into the record they are about. */
export function parseTopic(topic: string): EventSubject {
  if (topic === 'zernio:sync') return { kind: 'zernioSync' }
  const parts = topic.split(':')
  if (parts.length === 3 && parts[0] === 'entity' && parts[2]) {
    switch (parts[1]) {
      case 'post':
        return { kind: 'post', id: parts[2] }
      case 'campaign':
        return { kind: 'campaign', id: parts[2] }
      case 'asset':
        return { kind: 'asset', id: parts[2] }
      case 'zernio_account':
        return { kind: 'zernioAccount', id: parts[2] }
    }
  }
  return { kind: 'unknown', topic }
}

/**
 * The `localRuns` key this event would duplicate, or null if it can't be a
 * duplicate of anything.
 *
 * Only terminal AI events qualify. `post_scheduled` looks similar but isn't:
 * it is a plain mutation whose initiator already invalidated, so a second
 * invalidation is merely redundant rather than harmful.
 */
export function localRunKeyFor(event: AppEvent): string | null {
  const subject = parseTopic(event.topic)
  switch (event.type) {
    case 'assistant_completed':
    case 'assistant_failed':
      if (subject.kind === 'post' || subject.kind === 'campaign') {
        return localRunKey('assistant', subject.id)
      }
      return null
    case 'assessment_completed':
    case 'assessment_failed':
      return subject.kind === 'post'
        ? localRunKey('assessment', subject.id)
        : null
    case 'content_plan_completed':
    case 'content_plan_failed':
      return subject.kind === 'campaign'
        ? localRunKey('contentPlan', subject.id)
        : null
    default:
      return null
  }
}

/**
 * `zernio.sync.ok` is the one event nobody triggered: a timer fires it for the
 * whole tenant whether or not anything moved. Refetching three queries on that
 * schedule, in every open tab, forever, is a cost with no user behind it — so
 * the summary decides.
 *
 * Shape as measured: `"upserts=1 soft_deletes=0"`. An unreadable summary counts
 * as a change; being wrong towards a refetch is the cheap direction.
 */
function syncChangedAnything(payload: Record<string, unknown> | null): boolean {
  const summary = payload?.summary
  if (typeof summary !== 'string') return true
  const counts = [...summary.matchAll(/=(\d+)/g)].map((m) => Number(m[1]))
  if (counts.length === 0) return true
  return counts.some((n) => n > 0)
}

/** Every query this event makes stale. Empty means the event changes nothing. */
export function invalidationsFor(event: AppEvent): QueryFilters[] {
  const subject = parseTopic(event.topic)

  switch (subject.kind) {
    case 'post': {
      const post = { queryKey: postKey(subject.id) }
      const versions = { queryKey: postVersionsKey(subject.id) }
      const notes = { queryKey: postNotesKey(subject.id) }
      switch (event.type) {
        // A background job wrote numbers no client could have known about.
        // The single genuinely new fact in the catalogue.
        case 'post.analytics.updated':
          return [post, CAMPAIGN_POST_LISTS, WORKSPACE_POST_LIST]
        // The clone is a new row, so only the lists change; `subject.id` is
        // the post it was cloned *from*, which didn't.
        case 'post_cloned':
          return [CAMPAIGN_POST_LISTS, WORKSPACE_POST_LIST]
        // A restore writes two versions (the auto-save of unsnapshotted
        // edits, then the copy) — the history is as stale as the post is.
        case 'post_restored':
          return [post, versions, CAMPAIGN_POST_LISTS, WORKSPACE_POST_LIST]
        case 'post_scheduled':
          return [post, CAMPAIGN_POST_LISTS, WORKSPACE_POST_LIST]
        // The post flow snapshots before it rewrites. Only reaches other
        // people's tabs — the actor's own copy is suppressed as a local run,
        // and handled where the turn settles (assistantStore.refreshSubject).
        // The turn may also have written notes (CON-188) — its `createNote`
        // tool persists as it runs, and a note-only turn changes neither the
        // body nor the history. Listed unconditionally because the broadcast
        // carries no record of which tools fired.
        case 'assistant_completed':
          // The list comes along because the turn may have rewritten the
          // title, and a calendar showing the old one has no other way to
          // find out — there is no `post_updated` in the catalogue. Same rule
          // as everywhere here: if the post is stale, the rows are too.
          return [
            post,
            versions,
            notes,
            CAMPAIGN_POST_LISTS,
            WORKSPACE_POST_LIST,
          ]
        case 'assistant_failed':
          // Notes are written by the tool as it goes, not at the end, so a
          // failed turn can still have left some behind — and a turn that
          // failed part-way can have written the body first.
          return [post, notes, CAMPAIGN_POST_LISTS, WORKSPACE_POST_LIST]
        case 'assessment_completed':
        case 'assessment_failed':
          // Its own namespace, deliberately not nested under the post — see
          // `postAssessmentKey`.
          return [{ queryKey: postAssessmentKey(subject.id) }]
        default:
          return []
      }
    }

    case 'campaign':
      switch (event.type) {
        case 'assistant_completed':
        case 'assistant_failed':
        case 'content_plan_completed':
        case 'content_plan_failed':
          // The post list and the overview both nest under this key, and a
          // content plan writes posts, so one filter covers all three. The
          // workspace-wide list holds those same posts outside the namespace.
          return [{ queryKey: campaignKey(subject.id) }, WORKSPACE_POST_LIST]
        default:
          return []
      }

    case 'asset': {
      // A document read in the background — a scraped page (CON-222), and the
      // PDF pipeline once it publishes these too. The event carries the status
      // and some counts, never the text, so the only thing to do with it is
      // refetch: the row's word count and the open editor both read `content`.
      if (event.type !== 'asset.updated') return []
      // One filter, not two: an open document's key nests under the list's
      // (`['assets', id]`), so this reaches the row and the editor both.
      return [{ queryKey: ASSETS_KEY }]
    }

    case 'zernioAccount':
      // All five (attached, attach_failed, updated, disconnected, revived)
      // change which accounts are publishable, which is the same set of reads.
      return event.type.startsWith('zernio.account.') ? ZERNIO_SURFACES : []

    case 'zernioSync':
      if (event.type === 'zernio.sync.failed') return ZERNIO_SURFACES
      if (
        event.type === 'zernio.sync.ok' &&
        syncChangedAnything(event.payload)
      ) {
        return ZERNIO_SURFACES
      }
      return []

    case 'unknown':
      return []
  }
}

/**
 * What to refetch after the stream comes back from a drop.
 *
 * There is no replay — the server holds no log — so a reconnect can't ask what
 * it missed, and the gap has no upper bound. The only correct move is to assume
 * everything the stream covers is stale. This list is therefore the union of
 * every target above, and it has to be updated alongside them.
 *
 * Deliberately not `invalidateQueries()` with no filter: that would sweep in
 * settings, tags and the session, none of which this stream reports on.
 */
export const RECONCILE_FILTERS: QueryFilters[] = [
  { queryKey: ['post'] },
  // Covers the list and every open document — `assetKey` nests under it.
  { queryKey: ASSETS_KEY },
  { queryKey: ['postAssessment'] },
  { queryKey: ['campaigns'] },
  WORKSPACE_POST_LIST,
  ...ZERNIO_SURFACES,
]
