/**
 * The tester invite a Google sign-up is redeeming (CON-402).
 *
 * The invite rides Google's round trip twice: in the server's `return_to`
 * (`/signup?invite=<token>`), and here. The second copy is the one that
 * matters, because the "name your workspace" step that has to send it as
 * `invite_token` cannot see `return_to` — the pending preview carries only the
 * Google identity, and `return_to` comes back on the response to the very call
 * that needed the token.
 *
 * **`sessionStorage`, like `lib/planIntent`.** Google returns to the tab that
 * left for it, and an invite belongs to that visit: another tab, or somebody
 * else signing up from this browser next week, must not redeem it by accident.
 * It is written on the click that leaves for Google rather than when the page
 * shows, so a plain sign-up later in the same tab does not carry it along.
 */

const KEY = 'ogen.testerInvite'

/** Invite tokens are URL-safe random strings; nothing else is worth carrying. */
const TOKEN = /^[A-Za-z0-9_-]{8,256}$/

export function rememberTesterInvite(token: string): void {
  if (!TOKEN.test(token)) return
  try {
    sessionStorage.setItem(KEY, token)
  } catch {
    // Blocked storage: the Google step then signs up without the invite, and
    // the server's refusal says what happened.
  }
}

export function readTesterInvite(): string | null {
  try {
    const value = sessionStorage.getItem(KEY)
    return value && TOKEN.test(value) ? value : null
  } catch {
    return null
  }
}

/** Once the invite is spent, or known to be dead. */
export function clearTesterInvite(): void {
  try {
    sessionStorage.removeItem(KEY)
  } catch {
    // Nothing to clear.
  }
}

/** The invite screen for a token, optionally saying why the person is back. */
export function testerInvitePath(
  token: string,
  error?: 'invite_email_mismatch',
): string {
  const q = new URLSearchParams({ invite: token })
  if (error) q.set('error', error)
  return `/signup?${q.toString()}`
}
