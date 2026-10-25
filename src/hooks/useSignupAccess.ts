import { useQuery } from '@tanstack/react-query'

import { queryClient } from '@/lib/queryClient'
import {
  getSignupConfig,
  getTenantInvite,
  type SignupMode,
} from '@/services/api/signupAccess'

/** `GET /api/signup-config` — cached as long as the server says it may be. */
export const SIGNUP_MODE_KEY = ['signup', 'mode'] as const
const SIGNUP_MODE_STALE_MS = 30_000

/**
 * The signup mode, for a route guard — off the shared cache, so moving between
 * `/signup` and `/auth/register` asks once. Never throws: a failed read is
 * `open` (see `getSignupConfig`).
 */
export function fetchSignupMode(): Promise<SignupMode> {
  return queryClient.fetchQuery({
    queryKey: SIGNUP_MODE_KEY,
    queryFn: getSignupConfig,
    staleTime: SIGNUP_MODE_STALE_MS,
  })
}

/**
 * The server just refused a sign-up with `invite_required`: the switch was
 * flipped after the mode was read. Recorded so the guards agree with it
 * instead of serving the form again from a 30-second-old answer.
 */
export function markInviteOnly(): void {
  queryClient.setQueryData<SignupMode>(SIGNUP_MODE_KEY, 'invite_only')
}

/** The tester invite behind a `/signup?invite=` link; `null` once it is unusable. */
export function useTesterInvite(token: string | undefined) {
  return useQuery({
    queryKey: ['signup', 'invite', token],
    queryFn: () => getTenantInvite(token as string),
    enabled: Boolean(token),
    // A 410 is already data (`null`). What is left to retry is an outage, and
    // the screen offers that by hand rather than three times in silence.
    retry: false,
    staleTime: Infinity,
  })
}
