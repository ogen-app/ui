import type { TFunction } from 'i18next'

import { PlanChangeError } from '@/services/api/tiers'

/**
 * What to tell somebody whose plan change was refused (CON-322 §7.1).
 *
 * One sentence per code the server sends, worded for what the reader can do
 * next. `trial_upgrade_unavailable` is here for completeness but is normally
 * answered by the change dialog itself, which can name the date the free month
 * ends. Anything else — a network failure, a code this build predates — takes
 * the generic sentence.
 */
export function planChangeMessage(t: TFunction, error: unknown): string {
  if (!(error instanceof PlanChangeError)) return t('tiers.changeFailed')
  switch (error.reason) {
    case 'unknown_tier':
    case 'price_mismatch':
      return t('tiers.planError.stale')
    case 'tier_not_available':
      return t('tiers.planError.notAvailable')
    case 'subscription_not_changeable':
      return t('tiers.planError.notChangeable')
    case 'trial_upgrade_unavailable':
      return t('tiers.planError.duringTrial')
    case 'provider_error':
      return t('tiers.planError.provider')
    case 'billing_unavailable':
      return t('tiers.planError.unavailable')
  }
}
