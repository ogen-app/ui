import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import { useShallow } from 'zustand/react/shallow'
import type { ChatMessage, PostAssistantComplete, PostAssistantMessage } from '@/types/assistant'
import type { AgentRef } from '@/assistant/agents'
import { threadKey } from '@/assistant/agents'
import {
  getPostMessages,
  parseAssistantModelContent,
  runPostAssistant,
  type AssistantStreamEvent,
} from '@/services/api/postAssistant'

export type AssistantThreadStatus = 'loading' | 'idle' | 'streaming'

export type AssistantThread = {
  key: string
  ref: AgentRef
  status: AssistantThreadStatus
  messages: ChatMessage[]
  /** Thread-level error (e.g. history failed to load, transport failure). */
  error: string | null
  /**
   * Bumped by `markContentApplied` after an edit has been refetched into the
   * post query cache. The post route watches this to remount its editor so it
   * re-reads the freshly persisted content. Not bumped on `complete` directly —
   * the runtime invalidates the query first to avoid a stale-content race.
   */
  contentRevision: number
}

/**
 * Invoked when a turn completes. Registered once by the runtime (which holds the
 * query client) so the pure store stays React/query-free. Used to invalidate the
 * post query and then call `markContentApplied` when `action` is `edited`.
 */
export type AssistantCompletionHandler = (
  ref: AgentRef,
  result: PostAssistantComplete
) => void

type AssistantState = {
  threads: Record<string, AssistantThread>
  openOrder: string[]
  activeKey: string | null
  completionHandler: AssistantCompletionHandler | null

  /** Create-or-focus the thread for `ref`, loading history on first open. */
  openThread: (ref: AgentRef) => void
  focusThread: (key: string) => void
  closeThread: (key: string) => void
  submitInstruction: (key: string, text: string) => void
  cancelTurn: (key: string) => void
  markContentApplied: (key: string) => void
  setCompletionHandler: (handler: AssistantCompletionHandler | null) => void
}

// AbortControllers live outside the store: they are neither serializable nor
// render-relevant, keyed by thread so each turn can be cancelled independently.
const aborters = new Map<string, AbortController>()

function newId(): string {
  return crypto.randomUUID()
}

/** Seeds a thread's transcript from persisted history (sorted oldest-first). */
function toChatMessages(msgs: PostAssistantMessage[]): ChatMessage[] {
  return [...msgs]
    .sort((a, b) => a.created_at.localeCompare(b.created_at))
    .map((m): ChatMessage => {
      if (m.role === 'user') {
        return { id: m.id, role: 'user', text: m.content, createdAt: m.created_at }
      }
      const parsed = parseAssistantModelContent(m.content)
      return {
        id: m.id,
        role: 'model',
        action: parsed?.action ?? null,
        explanation: parsed?.explanation ?? m.content,
        tools: [],
        pending: false,
      }
    })
}

async function loadHistory(ref: AgentRef): Promise<ChatMessage[]> {
  if (ref.kind === 'post' && ref.targetId) {
    return toChatMessages(await getPostMessages(ref.targetId))
  }
  return []
}

function startRun(
  ref: AgentRef,
  instruction: string,
  onEvent: (event: AssistantStreamEvent) => void,
  signal: AbortSignal
): Promise<void> {
  if (ref.kind === 'post' && ref.targetId) {
    return runPostAssistant(ref.targetId, instruction, onEvent, signal)
  }
  return Promise.reject(new Error('This assistant is not available yet'))
}

export const useAssistantStore = create<AssistantState>()(
  devtools(
    (set, get) => {
      const patchThread = (
        key: string,
        fn: (t: AssistantThread) => AssistantThread
      ) =>
        set((s) => {
          const t = s.threads[key]
          if (!t) return s
          return { threads: { ...s.threads, [key]: fn(t) } }
        })

      const patchMessage = (
        key: string,
        id: string,
        fn: (m: ChatMessage) => ChatMessage
      ) =>
        patchThread(key, (t) => ({
          ...t,
          messages: t.messages.map((m) => (m.id === id ? fn(m) : m)),
        }))

      return {
        threads: {},
        openOrder: [],
        activeKey: null,
        completionHandler: null,

        openThread: (ref) => {
          const key = threadKey(ref)
          if (get().threads[key]) {
            set((s) => ({
              activeKey: key,
              openOrder: s.openOrder.includes(key)
                ? s.openOrder
                : [...s.openOrder, key],
            }))
            return
          }

          const thread: AssistantThread = {
            key,
            ref,
            status: 'loading',
            messages: [],
            error: null,
            contentRevision: 0,
          }
          set((s) => ({
            threads: { ...s.threads, [key]: thread },
            openOrder: [...s.openOrder, key],
            activeKey: key,
          }))

          loadHistory(ref)
            .then((messages) =>
              patchThread(key, (t) => ({ ...t, messages, status: 'idle' }))
            )
            .catch((err: unknown) =>
              patchThread(key, (t) => ({
                ...t,
                status: 'idle',
                error: err instanceof Error ? err.message : 'Failed to load history',
              }))
            )
        },

        focusThread: (key) => {
          if (get().threads[key]) set({ activeKey: key })
        },

        closeThread: (key) => {
          aborters.get(key)?.abort()
          aborters.delete(key)
          set((s) => {
            if (!s.threads[key]) return s
            const { [key]: _removed, ...threads } = s.threads
            const openOrder = s.openOrder.filter((k) => k !== key)
            const activeKey =
              s.activeKey === key
                ? openOrder[openOrder.length - 1] ?? null
                : s.activeKey
            return { threads, openOrder, activeKey }
          })
        },

        submitInstruction: (key, text) => {
          const thread = get().threads[key]
          if (!thread || thread.status === 'streaming') return
          const trimmed = text.trim()
          if (!trimmed) return

          const modelId = newId()
          set((s) => {
            const t = s.threads[key]
            if (!t) return s
            const userMsg: ChatMessage = {
              id: newId(),
              role: 'user',
              text: trimmed,
              createdAt: new Date().toISOString(),
            }
            const modelMsg: ChatMessage = {
              id: modelId,
              role: 'model',
              action: null,
              explanation: '',
              tools: [],
              pending: true,
            }
            return {
              threads: {
                ...s.threads,
                [key]: {
                  ...t,
                  status: 'streaming',
                  error: null,
                  messages: [...t.messages, userMsg, modelMsg],
                },
              },
            }
          })

          const controller = new AbortController()
          aborters.set(key, controller)

          const onEvent = (event: AssistantStreamEvent) => {
            switch (event.type) {
              case 'explanation_delta':
                patchMessage(key, modelId, (m) =>
                  m.role === 'model'
                    ? { ...m, explanation: m.explanation + event.delta }
                    : m
                )
                break
              case 'content_delta':
                // Captured server-side and applied via refetch on complete; not
                // rendered live in this phase.
                break
              case 'tool_call':
                patchMessage(key, modelId, (m) =>
                  m.role === 'model'
                    ? {
                        ...m,
                        tools: [
                          ...m.tools,
                          { ref: event.ref, name: event.name, done: false },
                        ],
                      }
                    : m
                )
                break
              case 'tool_result':
                patchMessage(key, modelId, (m) =>
                  m.role === 'model'
                    ? {
                        ...m,
                        tools: m.tools.map((tool) =>
                          tool.ref === event.ref
                            ? { ...tool, done: true, ok: event.ok }
                            : tool
                        ),
                      }
                    : m
                )
                break
              case 'complete': {
                patchMessage(key, modelId, (m) =>
                  m.role === 'model'
                    ? {
                        ...m,
                        pending: false,
                        action: event.result.action,
                        explanation: event.result.explanation || m.explanation,
                      }
                    : m
                )
                const handler = get().completionHandler
                const ref = get().threads[key]?.ref
                if (handler && ref) handler(ref, event.result)
                break
              }
              case 'error':
                patchMessage(key, modelId, (m) =>
                  m.role === 'model'
                    ? { ...m, pending: false, action: 'declined', error: event.message }
                    : m
                )
                patchThread(key, (t) => ({ ...t, error: event.message }))
                break
            }
          }

          startRun(thread.ref, trimmed, onEvent, controller.signal)
            .catch((err: unknown) => {
              if (controller.signal.aborted) return
              const message = err instanceof Error ? err.message : 'The assistant failed'
              patchMessage(key, modelId, (m) =>
                m.role === 'model' && m.pending
                  ? { ...m, pending: false, error: message }
                  : m
              )
              patchThread(key, (t) => ({ ...t, error: message }))
            })
            .finally(() => {
              if (aborters.get(key) === controller) aborters.delete(key)
              patchThread(key, (t) =>
                t.status === 'streaming' ? { ...t, status: 'idle' } : t
              )
              patchMessage(key, modelId, (m) =>
                m.role === 'model' && m.pending ? { ...m, pending: false } : m
              )
            })
        },

        cancelTurn: (key) => {
          aborters.get(key)?.abort()
          aborters.delete(key)
        },

        markContentApplied: (key) =>
          patchThread(key, (t) => ({ ...t, contentRevision: t.contentRevision + 1 })),

        setCompletionHandler: (handler) => set({ completionHandler: handler }),
      }
    },
    { name: 'assistantStore' }
  )
)

// --- Selectors -------------------------------------------------------------

export function useActiveThread(): AssistantThread | null {
  return useAssistantStore((s) => (s.activeKey ? s.threads[s.activeKey] ?? null : null))
}

export function useOpenThreads(): AssistantThread[] {
  return useAssistantStore(
    useShallow((s) =>
      s.openOrder.map((k) => s.threads[k]).filter((t): t is AssistantThread => Boolean(t))
    )
  )
}

/** Editor remount signal for a given thread (0 when the thread isn't open). */
export function useThreadContentRevision(key: string): number {
  return useAssistantStore((s) => s.threads[key]?.contentRevision ?? 0)
}
