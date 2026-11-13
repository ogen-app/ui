import type { TFunction } from 'i18next'
import { OVERVIEW_WINDOWS } from '@/hooks/useAnalyticsOverview'
import { counted } from '@/lib/intl'

const SPAN = /^(\d{1,3})(d|w|mo)$/

/**
 * A relative window as the scope bar names it — `30d` is "Last 30 days",
 * `12w` "Last 12 weeks", `6mo` "Last 6 months" (CON-479). A value that isn't
 * a span is returned as it came, so a preset this build predates still reads.
 */
export function presetName(t: TFunction, preset: string): string {
  const m = SPAN.exec(preset)
  if (!m) return preset
  const n = counted(Number(m[1]))
  switch (m[2]) {
    case 'd':
      return t('assistant.analytics.cite.lastDays', n)
    case 'w':
      return t('assistant.analytics.cite.lastWeeks', n)
    default:
      return t('assistant.analytics.cite.lastMonths', n)
  }
}

/**
 * The period a window lands on the dashboard as. A preset the picker doesn't
 * offer lands as its dates: the address drops a span it can't label, which
 * would quietly show the default period instead. What the rail says about a
 * window goes through this too, so it names the period the page shows.
 */
export function offeredPeriod<
  W extends { preset?: string; from?: string; to?: string },
>(window: W): W {
  if (!window.preset) return window
  if (OVERVIEW_WINDOWS.some((w) => w.window === window.preset)) return window
  return window.from && window.to ? { ...window, preset: undefined } : window
}
