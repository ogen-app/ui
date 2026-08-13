import { useCallback, useEffect, useRef } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  CARD_FIELDS,
  DEFAULT_CARD_FIELDS,
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
  /** Which rows the week card is allowed to draw — see `calendar/cardFields`. */
  card: CardFields
}

const DEFAULTS: CalendarSettings = {
  firstDayOfWeek: 1,
  hiddenDays: [],
  card: DEFAULT_CARD_FIELDS,
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
function parseCardFields(raw: unknown): CardFields {
  if (!raw || typeof raw !== 'object') return DEFAULT_CARD_FIELDS
  const stored = raw as Partial<Record<CardField, unknown>>
  const fields = { ...DEFAULT_CARD_FIELDS }
  for (const field of CARD_FIELDS) {
    if (typeof stored[field] === 'boolean') fields[field] = stored[field]
  }
  return CARD_FIELDS.some((field) => fields[field]) ? fields : DEFAULT_CARD_FIELDS
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
    const { firstDayOfWeek, hiddenDays, card } = parsed as Partial<CalendarSettings>
    return {
      firstDayOfWeek:
        typeof firstDayOfWeek === 'number' && firstDayOfWeek >= 0 && firstDayOfWeek <= 6
          ? firstDayOfWeek
          : DEFAULTS.firstDayOfWeek,
      hiddenDays: Array.isArray(hiddenDays)
        ? hiddenDays.filter((d): d is number => typeof d === 'number' && d >= 0 && d <= 6)
        : DEFAULTS.hiddenDays,
      card: parseCardFields(card),
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
  const { data, isLoading } = useQuery({
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
      qc.setQueryData(queryKey, next)
      if (!userId || !campaignId) return
      pending.current = { key: storageKey, value: next }
      if (timer.current) clearTimeout(timer.current)
      timer.current = setTimeout(flush, SAVE_DEBOUNCE_MS)
    },
    [qc, queryKey, storageKey, userId, campaignId, flush],
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
    (field: CardField, visible: boolean) => {
      // The floor is one field, not zero. Enforced here rather than only in the
      // panel: the panel disables the last switch so the rule is visible, and
      // this is what makes it true regardless of who calls.
      if (!visible && !canHideField(settings.card, field)) return
      write({ ...settings, card: { ...settings.card, [field]: visible } })
    },
    [settings, write],
  )

  return {
    firstDayOfWeek: settings.firstDayOfWeek,
    hiddenDays: settings.hiddenDays,
    card: settings.card,
    /**
     * True until the stored preference has been read. The values above are
     * the defaults meanwhile, and a caller that would lay out differently
     * for a different answer — the week's first column, which days show —
     * has to wait rather than draw one and take it back.
     */
    isPending: isLoading,
    setFirstDayOfWeek,
    setDayVisible,
    setCardField,
  }
}
