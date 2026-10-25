import { useMutation, useQuery } from '@tanstack/react-query'

import { invalidateSession } from '@/services/api/sessions'
import {
  completeGoogleSignup,
  disconnectIdentity,
  getAuthMethods,
  getAuthProviders,
  getPendingGoogleSignup,
} from '@/services/api/googleAuth'
import { queryClient } from '@/lib/queryClient'
import { useAuthStore } from '@/stores/authStore'

export const AUTH_PROVIDERS_KEY = ['auth', 'providers'] as const
export const AUTH_METHODS_KEY = ['account', 'auth-methods'] as const

/**
 * Whether to offer Google at all: this server has an OAuth client configured.
 *
 * Reads `false` while the probe is in flight rather than flashing a button
 * that may then vanish — the email form under it is complete on its own, so
 * the button arriving a beat later costs nothing.
 */
export function useGoogleSignInEnabled(): boolean {
  const { data } = useQuery({
    queryKey: AUTH_PROVIDERS_KEY,
    queryFn: getAuthProviders,
    // A server's providers change with a deploy, not while a tab is open.
    staleTime: 10 * 60_000,
  })
  return data?.google.enabled === true
}

/** The pending Google sign-up behind `/auth/register/google?token=`. */
export function usePendingGoogleSignup(token: string | undefined) {
  return useQuery({
    queryKey: ['auth', 'google', 'pending', token],
    queryFn: () => getPendingGoogleSignup(token ?? ''),
    enabled: Boolean(token),
    // A 404 is the answer (the link is spent), not a blip worth retrying.
    retry: false,
    staleTime: Infinity,
  })
}

/**
 * Finishing a Google sign-up. Like `useSignup`: the response opens the session,
 * so the cached probe is dropped and the store seeded from the response.
 */
export function useCompleteGoogleSignup(token: string, inviteToken?: string) {
  const setUser = useAuthStore((s) => s.setUser)
  return useMutation({
    // The form shows the refusal under its button, with the way out beside it.
    meta: { errorToast: false },
    mutationFn: (tenantName: string) =>
      completeGoogleSignup(token, tenantName, inviteToken),
    onSuccess: ({ user }) => {
      invalidateSession()
      setUser(user)
    },
  })
}

/** Profile's Sign-in methods card. */
export function useAuthMethods() {
  return useQuery({
    queryKey: AUTH_METHODS_KEY,
    queryFn: getAuthMethods,
  })
}

/** Disconnecting Google; the card says why when the server refuses. */
export function useDisconnectIdentity() {
  return useMutation({
    meta: { errorToast: false },
    mutationFn: disconnectIdentity,
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: AUTH_METHODS_KEY }),
  })
}
