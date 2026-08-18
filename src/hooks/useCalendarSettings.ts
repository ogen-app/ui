import { useCallback, useEffect, useMemo, useRef } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  CARD_FIELDS,
  DEFAULT_MONTH_FIELDS,
  DEFAULT_WEEK_FIELDS,
  canHideField,
  type CardField,
  type CardFields,
} from '@/components/campaigns/calendar/cardFields'
import { getSetting, putSetting, userScopedKey } from '@/services/api/settings'
import { useAuthStore } from '@/stores/authStore'
import { toast } from '@/stores/toastStore'

/**
 * A user's calendar preferences for one campaign. Day numbers follow JS
 * `Date#getDay()`: 0 = Sunday … 6 = Saturday.
 */
export type CalendarSettings = {
  firstDayOfWeek: number
  hiddenDays: number[]
  /**
   * Whether a post's picture backs its card, in every view at once. One answer
   * for the calendar rather than a row on each view's list: it is the most
   * expensive thing a card can carry by an order of magnitude, and "do I want
   * to see my calendar as pictures" is a different kind of question from "does
   * this view need the account".
   */
  imagePreviews: boolean
  /** Which rows each view's card may draw — see `calendar/cardFields`. */
  card: Record<CalendarView, CardFields>
}

/** The two views that draw cards, and so the two that have card settings. */
export type CalendarView = 'week' | 'month'

const DEFAULTS: CalendarSettings = {
  firstDayOfWeek: 1,
  hiddenDays: [],
  imagePreviews: true,
  card: { week: DEFAULT_WEEK_FIELDS, month: DEFAULT_MONTH_FIELDS },
}

/** Namespace of the settings key these are stored under. */
const NAMESPACE = 'calendar'

/** How long to coalesce toggles before writing. A run of switch flips is one PUT. */
const SAVE_DEBOUNCE_MS = 500

export const calendarSettingsKey = (userId: string, campaignId: string) =>
  ['settings', NAMESPACE, userId, campaignId] as const

/**
 * Field by field, so a blob written before this setting existed comes back with
 * the defaults for the rest — and so does one written by a later version that
 * knows a field this one doesn't.
 *
 * The all-off case is repaired rather than rejected: the panel can't produce it,
 * but a hand-edited value can, and a calendar of blank strips is the one state
 * a user cannot get themselves out of with the switches in front of them.
 */
function parseCardFields(raw: unknown, defaults: CardFields): CardFields {
  if (!raw || typeof raw !== 'object') return defaults
  const stored = raw as Partial<Record<CardField, unknown>>
  const fields = { ...defaults }
  for (const field of CARD_FIELDS) {
    if (typeof stored[field] === 'boolean') fields[field] = stored[field]
  }
  return CARD_FIELDS.some((field) => fields[field]) ? fields : defaults
}

/**
 * Repaired on the same principle as the card fields: `setDayVisible` can't
 * hide the seventh day, but a hand-edited blob can, and a calendar with zero
 * visible days has no grid to offer the switches that would fix it.
 */
function parseHiddenDays(raw: unknown): number[] {
  if (!Array.isArray(raw)) return DEFAULTS.hiddenDays
  const hidden = [
    ...new Set(raw.filter((d): d is number => typeof d === 'number' && d >= 0 && d <= 6)),
  ]
  return hidden.length >= 7 ? DEFAULTS.hiddenDays : hidden
}

/**
 * Reads the stored blob back into settings, ignoring anything malformed — a
 * hand-edited or half-written value must not take the calendar down, and the
 * next change overwrites it anyway.
 */
function parse(raw: string | null): CalendarSettings {
  if (!raw) return DEFAULTS
  try {
    const parsed: unknown = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return DEFAULTS
    const { firstDayOfWeek, hiddenDays, imagePreviews, card } =
      parsed as Partial<CalendarSettings>
    // A blob written before the views had separate cards has `card` as one flat
    // set of fields, which is neither view's shape — so it reads as absent and
    // both views start from their defaults. Nothing is migrated: this is a
    // display preference, and re-flipping a switch is cheaper than the code to
    // guess which view the old answer was about.
    const perView = (card ?? {}) as Partial<Record<CalendarView, unknown>>
    return {
      firstDayOfWeek:
        typeof firstDayOfWeek === 'number' && firstDayOfWeek >= 0 && firstDayOfWeek <= 6
          ? firstDayOfWeek
          : DEFAULTS.firstDayOfWeek,
      hiddenDays: parseHiddenDays(hiddenDays),
      imagePreviews:
        typeof imagePreviews === 'boolean' ? imagePreviews : DEFAULTS.imagePreviews,
      card: {
        week: parseCardFields(perView.week, DEFAULT_WEEK_FIELDS),
        month: parseCardFields(perView.month, DEFAULT_MONTH_FIELDS),
      },
    }
  } catch {
    return DEFAULTS
  }
}

/**
 * Per-user, per-campaign calendar preferences, persisted server-side so they
 * follow the user to another browser.
 *
 * The API has no user-scoped store, only the tenant-wide key/value table, so
 * the identity lives in the key (`calendar.<userId>.<campaignId>`) rather than
 * in a column — see `services/api/settings.ts`. Changes paint from the Query
 * cache immediately and the write is debounced behind them, so flipping six
 * day switches in a row costs one request instead of six.
 */
export function useCalendarSettings(campaignId: string) {
  const userId = useAuthStore((s) => s.user?.id ?? '')
  const qc = useQueryClient()
  const queryKey = calendarSettingsKey(userId, campaignId)
  const storageKey = userScopedKey(NAMESPACE, userId, campaignId)

  // `isLoading`, not `isPending`: the latter stays true forever on a disabled
  // query, and without a user there is nothing to fetch — the defaults are
  // the answer, not a placeholder for one.
  const { data, isLoading, isError } = useQuery({
    queryKey,
    queryFn: async () => parse(await getSetting(storageKey)),
    enabled: !!userId && !!campaignId,
    // Nothing else writes these, so the cache is authoritative once loaded.
    staleTime: Infinity,
  })
  const settings = data ?? DEFAULTS

  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  // The flush reads the cache rather than a captured value, so whatever the
  // last toggle left behind is what gets written.
  const pending = useRef<{ key: string; value: CalendarSettings } | null>(null)

  const flush = useCallback(() => {
    if (timer.current) {
      clearTimeout(timer.current)
      timer.current = null
    }
    const next = pending.current
    pending.current = null
    if (!next) return
    void putSetting(next.key, JSON.stringify(next.value)).catch(() => {
      toast.error("Couldn't save your calendar preferences")
    })
  }, [])

  // Leaving the page mid-debounce must not lose the change.
  useEffect(() => flush, [flush])

  const write = useCallback(
    (next: CalendarSettings) => {
      // Only a loaded preference may be edited. `settings` falls back to the
      // defaults while the read is pending or failed, so a write here would
      // be built on those defaults and would overwrite whatever the user
      // actually saved — the callers' controls are skeletoned meanwhile, and
      // this is what makes that gate load-bearing rather than cosmetic.
      if (data === undefined) return
      qc.setQueryData(queryKey, next)
      if (!userId || !campaignId) return
      pending.current = { key: storageKey, value: next }
      if (timer.current) clearTimeout(timer.current)
      timer.current = setTimeout(flush, SAVE_DEBOUNCE_MS)
    },
    [qc, queryKey, storageKey, userId, campaignId, flush, data],
  )

  const setFirstDayOfWeek = useCallback(
    (day: number) => {
      write({ ...settings, firstDayOfWeek: day })
    },
    [settings, write],
  )

  const setDayVisible = useCallback(
    (day: number, visible: boolean) => {
      const hidden = new Set(settings.hiddenDays)
      if (visible) {
        hidden.delete(day)
      } else {
        // The calendar needs at least one visible day.
        if (hidden.size >= 6) return
        hidden.add(day)
      }
      write({ ...settings, hiddenDays: [...hidden] })
    },
    [settings, write],
  )

  const setCardField = useCallback(
    (view: CalendarView, field: CardField, visible: boolean) => {
      // The floor is one field, not zero, and it is per view — the month being
      // stripped to a title says nothing about the week. Enforced here rather
      // than only in the panel: the panel disables the last switch so the rule
      // is visible, and this is what makes it true regardless of who calls.
      if (!visible && !canHideField(settings.card[view], field)) return
      write({
        ...settings,
        card: { ...settings.card, [view]: { ...settings.card[view], [field]: visible } },
      })
    },
    [settings, write],
  )

  const setImagePreviews = useCallback(
    (on: boolean) => {
      write({ ...settings, imagePreviews: on })
    },
    [settings, write],
  )

  // The stored per-view blobs carry an `image` of their own only because they
  // are typed as whole `CardFields`; the preference is stamped in here so no
  // card has to know where it comes from. Only the week takes it: the month's
  // answer is always no, because a 100px band is the whole cell — one backed
  // post would tip every such day into a density summary (see
  // `DEFAULT_MONTH_FIELDS`).
  //
  // Memoized because the identity is load-bearing: `card.week` is a `useMemo`
  // dependency in `WeeklyCalendar` and a `memo` prop on every `PostCard`, so a
  // fresh object each render re-measures the grid and re-renders every card.
  const card = useMemo<Record<CalendarView, CardFields>>(
    () => ({
      week: { ...settings.card.week, image: settings.imagePreviews },
      month: { ...settings.card.month, image: false },
    }),
    [settings.card.week, settings.card.month, settings.imagePreviews],
  )

  return {
    firstDayOfWeek: settings.firstDayOfWeek,
    hiddenDays: settings.hiddenDays,
    imagePreviews: settings.imagePreviews,
    card,
    /**
     * True until the stored preference has been read. The values above are
     * the defaults meanwhile, and a caller that would lay out differently
     * for a different answer — the week's first column, which days show —
     * has to wait rather than draw one and take it back. A failed read
     * counts too: the defaults are then a stand-in, not an answer, and the
     * controls must not present them as the user's own choices (the query
     * retries on the next window focus).
     */
    isPending: isLoading || isError,
    setFirstDayOfWeek,
    setDayVisible,
    setCardField,
    setImagePreviews,
  }
}
