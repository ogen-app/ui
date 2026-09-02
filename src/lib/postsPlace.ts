import { formatAnchor, parseAnchor } from '@/components/campaigns/calendar/date'

/**
 * Where the user last was in a campaign's posts, so that coming back lands
 * there rather than on today.
 *
 * The problem this solves is not politeness. A campaign's posts are usually
 * *not* in the current week — you plan September in August — so "today" is the
 * one week reliably guaranteed to be empty, and every return trip through a
 * post cost the user the navigation they had just done. Remembering it is what
 * makes the calendar somewhere you can leave and come back to.
 *
 * Deliberately device-local (`settingsStore`, localStorage) rather than
 * `/api/settings`: this is where you are, not a preference, and the tenant-wide
 * settings table is both shared with the whole workspace and the wrong shape
 * for something rewritten on every arrow press. It is persisted rather than
 * session-only because "resume where I left off" has to survive a reload to be
 * worth anything.
 */

/**
 * The three arrangements a campaign's posts can be read in. The same vocabulary
 * the view switcher offers (`PostsToolbar`), because it is the same choice —
 * two calendar granularities and the table.
 */
export const POSTS_VIEWS = ['week', 'month', 'list'] as const
export type PostsView = (typeof POSTS_VIEWS)[number]

/** The two that draw a date range, and so the two an anchor means anything to. */
export type CalendarGranularity = Exclude<PostsView, 'list'>

export type PostsPlace = {
  /** The arrangement last chosen — the list included. */
  view: PostsView
  /**
   * The day the calendar was drawn around, as the route's own `YYYY-MM-DD`
   * param rather than a `Date`. What is remembered is then exactly what the URL
   * said, with nothing to re-derive or re-serialise on the way back.
   */
  anchor: string
  /**
   * The last *calendar* granularity, kept while the user is in the list.
   *
   * Not derivable from `view`, which is why it is stored: the list is neither
   * granularity, and an entry point that names the calendar — the sidebar's
   * Posts row, the overview's calendar card, a bare `/calendar` URL — still has
   * to open one. Without this it would have to guess, and it would guess
   * "week" at someone who reads their campaign by the month.
   */
  granularity: CalendarGranularity
}

export function isPostsView(value: unknown): value is PostsView {
  return (POSTS_VIEWS as readonly unknown[]).includes(value)
}

export function isCalendarGranularity(
  value: unknown,
): value is CalendarGranularity {
  return value === 'week' || value === 'month'
}

/** What a campaign with no history behind it opens on: this week. */
export function defaultPostsPlace(): PostsPlace {
  return { view: 'week', anchor: formatAnchor(new Date()), granularity: 'week' }
}

/**
 * Fold one visit into what is remembered.
 *
 * The list passes no anchor, because it has none — it keeps whatever the
 * calendar last left, which is what lets a trip out to the table and back land
 * on the week you were reading rather than on today.
 *
 * Returns the previous value unchanged when nothing moved. That identity is
 * load-bearing: the calendar records on every anchor change, and a store write
 * per render would be a loop rather than a memory.
 */
export function rememberVisit(
  prev: PostsPlace | undefined,
  visit: { view: PostsView; anchor?: string },
): PostsPlace {
  const base = prev ?? defaultPostsPlace()
  const next: PostsPlace = {
    view: visit.view,
    anchor: visit.anchor ?? base.anchor,
    granularity: isCalendarGranularity(visit.view)
      ? visit.view
      : base.granularity,
  }
  return prev &&
    prev.view === next.view &&
    prev.anchor === next.anchor &&
    prev.granularity === next.granularity
    ? prev
    : next
}

/**
 * Everything remembered — where "back to this campaign's posts" belongs.
 *
 * Used by the entry points that mean *the posts*, wherever the user keeps them:
 * the post editor's back arrow above all, since it is the one place where the
 * user is provably mid-journey and knows exactly where they came from.
 */
export function postsPlaceOf(
  places: Record<string, PostsPlace>,
  campaignId: string,
): PostsPlace {
  return places[campaignId] ?? defaultPostsPlace()
}

/**
 * Just the calendar's position — for the entry points that name the calendar
 * rather than the posts, which must open one whatever the user last did.
 *
 * A bare `/calendar` URL is the clearest case: it says calendar, so it may
 * restore the week but must never redirect to the table.
 */
export function calendarPlaceOf(
  places: Record<string, PostsPlace>,
  campaignId: string,
): { anchor: string; view: CalendarGranularity } {
  const place = postsPlaceOf(places, campaignId)
  return { anchor: place.anchor, view: place.granularity }
}

/**
 * A remembered place as a route target, for the call sites whose link component
 * is typed loosely enough to take one — the sidebar's, which is handed a
 * `to: string` because it renders every section from one table.
 *
 * Anywhere a real `<Link>` is written out, branch on `place.view` instead and
 * keep the literal `to`: that is what gives the params their types.
 */
export function postsPlaceLink(
  campaignId: string,
  place: PostsPlace,
): { to: string; params: Record<string, string> } {
  return place.view === 'list'
    ? { to: '/campaigns/$campaignId/list', params: { campaignId } }
    : {
        to: '/campaigns/$campaignId/calendar/$anchor/$view',
        params: { campaignId, anchor: place.anchor, view: place.view },
      }
}

/**
 * Read the persisted map back, dropping anything malformed.
 *
 * localStorage is the one place a value arrives from outside this build — a
 * hand-edited blob, or one written by a version that knew a different set of
 * views — and a bad anchor here would not render wrong, it would put the router
 * into `beforeLoad`'s normalising redirect on every navigation. Entries are
 * repaired field by field rather than dropped whole, so a stored granularity
 * this build doesn't recognise costs the granularity and not the week.
 */
export function sanitizePostsPlaces(raw: unknown): Record<string, PostsPlace> {
  if (!raw || typeof raw !== 'object') return {}
  const places: Record<string, PostsPlace> = {}
  for (const [campaignId, value] of Object.entries(
    raw as Record<string, unknown>,
  )) {
    if (!value || typeof value !== 'object') continue
    const { view, anchor, granularity } = value as Partial<PostsPlace>
    // The anchor is the one field with no sane fallback: an entry without a
    // real day is not a place, and today is already what the absence means.
    if (typeof anchor !== 'string' || !parseAnchor(anchor)) continue
    if (!isPostsView(view)) continue
    places[campaignId] = {
      view,
      anchor,
      granularity: isCalendarGranularity(granularity)
        ? granularity
        : isCalendarGranularity(view)
          ? view
          : 'week',
    }
  }
  return places
}
