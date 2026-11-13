import type { TFunction } from 'i18next'
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
