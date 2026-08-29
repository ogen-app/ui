import { useTranslation } from 'react-i18next'

import { formatDay, relativeDay } from '@/components/entitlements/parts'
import type { TierSnapshot } from '@/types/entitlements'

/**
 * The two sentences that say what a workspace is on — what the plan is, and
 * what happens to it next (CON-232).
 *
 * A hook rather than a component so the layout stays the caller's business —
 * today that is `PlanBillingCard`, which puts them in a row's title and
 * description. What must not vary between surfaces is the wording, and that
 * is what lives here.
 *
 * **What happens next has three answers, in this order.** A scheduled change
 * outranks a renewal, because "you move to Trial on the 22nd" is the news, and
 * a workspace with a downgrade pending would otherwise be told its plan
 * auto-renews — which is the opposite of what is about to happen. Then a
 * renewal date, if there is one. Then, for a tier nobody pays for, the day it
 * started, which is all there is to say.
 *
 * Every date here is display data. Nothing branches on one: the *fact* of a
 * scheduled change and its direction both come off the server, and the clock
 * is read only to turn a date into "in 29 days".
 */
export function usePlanStatement(tier: TierSnapshot | undefined) {
  const { t, i18n } = useTranslation()
  const locale = i18n.language

  if (!tier) return { headline: null, timing: null }

  const headline = t(
    tier.billingPeriod === 'month'
      ? 'tiers.onPlanMonthly'
      : tier.billingPeriod === 'year'
        ? 'tiers.onPlanYearly'
        : 'tiers.onPlan',
    { name: tier.name },
  )

  if (tier.scheduled) {
    const relative = relativeDay(tier.scheduled.effectiveFrom, locale)
    const when = formatDay(tier.scheduled.effectiveFrom, locale)
    const down = tier.scheduled.direction === 'downgrade'
    return {
      headline,
      timing: t(
        relative
          ? down
            ? 'tiers.changeScheduledIn'
            : 'tiers.changeScheduledUpIn'
          : down
            ? 'tiers.changeScheduled'
            : 'tiers.changeScheduledUp',
        { name: tier.scheduled.name, relative, when },
      ),
    }
  }

  if (tier.renewsAt) {
    const relative = relativeDay(tier.renewsAt, locale)
    const when = formatDay(tier.renewsAt, locale)
    return {
      headline,
      timing: t(relative ? 'tiers.autoRenewsIn' : 'tiers.autoRenews', {
        relative,
        when,
      }),
    }
  }

  return {
    headline,
    timing: t('tiers.since', { when: formatDay(tier.effectiveFrom, locale) }),
  }
}
