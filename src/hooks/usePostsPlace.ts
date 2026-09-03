import { useEffect, useMemo } from 'react'
import { selectPostsPlaceEntry, useSettingsStore } from '@/stores/settingsStore'
import {
  calendarPlaceOf,
  defaultPostsPlace,
  postsPlaceOf,
  type CalendarGranularity,
  type PostsPlace,
  type PostsView,
} from '@/lib/postsPlace'

/**
 * Reading and writing "where the user last was in this campaign's posts".
 *
 * Two readers rather than one, because the entry points are not asking the same
 * question — see `lib/postsPlace`. Anything that means *the posts* wants
 * `usePostsPlace` and may land on the table; anything that names *the calendar*
 * wants `useCalendarPlace` and must not.
 */

/** The empty map, as a stable identity — a fresh `{}` per render would resubscribe. */
const NO_PLACES: Record<string, PostsPlace> = {}

/**
 * Record that this view is on screen. The one writer: views declare where they
 * are, and nothing else in the app writes the memory — which is what keeps a
 * redirect or a programmatic navigation from being saved as the user's choice.
 *
 * The list passes no anchor.
 */
export function useRememberPostsPlace(
  campaignId: string,
  view: PostsView,
  anchor?: string,
) {
  const remember = useSettingsStore((s) => s.rememberPostsPlace)
  useEffect(() => {
    if (!campaignId) return
    remember(campaignId, { view, anchor })
  }, [remember, campaignId, view, anchor])
}

/**
 * Everything remembered for this campaign, defaulting to this week.
 *
 * Subscribes to the stored entry — a stable object, or `undefined` — and
 * derives outside the subscription, because the default reads the clock and is
 * therefore a new object every time it is built. Selecting it directly would
 * hand `useSyncExternalStore` a value that never equals itself.
 */
export function usePostsPlace(campaignId: string): PostsPlace {
  const stored = useSettingsStore(selectPostsPlaceEntry(campaignId))
  return useMemo(() => stored ?? defaultPostsPlace(), [stored])
}

/**
 * The whole map, for a caller that needs several campaigns at once and so
 * cannot ask per campaign — the sidebar, which renders a row per campaign from
 * one table. Pair it with `postsPlaceOf` / `postsPlaceLink`.
 *
 * The map's identity is stable across renders that didn't write to it, which is
 * what makes this safe to subscribe to where the derived reads are not.
 */
export function usePostsPlaces(): Record<string, PostsPlace> {
  return useSettingsStore((s) => s.postsPlace)
}

/** The calendar's remembered position, for the entry points that name it. */
export function useCalendarPlace(campaignId: string): {
  anchor: string
  view: CalendarGranularity
} {
  const stored = useSettingsStore(selectPostsPlaceEntry(campaignId))
  return useMemo(
    () =>
      calendarPlaceOf(
        stored ? { [campaignId]: stored } : NO_PLACES,
        campaignId,
      ),
    [stored, campaignId],
  )
}

/**
 * The same two reads outside React, for the router's `beforeLoad` — which runs
 * before any component exists and so cannot use a hook. Safe to call at that
 * point because the persisted store rehydrates synchronously from localStorage
 * when its module is first imported, which happens at app boot.
 */
export const readPostsPlace = (campaignId: string): PostsPlace =>
  postsPlaceOf(useSettingsStore.getState().postsPlace, campaignId)

export const readCalendarPlace = (
  campaignId: string,
): { anchor: string; view: CalendarGranularity } =>
  calendarPlaceOf(useSettingsStore.getState().postsPlace, campaignId)
