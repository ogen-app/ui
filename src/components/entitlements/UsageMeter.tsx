import { useTranslation } from 'react-i18next'

import { formatNumber } from '@/lib/intl'
import { cn } from '@/lib'
import type { Usage, UsageReset } from '@/types/entitlements'

type Props = {
  usage: Usage
  /**
   * How to write the two numbers. Defaults to the app's own number formatting.
   *
   * An override exists because `media_storage_bytes` is not a count —
   * "402653184 of 1073741824" is a true sentence nobody can use, and grouping
   * the digits does not rescue it. The call site knows what its numbers mean,
   * so it brings the formatter rather than this component keeping a table of
   * which keys are bytes.
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
 * Each reset is a whole sentence in the catalogue rather than a phrase glued
 * onto a stem, because where "this month" lands in the sentence is a different
 * answer in every language.
 *
 * **Three things it can say, not two.** Unlimited, the full meter, and — since
 * CON-243 — the limit on its own, for an allowance the API states but does not
 * count. That last one is the common case today and it is why the component
 * cannot simply default a missing tally to zero: "0 of 10" reads as a fresh
 * allowance, which is a reassurance nobody checked.
 */
export function UsageMeter({ usage, format, className }: Props) {
  const { t, i18n } = useTranslation()
  // The language comes off the `useTranslation` this already holds, so the
  // number and the sentence around it are read from the same one — and the
  // `t()` above it is what re-renders this on a switch.
  const write =
    format ?? ((value: number) => formatNumber(value, {}, i18n.language))

  const text =
    usage.limit === null
      ? t('tiers.unlimited')
      : usage.used === null
        ? t('tiers.limitOnly', { limit: write(usage.limit) })
        : t(usageKey(usage.reset), {
            used: write(usage.used),
            limit: write(usage.limit),
          })

  return (
    <span className={cn('text-[13px] text-tertiary-foreground', className)}>
      {text}
    </span>
  )
}

/**
 * Built per call, not looked up in a module-level table: a `const` map of keys
 * is harmless, but the habit it teaches — freezing something at import — is the
 * one that breaks the moment a value on the other side is translated.
 */
function usageKey(reset: UsageReset | null) {
  switch (reset) {
    case 'monthly':
      return 'tiers.usageMonth' as const
    case 'total':
      return 'tiers.usageTotal' as const
    case 'per_post':
      return 'tiers.usagePost' as const
    // `standing` lands here alongside a reset word this build has never heard
    // of (`usageReset` narrows that to null). Both want the plain form: a
    // ceiling that never refills has no period to name, and an unknown one has
    // none we can name.
    default:
      return 'tiers.usage' as const
  }
}
