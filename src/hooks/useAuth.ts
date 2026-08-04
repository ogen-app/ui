import { useMutation } from "@tanstack/react-query";

import { checkSession, login as loginRequest, invalidateSession } from "@/services/api/sessions";
import {
  requestPasswordReset,
  resetPassword as resetPasswordRequest,
} from "@/services/api/passwordReset";
import { signup as signupRequest } from "@/services/api/tenants";
import type { LoginPayload, Session } from "@/types/session";
import type { SignupPayload } from "@/types/tenant";
import type { User } from "@/types/user";
import { useAuthStore } from "@/stores/authStore";

/**
 * Login mutation. On success it invalidates the cached session probe and
 * re-probes through the same path the root guard uses (`GET
 * /api/current_user`), hydrating the auth store with the user + tenant.
 */
export function useLogin() {
  const setUser = useAuthStore((s) => s.setUser);
  return useMutation<Session, Error, LoginPayload>({
    mutationFn: loginRequest,
    onSuccess: async () => {
      // Re-probe through the same cached path the root guard uses: one
      // GET /api/current_user resolves the user + tenant and primes the cache.
      invalidateSession();
      try {
        const user = await checkSession();
        if (user) setUser(user);
      } catch {
        // A hiccup here (e.g. transient ServerUnavailableError) must not
        // block the caller-level onSuccess: the login itself succeeded, and
        // the root guard re-probes on the post-login navigation anyway.
      }
    },
  });
}

/**
 * Self-service signup (CON-97): creates the organization + first admin and,
 * because `POST /api/tenants` opens a session, leaves the caller authenticated.
 * We invalidate the cached session probe so the root guard re-reads it as
 * authenticated, then seed the auth store from the signup response (which
 * already carries the new tenant).
 */
export function useSignup() {
  const setUser = useAuthStore((s) => s.setUser);
  return useMutation<User, Error, SignupPayload>({
    mutationFn: signupRequest,
    onSuccess: (user) => {
      invalidateSession();
      setUser(user);
    },
  });
}

/**
 * Step one of a password reset: ask for the one-time link (CON-108).
 *
 * Succeeds for an unknown address too — the endpoint answers 202 either way so
 * it can't be used to test whether an email has an account. The success state
 * is therefore "we've sent it if that address exists", never "check your
 * inbox" stated as fact.
 */
export function useRequestPasswordReset() {
  return useMutation<void, Error, string>({
    mutationFn: requestPasswordReset,
  });
}

/** Step two: spend the token and set the new password (CON-108). */
export function useResetPassword() {
  return useMutation<void, Error, { token: string; password: string }>({
    mutationFn: ({ token, password }) => resetPasswordRequest(token, password),
  });
}
