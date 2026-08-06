import { useMutation } from "@tanstack/react-query";

import { checkSession, login as loginRequest, invalidateSession } from "@/services/api/sessions";
import {
  requestPasswordReset,
  resetPassword as resetPasswordRequest,
} from "@/services/api/passwordReset";
import { signup as signupRequest } from "@/services/api/tenants";
import { deleteUser, updateUser } from "@/services/api/users";
import { clearAllApplicationData } from "@/lib/cache-utils";
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
    // The form renders `error` beside the fields it refers to; a toast on top
    // of that would say the same thing twice and further from the inputs.
    meta: { errorToast: false },
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
    // Same as login: `AuthRegisterForm` shows `error` inline.
    meta: { errorToast: false },
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
    // `AuthForgotPasswordForm` renders `error.message` under the field.
    meta: { errorToast: false },
    mutationFn: requestPasswordReset,
  });
}

/** Step two: spend the token and set the new password (CON-108). */
export function useResetPassword() {
  return useMutation<void, Error, { token: string; password: string }>({
    // `AuthResetPasswordForm` renders `error.message`, and next to it the way
    // out of an expired token — which a toast would drop.
    meta: { errorToast: false },
    mutationFn: ({ token, password }) => resetPasswordRequest(token, password),
  });
}

/**
 * Edits the signed-in user's own name and email.
 *
 * The store is the source of truth for the screen, so it's updated from the
 * server's response rather than from what was typed — the server owns the
 * canonical `name` string we split back into first/last. The cached session
 * probe is dropped too, so the next root-guard pass re-reads the changed
 * identity instead of serving the stale one for the rest of the page's life.
 *
 * Note there is no email verification anywhere in the product: this writes a
 * new login address immediately and unconfirmed, and a typo locks the account
 * out at the next login. The form says so; it can't do better than say so.
 */
export function useUpdateProfile() {
  const setUser = useAuthStore((s) => s.setUser);
  return useMutation<
    User,
    Error,
    { id: string; firstName: string; lastName: string; email: string }
  >({
    mutationFn: ({ id, firstName, lastName, email }) =>
      updateUser(id, { name: `${firstName} ${lastName}`.trim(), email }),
    onSuccess: (user) => {
      invalidateSession();
      setUser(user);
    },
  });
}

/**
 * Changes the password from inside the app — re-authenticating first.
 *
 * `PUT /api/users/:id` accepts a new password from any live session without
 * asking for the old one (CON-193), which would make a borrowed tab or a
 * stolen cookie enough to take the account permanently. So this hook proves
 * the current password before it changes anything, by logging in again:
 * `POST /api/sessions` verifies the credential and 401s on a wrong one, and
 * on success mints a *fresh* session rather than disturbing the existing one.
 * A wrong current password therefore fails here, having changed nothing.
 *
 * This is a lock on our own door. The endpoint is still open to anything that
 * calls it directly, and the real fix is server-side — as is revoking the
 * user's other sessions afterwards, which nothing here can do. Both are
 * CON-193.
 *
 * The email is read from the store rather than taken as an argument: it must
 * be the address the *current* password belongs to, and a form that let the
 * caller pass one could re-authenticate against the wrong account.
 */
export function useChangePassword() {
  const user = useAuthStore((s) => s.user);
  return useMutation<void, Error, { currentPassword: string; password: string }>({
    // `ChangePasswordSection` sorts this error out by hand: a wrong current
    // password is shown against the current-password field and deliberately
    // kept out of the generic paragraph. A toast would take that
    // field-scoped message — "invalid credentials" — and repeat it globally,
    // pointing at nothing.
    meta: { errorToast: false },
    mutationFn: async ({ currentPassword, password }) => {
      if (!user) throw new Error("You are not signed in");
      // Throws "invalid credentials" on a wrong password — surfaced against
      // the current-password field, which is the one the user got wrong.
      await loginRequest({ email: user.email, password: currentPassword });
      // Name and email are required by the endpoint even here; resend the
      // current values so a password change can't quietly rewrite identity.
      await updateUser(user.id, {
        name: `${user.firstName} ${user.lastName}`.trim(),
        email: user.email,
        password,
      });
    },
    onSuccess: () => {
      // The re-auth above replaced the session cookie; drop the cached probe
      // so nothing keeps answering from the pre-change session.
      invalidateSession();
    },
  });
}

/**
 * Deletes the signed-in user's own account, then tears down every local trace
 * of them.
 *
 * The local teardown is deliberately unconditional and best-effort, the same
 * rule the logout screen follows: once the server has destroyed the account,
 * a persisted user and a warm query cache on this device are stale at best and
 * misleading at worst, so a storage API refusing us must not leave them behind.
 *
 * What the server does is far larger than "the account" suggests — see
 * `deleteUser` in `services/api/users.ts`. The caller is responsible for
 * saying so before it gets here.
 */
export function useDeleteAccount() {
  const clearUser = useAuthStore((s) => s.clearUser);
  return useMutation<void, Error, string>({
    // `DeleteAccountDialog` renders `error.message` inside itself, which is
    // where the user is looking and where the retry is.
    meta: { errorToast: false },
    mutationFn: deleteUser,
    onSuccess: async () => {
      invalidateSession();
      clearUser();
      try {
        await clearAllApplicationData();
      } catch {
        // Best-effort — the account is already gone server-side.
      }
    },
  });
}
