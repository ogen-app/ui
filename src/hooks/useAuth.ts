import { useMutation } from "@tanstack/react-query";

import {
  checkSession,
  login as loginRequest,
  logout as logoutRequest,
  invalidateSession,
} from "@/services/api/sessions";
import { signup as signupRequest } from "@/services/api/tenants";
import type { LoginPayload, Session } from "@/types/session";
import type { SignupPayload } from "@/types/tenant";
import type { User } from "@/types/user";
import { useAuthStore } from "@/stores/authStore";

export function useLogin() {
  const setUser = useAuthStore((s) => s.setUser);
  return useMutation<Session, Error, LoginPayload>({
    mutationFn: loginRequest,
    onSuccess: async () => {
      // Re-probe through the same cached path the root guard uses: one
      // GET /api/current_user resolves the user + tenant and primes the cache.
      invalidateSession();
      const user = await checkSession();
      if (user) setUser(user);
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

export function useLogout() {
  const clearUser = useAuthStore((s) => s.clearUser);
  return useMutation<void, Error, void>({
    mutationFn: logoutRequest,
    onSuccess: () => {
      invalidateSession();
      clearUser();
    },
  });
}
