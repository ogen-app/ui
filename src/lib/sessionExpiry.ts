/**
 * What happens when the session dies while the app is open.
 *
 * The root guard (`routes/__root.tsx`) only runs on a page load, so it catches
 * the session that was already gone when you arrived. It cannot catch the one
 * that expires at hour 168 while a tab sits open: from then on every request
 * 401s, each feature shows its own "authentication required" in a toast or an
 * inline error, and the persisted auth store still names a user. Nothing tells
 * the user what actually happened, and nothing takes them anywhere they could
 * fix it.
 *
 * `handleUnauthorized` is the one place that does. It is called from the API
 * layer's response check, so any endpoint reporting 401 recovers the same way.
 *
 * Three deliberate choices:
 *
 * - **A full page load, not a router navigation.** The in-memory Query cache
 *   still holds the previous user's campaigns, posts and assets. Reloading is
 *   the only way to drop all of it at once, and it re-runs the root guard, so
 *   the redirect and the store rehydration go through exactly the same path as
 *   a cold boot rather than a second implementation of it.
 * - **Once.** A 401 rarely arrives alone — a screen with four queries produces
 *   four of them in the same tick. The latch means the first one wins and the
 *   rest are ignored, instead of each scheduling its own navigation.
 * - **localStorage directly, not the auth store.** This module is reached from
 *   `services/api/http.ts`, which the store's own dependencies import; going
 *   through `useAuthStore` here would close an import cycle. Writing the one
 *   persisted key is equivalent — the page is about to reload, so in-memory
 *   store state has no future to protect — and it keeps this module a leaf.
 */

import { AUTH_STORE_PERSIST_KEY } from '@/stores/constants'

let handled = false

/** True on the login/register/reset screens, where a 401 is just the answer. */
function onAuthRoute(): boolean {
  return window.location.pathname.startsWith('/auth')
}

/**
 * True once the redirect above has been started and the page is on its way
 * out. Read by the mutation-cache error default (`lib/queryClient.ts`): a 401
 * still throws, so every in-flight mutation is about to report a failure that
 * is really this one, in its own words, over the top of the explanation.
 */
export function isSessionExpiring(): boolean {
  return handled
}

export function handleUnauthorized(): void {
  if (handled || onAuthRoute()) return
  handled = true

  // Drop the persisted user so the reloaded app doesn't paint a signed-in
  // sidebar for the instant before the root guard resolves.
  try {
    localStorage.removeItem(AUTH_STORE_PERSIST_KEY)
  } catch {
    // Private-mode / quota failures must not stop the redirect below.
  }

  const back = window.location.pathname + window.location.search
  window.location.assign(
    `/auth/login?redirect=${encodeURIComponent(back)}&expired=1`,
  )
}
