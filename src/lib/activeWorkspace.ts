/**
 * Which workspace *this tab* is working in (CON-147).
 *
 * The server resolves the active workspace per request, from an
 * `X-Workspace-Id` header, and the session cookie carries only identity. That
 * is what lets one login hold client A open in one tab and client B in another
 * — the requirement the whole feature exists for. It also decides where this
 * value may live:
 *
 * - **`sessionStorage`, never `localStorage`.** localStorage is shared by every
 *   tab on the origin, so writing the active workspace there would couple the
 *   tabs back together and undo the point. sessionStorage is per-tab and
 *   survives a refresh, which is exactly the lifetime wanted.
 * - **Not in a store, not in the Query cache.** `services/api/base.ts` has to
 *   read it synchronously while building a request, long before React is
 *   involved and from code the auth store's own dependencies import. A plain
 *   module with a subscription keeps this a leaf and keeps the read cheap.
 *
 * A tab with nothing stored yet sends no header and the server falls back to
 * the account's default workspace. That fallback is a seed, not a resting
 * state: `routes/__root.tsx` writes the resolved default in here on first load,
 * because a tab left header-less would silently follow the default around when
 * *another* tab changed it.
 */

import { useSyncExternalStore } from 'react'

const KEY = 'ogen.activeWorkspace'

const listeners = new Set<() => void>()

/**
 * Mirrors the stored value. sessionStorage reads are cheap but not free, and
 * `useSyncExternalStore` demands a `getSnapshot` that returns a stable value
 * for an unchanged store — reading the string every call is fine (strings
 * compare by value), but the cache also lets the request layer ask on every
 * single request without touching storage.
 */
let current: string | null = read()

function read(): string | null {
  try {
    return sessionStorage.getItem(KEY)
  } catch {
    // Private mode / disabled storage: the tab simply has no pinned workspace
    // and rides the server's default. Degraded, not broken.
    return null
  }
}

/** The workspace this tab acts in, or `null` to mean "whatever the account defaults to". */
export function getActiveWorkspaceId(): string | null {
  return current
}

/**
 * Pins this tab to a workspace. Callers are responsible for the cache: every
 * scoped query in memory belongs to the *previous* workspace, so a switch is
 * this call plus a `queryClient.clear()` — see `useSwitchWorkspace`.
 */
export function setActiveWorkspaceId(id: string | null): void {
  if (current === id) return
  current = id
  try {
    if (id === null) sessionStorage.removeItem(KEY)
    else sessionStorage.setItem(KEY, id)
  } catch {
    // Keep the in-memory value: it is still correct for this page's lifetime,
    // it just won't survive a refresh.
  }
  listeners.forEach((fn) => fn())
}

function subscribe(fn: () => void): () => void {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

/**
 * The active workspace id, as a component may read it. Deliberately **not**
 * cross-tab reactive: a `storage` event would carry another tab's choice, and
 * this tab's choice is its own.
 */
export function useActiveWorkspaceId(): string | null {
  return useSyncExternalStore(subscribe, getActiveWorkspaceId, () => null)
}
