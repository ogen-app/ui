import { relativeTime } from '@/lib/relativeTime'

/**
 * When the numbers behind a dashboard card were last checked, in words.
 *
 * Every analytics endpoint carries an `updated_at` and they all mean the same
 * thing — the newest `last_checked_at` among the rows that fed the answer — so
 * the one rule about reading it lives here rather than in each mapper.
 *
 * The rule: **the Go zero time is not a date.** A workspace whose posts have
 * never been through a refresh sweep gets `0001-01-01T00:00:00Z`, and rendering
 * that relative produces "2025 years ago" — a stale-looking screen that is
 * actually a brand-new one. It is treated as *no freshness to report*, which is
 * what the cards say instead of printing a date in year 1.
 *
 * `undefined` rather than `null` because that is what the view models carry:
 * the freshness note is an optional line, not a field with an empty state.
 */
export function checkedAt(iso: string | null | undefined): string | undefined {
  if (!iso) return undefined
  const date = new Date(iso)
  if (Number.isNaN(date.getTime()) || date.getUTCFullYear() <= 1)
    return undefined
  return relativeTime(iso) ?? undefined
}
