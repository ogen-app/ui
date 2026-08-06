import { useCallback, useEffect, useRef } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { getSetting, putSetting } from '@/services/api/settings'
import { toast } from '@/stores/toastStore'

/**
 * When a campaign's posts should be published, as the scheduler is meant to
 * read them (CON-156 §1). Day numbers follow JS `Date#getDay()`:
 * 0 = Sunday … 6 = Saturday.
 */
export type SchedulingPreferences = {
  /** "HH:MM" on a 24-hour clock, read in `timeZone`. */
  publishTime: string
  /** IANA zone name the publishing time is expressed in, e.g. "Europe/Kyiv". */
  timeZone: string
  /** Minutes of spread allowed either side of `publishTime`. */
  maxDeviationMinutes: number
  /** Days the scheduler must not publish on. */
  bannedDays: number[]
}

/**
 * The zone this browser is in, and the one a campaign starts out in. Falls
 * back to UTC only where the runtime won't say — never to a guess.
 */
export function localTimeZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
}

const DEFAULTS: SchedulingPreferences = {
  // What the scheduler already does when nothing is configured. Showing a
  // friendlier hour here would misreport the campaign's actual behaviour.
  publishTime: '00:00',
  timeZone: localTimeZone(),
  maxDeviationMinutes: 15,
  bannedDays: [],
}

/** Namespace of the settings key these are stored under. */
const NAMESPACE = 'scheduling'

/** How long to coalesce edits before writing. A run of day toggles is one PUT. */
const SAVE_DEBOUNCE_MS = 500

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/

export const schedulingPreferencesKey = (campaignId: string) =>
  ['settings', NAMESPACE, campaignId] as const

/**
 * Reads the stored blob back, ignoring anything malformed — a hand-edited or
 * half-written value must not take the settings page down, and the next
 * change overwrites it anyway.
 */
function parse(raw: string | null): SchedulingPreferences {
  if (!raw) return DEFAULTS
  try {
    const parsed: unknown = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return DEFAULTS
    const { publishTime, timeZone, maxDeviationMinutes, bannedDays } =
      parsed as Partial<SchedulingPreferences>
    return {
      publishTime:
        typeof publishTime === 'string' && TIME_PATTERN.test(publishTime)
          ? publishTime
          : DEFAULTS.publishTime,
      // Any non-empty string is kept: a zone this browser's ICU data doesn't
      // know is still the campaign's answer, and dropping it would silently
      // reschedule the campaign into the reader's own zone.
      timeZone:
        typeof timeZone === 'string' && timeZone.trim() !== ''
          ? timeZone
          : DEFAULTS.timeZone,
      maxDeviationMinutes:
        typeof maxDeviationMinutes === 'number' &&
        Number.isFinite(maxDeviationMinutes) &&
        maxDeviationMinutes >= 0
          ? maxDeviationMinutes
          : DEFAULTS.maxDeviationMinutes,
      bannedDays: Array.isArray(bannedDays)
        ? bannedDays.filter((d): d is number => typeof d === 'number' && d >= 0 && d <= 6)
        : DEFAULTS.bannedDays,
    }
  } catch {
    return DEFAULTS
  }
}

/**
 * A campaign's scheduling preferences, persisted server-side.
 *
 * They live in the tenant-wide key/value store under `scheduling.<campaignId>`
 * rather than on the campaign row: the campaign resource has no columns for
 * them yet, and adding them is the backend half of CON-156 §1. Unlike the
 * calendar's preferences these are *not* user-scoped — a publishing window is
 * a property of the campaign, so everyone in the workspace sees and edits the
 * same one.
 *
 * Changes paint from the Query cache immediately and the write is debounced
 * behind them, so toggling four days costs one request instead of four.
 */
export function useSchedulingPreferences(campaignId: string) {
  const qc = useQueryClient()
  const queryKey = schedulingPreferencesKey(campaignId)
  const storageKey = `${NAMESPACE}.${campaignId}`

  // `isLoading`, not `isPending`: the latter stays true forever on a disabled
  // query, and without a campaign there is nothing to fetch.
  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: async () => parse(await getSetting(storageKey)),
    enabled: !!campaignId,
    // Nothing else writes these, so the cache is authoritative once loaded.
    staleTime: Infinity,
  })
  const preferences = data ?? DEFAULTS

  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pending = useRef<SchedulingPreferences | null>(null)

  const flush = useCallback(() => {
    if (timer.current) {
      clearTimeout(timer.current)
      timer.current = null
    }
    const next = pending.current
    pending.current = null
    if (!next) return
    void putSetting(storageKey, JSON.stringify(next)).catch(() => {
      toast.error("Couldn't save the scheduling preferences")
    })
  }, [storageKey])

  // Leaving the page mid-debounce must not lose the change.
  useEffect(() => flush, [flush])

  const write = useCallback(
    (next: SchedulingPreferences) => {
      qc.setQueryData(queryKey, next)
      if (!campaignId) return
      pending.current = next
      if (timer.current) clearTimeout(timer.current)
      timer.current = setTimeout(flush, SAVE_DEBOUNCE_MS)
    },
    [qc, queryKey, campaignId, flush],
  )

  const setPublishTime = useCallback(
    (publishTime: string) => {
      // The time input clears to "" on a partial edit; keeping that would
      // write an unschedulable campaign.
      if (!TIME_PATTERN.test(publishTime)) return
      write({ ...preferences, publishTime })
    },
    [preferences, write],
  )

  const setTimeZone = useCallback(
    (timeZone: string) => {
      if (timeZone.trim() === '') return
      write({ ...preferences, timeZone })
    },
    [preferences, write],
  )

  const setMaxDeviationMinutes = useCallback(
    (maxDeviationMinutes: number) => {
      write({ ...preferences, maxDeviationMinutes })
    },
    [preferences, write],
  )

  const setDayBanned = useCallback(
    (day: number, banned: boolean) => {
      const next = new Set(preferences.bannedDays)
      if (banned) {
        // Banning the last day would leave the scheduler nowhere to put a post.
        if (next.size >= 6) return
        next.add(day)
      } else {
        next.delete(day)
      }
      write({ ...preferences, bannedDays: [...next] })
    },
    [preferences, write],
  )

  return {
    ...preferences,
    /** True until the stored preferences have been read. */
    isPending: isLoading,
    setPublishTime,
    setTimeZone,
    setMaxDeviationMinutes,
    setDayBanned,
  }
}
