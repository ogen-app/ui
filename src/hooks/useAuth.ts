import { useMutation } from '@tanstack/react-query'

import {
  checkSession,
  login as loginRequest,
  invalidateSession,
} from '@/services/api/sessions'
import {
  requestPasswordReset,
  resetPassword as resetPasswordRequest,
} from '@/services/api/passwordReset'
import { signup as signupRequest } from '@/services/api/tenants'
import { acceptInvitation } from '@/services/api/invitations'
import { updateUser } from '@/services/api/users'
import { listMembers, removeMember } from '@/services/api/workspaces'
import { setActiveWorkspaceId } from '@/lib/activeWorkspace'
import { queryClient } from '@/lib/queryClient'
import type { LoginPayload, Session } from '@/types/session'
import type { SignupPayload } from '@/types/tenant'
import type { User } from '@/types/user'
import { useAuthStore } from '@/stores/authStore'

/**
 * Login mutation. On success it invalidates the cached session probe and
 * re-probes through the same path the root guard uses (`GET
 * /api/current_user`), hydrating the auth store with the user + tenant.
 */
export function useLogin() {
  const setUser = useAuthStore((s) => s.setUser)
  return useMutation<Session, Error, LoginPayload>({
    // The form renders `error` beside the fields it refers to; a toast on top
    // of that would say the same thing twice and further from the inputs.
    meta: { errorToast: false },
    mutationFn: loginRequest,
    onSuccess: async () => {
      // A login is a fresh identity, but not necessarily a fresh tab: session
      // expiry and direct navigation reach this screen without passing the
      // logout teardown, leaving the previous user's workspace pin and warm
      // query cache behind. Carrying either across accounts is wrong in both
      // directions — a pinned workspace the new account can't reach 403s
      // everything, and one it *can* reach silently lands them in the other
      // user's chosen workspace. Drop both; the root guard re-seeds the pin.
      setActiveWorkspaceId(null)
      queryClient.clear()
      // Re-probe through the same cached path the root guard uses: one
      // GET /api/current_user resolves the user + tenant and primes the cache.
      invalidateSession()
      try {
        const user = await checkSession()
        if (user) setUser(user)
      } catch {
        // A hiccup here (e.g. transient ServerUnavailableError) must not
        // block the caller-level onSuccess: the login itself succeeded, and
        // the root guard re-probes on the post-login navigation anyway.
      }
    },
  })
}

/**
 * Self-service signup (CON-97): creates the organization + first admin and,
 * because `POST /api/tenants` opens a session, leaves the caller authenticated.
 * We invalidate the cached session probe so the root guard re-reads it as
 * authenticated, then seed the auth store from the signup response (which
 * already carries the new tenant).
 */
export function useSignup() {
  const setUser = useAuthStore((s) => s.setUser)
  return useMutation<User, Error, SignupPayload>({
    // Same as login: `AuthRegisterForm` shows `error` inline.
    meta: { errorToast: false },
    mutationFn: signupRequest,
    onSuccess: (user) => {
      invalidateSession()
      setUser(user)
    },
  })
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
  })
}

/** Step two: spend the token and set the new password (CON-108). */
export function useResetPassword() {
  return useMutation<void, Error, { token: string; password: string }>({
    // `AuthResetPasswordForm` renders `error.message`, and next to it the way
    // out of an expired token — which a toast would drop.
    meta: { errorToast: false },
    mutationFn: ({ token, password }) => resetPasswordRequest(token, password),
  })
}

/**
 * Accepting an invitation (CON-26/CON-147).
 *
 * With a payload it creates the account and signs it in — the server opens the
 * session and sets the cookie as part of accepting, so there is nothing to log
 * in with afterwards. Without one it adds a workspace to the account already
 * signed in, and no session changes hands. See `acceptInvitation`.
 *
 * Either way the tab is moved into the workspace just joined: landing anywhere
 * else after accepting an invitation would be answering a question nobody
 * asked. The cache goes with it, since it belongs to wherever this tab was.
 */
export function useAcceptInvitation(token: string) {
  const setUser = useAuthStore((s) => s.setUser)
  return useMutation<
    User,
    Error,
    { name: string; password: string } | undefined
  >({
    // The form renders `error` beside the fields, and for a dead token beside
    // the way out of it — which a toast would drop.
    meta: { errorToast: false },
    mutationFn: (payload) => acceptInvitation(token, payload),
    onSuccess: (user) => {
      invalidateSession()
      setUser(user)
      if (user.tenant?.id) {
        setActiveWorkspaceId(user.tenant.id)
        queryClient.clear()
      }
    },
  })
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
  const setUser = useAuthStore((s) => s.setUser)
  return useMutation<
    User,
    Error,
    { id: string; firstName: string; lastName: string; email: string }
  >({
    mutationFn: ({ id, firstName, lastName, email }) =>
      updateUser(id, { name: `${firstName} ${lastName}`.trim(), email }),
    onSuccess: (user) => {
      invalidateSession()
      setUser(user)
    },
  })
}

/*
 * There is no in-app password change. `PasswordSection` on /profile sends the
 * emailed reset instead, so `useRequestPasswordReset` above serves both it and
 * the signed-out /auth/forgot screen.
 *
 * What used to be here re-authenticated through POST /api/sessions and then
 * PUT the new password, because the endpoint asks for no current password and
 * revokes no sessions (CON-193). Both of those are still true of the endpoint;
 * the difference is that nothing in the UI calls it with a password anymore.
 */

/**
 * Leaves the workspace **this tab** is in — there is no account deletion on
 * the API since CON-147 split memberships from accounts; `DELETE
 * /api/users/:id` detaches one membership and cascades into what that
 * membership created there, and the login survives.
 *
 * The membership id is resolved from the scoped member list at call time, by
 * email: the id in the auth store names the *default* workspace's membership,
 * which is the wrong row in any tab that switched. The server's ≥1-owner
 * guard answers 409 for a sole owner — the dialog renders that message where
 * the user is looking.
 *
 * On success the tab does a full load of `/`: the cache and the pin both
 * belong to the workspace just left, and the root guard re-seeds from the
 * account's default (falling back to any surviving workspace server-side).
 * With no workspace left, that load lands on login via the ordinary 401 path.
 */
export function useLeaveWorkspace() {
  const email = useAuthStore((s) => s.user?.email)
  return useMutation<void, Error, void>({
    // The dialog renders `error.message` inside itself, which is where the
    // user is looking and where the retry is.
    meta: { errorToast: false },
    mutationFn: async () => {
      const me = (await listMembers(email ?? '')).find((m) => m.is_self)
      if (!me) throw new Error('Unable to resolve your membership')
      await removeMember(me.id)
    },
    onSuccess: () => {
      invalidateSession()
      setActiveWorkspaceId(null)
      window.location.assign('/')
    },
  })
}
