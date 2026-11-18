import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  getOnboarding,
  putOnboarding,
  startOnboarding,
  type OnboardingState,
} from '@/services/api/onboarding'
import { isFeatureEnabled } from '@/config/featureFlags'

export const ONBOARDING_KEY = ['onboarding'] as const

/** Read by the root guard too, off the same key, so a save is seen there. */
export const onboardingQuery = {
  queryKey: ONBOARDING_KEY,
  queryFn: getOnboarding,
  staleTime: 30_000,
}

export function useOnboarding() {
  return useQuery(onboardingQuery)
}

/**
 * Saves where setup stands. The cache takes the new value at once, so the
 * guard's next read agrees with the screen even before the write lands.
 */
export function useSaveOnboarding() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (state: Omit<OnboardingState, 'updatedAt'>) =>
      putOnboarding(state),
    onMutate: (state) => {
      const next: OnboardingState = {
        ...state,
        updatedAt: new Date().toISOString(),
      }
      qc.setQueryData(ONBOARDING_KEY, next)
    },
    onSuccess: (row) => qc.setQueryData(ONBOARDING_KEY, row),
  })
}

/**
 * Marks a workspace that was just signed up for as owing its setup.
 *
 * Never throws: a failed write costs the person the setup screens, not their
 * account, and the signup has already succeeded by the time this runs.
 */
export async function owesOnboardingAfterSignup(): Promise<void> {
  if (!isFeatureEnabled('onboarding')) return
  try {
    await startOnboarding()
  } catch {
    // They land in the app as they did before setup existed.
  }
}
