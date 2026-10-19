import { getActiveWorkspaceId } from '@/lib/activeWorkspace'

/**
 * Who owns an idea — the one thing an idea now records that `/api/ideas` has
 * no column for (`idea-owner`).
 *
 * Kept here, in one file, so the day `owner_id` exists is a deletion rather
 * than a refactor — the arrangement `contentLocal.ts` uses for a post's format.
 *
 * ## What is faked
 *
 * All of it. An owner is not a field on the idea, not part of `IdeaEdit`, and
 * nothing on the server reads it: the filter, the grouping and the counts know
 * nothing about it.
 *
 * ## What is not stored at all
 *
 * The sole member. In a one-person workspace the owner is that person and
 * nobody chooses it, so nothing is written for it — `useIdeaOwner` derives it.
 * Only a choice made in a workspace with someone to choose between lands here.
 *
 * ## What the fake costs
 *
 * It is **per browser**. A colleague opening the same idea sees no owner. That
 * is acceptable for a screen being designed and not for one shipped.
 */

type Store = {
  /** Membership id, keyed by idea id. Absent means the idea has no owner. */
  owners: Record<string, string>
}

const EMPTY: Store = { owners: {} }

const listeners = new Set<() => void>()

function storeKey(): string {
  return `ogen.ideas.owners.${getActiveWorkspaceId() ?? 'default'}`
}

function read(): Store {
  try {
    const stored = localStorage.getItem(storeKey())
    if (stored) return { ...EMPTY, ...(JSON.parse(stored) as Store) }
  } catch {
    // Unreadable reads as a workspace where nobody owns anything, which is
    // what every idea looked like before this existed.
  }
  return structuredClone(EMPTY)
}

/** The membership filed as an idea's owner, or `null`. */
export function readIdeaOwner(ideaId: string): string | null {
  return read().owners[ideaId] ?? null
}

/** Give an idea an owner, or `null` to clear it. */
export function writeIdeaOwner(ideaId: string, memberId: string | null): void {
  const store = read()
  const owners = { ...store.owners }
  if (memberId) owners[ideaId] = memberId
  else delete owners[ideaId]
  try {
    localStorage.setItem(storeKey(), JSON.stringify({ ...store, owners }))
  } catch {
    // Quota or private mode. The idea is still saved; its owner is not.
  }
  listeners.forEach((listener) => listener())
}

/** For `useSyncExternalStore`: every row re-reads when any owner changes. */
export function subscribeIdeaOwners(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}
