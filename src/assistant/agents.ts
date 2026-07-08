// Agent identity for the unified assistant panel. Each conversation thread is
// bound to an agent scoped to a target entity. Only the `post` agent is wired
// up today (CON-42); `campaign` and `global` are reserved for follow-up tickets.
// Phase 3 adds per-kind descriptors (endpoint / history / completion side-effects)
// on top of these identity types.

export type AgentKind = 'post' | 'campaign' | 'global'

export type AgentRef = {
  kind: AgentKind
  /** Target entity id; undefined for the singleton `global` agent. */
  targetId?: string
  /** Human label shown on the thread tab. */
  title: string
}

/**
 * Stable key identifying a thread, so opening the same target twice reuses one
 * thread/tab rather than spawning duplicates. e.g. `post:42`, `global:root`.
 */
export function threadKey(ref: AgentRef): string {
  return `${ref.kind}:${ref.targetId ?? 'root'}`
}
