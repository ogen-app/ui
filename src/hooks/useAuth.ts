import { useMutation } from "@tanstack/react-query";

import {
  login as loginRequest,
  logout as logoutRequest,
  invalidateSession,
} from "@/services/api/sessions";
import { getMe } from "@/services/api/users";
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
      invalidateSession();
      const user = await getMe();
      setUser(user);
    },
  });
}

/**
 * Self-service signup (CON-97): creates the organization + first admin and,
 * because `POST /api/tenants` opens a session, leaves the caller authenticated.
 * We invalidate the cached session probe so the root guard re-reads it as
 * authenticated, then seed the auth store from the signup response.
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

/**
 * Placeholder — the backend does not yet expose a "resend verification
 * email" endpoint. Wire this to the real call when it lands.
 */
export function useResendVerificationEmail() {
  return useMutation<void, Error, string>({
    mutationFn: async () => {
      throw new Error("Resend verification email is not yet implemented");
    },
  });
}
