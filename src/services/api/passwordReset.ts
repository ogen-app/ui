/**
 * Password-reset API — the two public endpoints behind `/auth/forgot` and
 * `/auth/reset` (CON-108).
 *
 * Both are unauthenticated by definition: the whole point is that the caller
 * cannot log in. The capability is the emailed token, so `reset()` needs no
 * session and `credentials: "include"` on these calls is incidental.
 *
 * The server half shipped as CON-161 and matches the contract below. See
 * `docs/onboarding.md` → "Password reset".
 */

import { apiVoid } from "./http";

/**
 * `POST /api/password-reset` — sends the one-time link, if that address has an
 * account.
 *
 * Resolves on 202 whether or not the address is known. That is the server's
 * contract and it is deliberate: an endpoint that answers differently for a
 * registered and an unregistered address is an account-enumeration oracle, and
 * this one is public and unauthenticated. The UI therefore cannot tell the
 * user "no account with that email" — and must not go looking for the answer
 * by another route either.
 *
 * Rejects on a **429**: the endpoint is throttled per address and per client
 * IP (CON-161), which the resend button makes genuinely reachable. The server's
 * message is safe to print as-is — a 429 says a limit was hit and nothing about
 * whether the address has an account, so surfacing it doesn't reopen the
 * enumeration hole the 202 closes.
 */
export async function requestPasswordReset(email: string): Promise<void> {
  await apiVoid("/api/password-reset", "Unable to send the reset link", {
    method: "POST",
    body: { email },
  });
}

/**
 * `POST /api/password-reset/confirm` — consumes the token and sets the new
 * password. The token is single-use and short-lived; a spent or expired one
 * comes back as a 400 whose message the caller shows as-is.
 */
export async function resetPassword(token: string, password: string): Promise<void> {
  await apiVoid("/api/password-reset/confirm", "Unable to reset your password", {
    method: "POST",
    body: { token, password },
  });
}
