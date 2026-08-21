import { useTranslation } from 'react-i18next'

import { cn } from '@/lib'
import type { Usage, UsagePeriod } from '@/types/entitlements'

type Props = {
  usage: Usage
  /**
   * How to write the two numbers.
   *
   * Counts read fine as they are, but `media_storage_bytes` does not —
   * "402653184 of 1073741824" is a true sentence nobody can use. The call site
   * knows what its numbers mean, so it brings the formatter rather than this
   * component keeping a table of which keys are bytes.
   */
  format?: (value: number) => string
  className?: string
}

/**
 * How much of an allowance is gone: "7 of 10 this month".
 *
 * One line of text and no bar. The call sites are too different in width for
 * one bar to suit them — a settings row, a menu, the inside of a notice — and a
 * bar that has to be re-sized at every one of them is not a shared rendering,
 * it is a shape three screens argue about.
 *
 * Each period is a whole sentence in the catalogue rather than a phrase glued
 * onto a stem, because where "this month" lands in the sentence is a different
 * answer in every language.
 */
export function UsageMeter({ usage, format = String, className }: Props) {
  const { t } = useTranslation()

  const text =
    usage.limit === null
      ? t('tiers.unlimited')
      : t(usageKey(usage.period), {
          used: format(usage.used),
          limit: format(usage.limit),
        })

  return <span className={cn('text-[13px] text-tertiary-foreground', className)}>{text}</span>
}

/**
 * Built per call, not looked up in a module-level table: a `const` map of keys
 * is harmless, but the habit it teaches — freezing something at import — is the
 * one that breaks the moment a value on the other side is translated.
 */
function usageKey(period: UsagePeriod | null) {
  switch (period) {
    case 'day':
      return 'tiers.usageDay' as const
    case 'month':
      return 'tiers.usageMonth' as const
    case 'post':
      return 'tiers.usagePost' as const
    case 'publish':
      return 'tiers.usagePublish' as const
    // A period this build has never heard of arrives as null (`usagePeriod`),
    // and lands here — the plain form, which is true whatever the period was.
    default:
      return 'tiers.usage' as const
  }
}
