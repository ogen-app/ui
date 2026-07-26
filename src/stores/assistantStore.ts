import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import { queryClient } from '@/lib/queryClient'
import { postKey } from '@/hooks/usePost'
import { describeTool, humanizeStep } from '@/lib/assistantTools'
import { flushPendingSave } from '@/lib/pendingSaves'
import {
  listPostMessages,
  parseModelContent,
  streamPostAssistant,
  type AssistantStreamEvent,
} from '@/services/api/assistant'
import { useSettingsStore } from '@/stores/settingsStore'
import type {
  AssistantStep,
  AssistantThread,
  AssistantTurn,
  ThreadSubject,
} from '@/types/assistant'

/**
 * Assistant threads, one per subject (a post today, a campaign once CON-112
 * lands). A thread is *started* from its subject's page, but from then on it
 * is reachable from anywhere: the panel lists every open thread, and a turn
 * keeps running while the user navigates away.
 *
 * That is why a run lives here rather than in a component — the `fetch` and
 * its AbortController are held at module scope, so unmounting the panel or
 * leaving the post page can't cancel work in flight. Same reasoning as
 * `uploadStore`.
 */

/** In-flight runs, keyed by thread id. Never rendered — kept out of state. */
const runners = new Map<string, AbortController>()

export function threadIdFor(subject: ThreadSubject): string {
  return subject.kind === 'post' ? `post:${subject.postId}` : `campaign:${subject.campaignId}`
}

let turnCounter = 0
const nextTurnId = (role: AssistantTurn['role']) => `${role}-${++turnCounter}`

type AssistantState = {
  threads: Record<string, AssistantThread>
  /** The thread the panel is showing, or null for the thread list. */
  activeThreadId: string | null

  /** Register a thread for a subject and make it the active one. */
  openThread: (subject: ThreadSubject, title: string) => string
  /** Keep a thread's label in sync with its subject, without selecting it. */
  renameThread: (threadId: string, title: string) => void
  /** Show a thread that is already open. */
  selectThread: (threadId: string | null) => void
  /** Load persisted history once per thread. */
  loadHistory: (threadId: string) => Promise<void>
  /** Run one turn. No-op if the thread is already running. */
  send: (threadId: string, instruction: string) => Promise<void>
  /** Abort the running turn. */
  cancel: (threadId: string) => void
  /** Forget a thread (its server history is untouched). */
  closeThread: (threadId: string) => void
  markRead: (threadId: string) => void
}

export const useAssistantStore = create<AssistantState>()(
  devtools(
    (set, get) => {
      const patchThread = (id: string, changes: Partial<AssistantThread>) =>
        set((s) =>
          s.threads[id] ? { threads: { ...s.threads, [id]: { ...s.threads[id], ...changes } } } : s,
        )

      /** Replace the last turn of a thread — every stream event lands here. */
      const patchLastTurn = (
        id: string,
        update: (turn: AssistantTurn) => AssistantTurn,
      ) =>
        set((s) => {
          const thread = s.threads[id]
          if (!thread || thread.turns.length === 0) return s
          const turns = thread.turns.slice()
          turns[turns.length - 1] = update(turns[turns.length - 1])
          return { threads: { ...s.threads, [id]: { ...thread, turns } } }
        })

      return {
        threads: {},
        activeThreadId: null,

        openThread: (subject, title) => {
          const id = threadIdFor(subject)
          set((s) => {
            const existing = s.threads[id]
            const thread: AssistantThread = existing
              ? { ...existing, title, unread: false }
              : {
                  id,
                  subject,
                  title,
                  turns: [],
                  status: 'idle',
                  runStartedAt: null,
                  unread: false,
                  loaded: false,
                }
            return { threads: { ...s.threads, [id]: thread }, activeThreadId: id }
          })
          return id
        },

        renameThread: (threadId, title) => {
          const current = get().threads[threadId]
          if (!current || current.title === title) return
          patchThread(threadId, { title })
        },

        selectThread: (threadId) => {
          set({ activeThreadId: threadId })
          if (threadId) patchThread(threadId, { unread: false })
        },

        markRead: (threadId) => patchThread(threadId, { unread: false }),

        closeThread: (threadId) => {
          get().cancel(threadId)
          set((s) => {
            const threads = { ...s.threads }
            delete threads[threadId]
            return {
              threads,
              activeThreadId: s.activeThreadId === threadId ? null : s.activeThreadId,
            }
          })
        },

        loadHistory: async (threadId) => {
          const thread = get().threads[threadId]
          if (!thread || thread.loaded || thread.subject.kind !== 'post') return
          // Mark loaded up front so a re-render can't fire a second fetch.
          patchThread(threadId, { loaded: true })
          try {
            const rows = await listPostMessages(thread.subject.postId)
            const turns: AssistantTurn[] = rows.map((row) => {
              if (row.role === 'user') {
                return { id: row.id, role: 'user', content: row.content }
              }
              const result = parseModelContent(row.content)
              return {
                id: row.id,
                role: 'assistant',
                content: result.explanation,
                action: result.action,
                saveVersion: result.saveVersion,
                versionNote: result.versionNote,
              }
            })
            // A turn may have started while history was loading; keep it last.
            set((s) => {
              const current = s.threads[threadId]
              if (!current) return s
              const live = current.turns
              return {
                threads: { ...s.threads, [threadId]: { ...current, turns: [...turns, ...live] } },
              }
            })
          } catch {
            // History is a nicety — a failed load leaves the thread usable.
            patchThread(threadId, { loaded: true })
          }
        },

        send: async (threadId, instruction) => {
          const thread = get().threads[threadId]
          const text = instruction.trim()
          if (!thread || !text || thread.status === 'running') return
          if (thread.subject.kind !== 'post') return

          // The assistant writes the post server-side, so any queued autosave
          // must land first or it would overwrite the edit a moment later.
          await flushPendingSave(thread.subject.postId)

          const startedAt = performance.now()
          const assistantTurnId = nextTurnId('assistant')
          const planStep: AssistantStep = {
            id: 'plan',
            kind: 'plan',
            label: 'Analyzing the request',
            startedAt,
            endedAt: null,
          }

          set((s) => {
            const current = s.threads[threadId]
            if (!current) return s
            return {
              threads: {
                ...s.threads,
                [threadId]: {
                  ...current,
                  status: 'running',
                  runStartedAt: Date.now(),
                  turns: [
                    ...current.turns,
                    { id: nextTurnId('user'), role: 'user', content: text },
                    {
                      id: assistantTurnId,
                      role: 'assistant',
                      content: '',
                      steps: [planStep],
                      startedAt,
                      endedAt: null,
                      streaming: true,
                    },
                  ],
                },
              },
            }
          })

          const controller = new AbortController()
          runners.set(threadId, controller)

          // A turn that lands while the user is elsewhere is "unread" — the
          // sidebar trigger carries the dot until they come back to it.
          const finish = (status: AssistantThread['status']) => {
            const settings = useSettingsStore.getState()
            const watching =
              settings.activeRightPanel === 'assistant' && get().activeThreadId === threadId
            patchThread(threadId, { status, runStartedAt: null, unread: !watching })
          }

          // Deltas arrive as the whole document so far, so the last one wins.
          let streamedContent = ''

          const onEvent = (event: AssistantStreamEvent) => {
            const now = performance.now()
            switch (event.type) {
              case 'explanation_delta':
                patchLastTurn(threadId, (t) => ({ ...t, content: t.content + event.delta }))
                break

              case 'content_delta':
                streamedContent += event.delta
                patchLastTurn(threadId, (t) => ({
                  ...t,
                  steps: withWritingStep(t.steps ?? [], now),
                }))
                break

              case 'tool_call':
                patchLastTurn(threadId, (t) => {
                  const steps = (t.steps ?? []).map((s) =>
                    s.kind !== 'tool' && s.endedAt === null ? { ...s, endedAt: now } : s,
                  )
                  steps.push({
                    id: event.ref ?? `${event.name}-${steps.length}`,
                    kind: 'tool',
                    tool: event.name,
                    input: event.input,
                    ref: event.ref,
                    label: describeTool(event.name, event.input, 'running'),
                    startedAt: now,
                    endedAt: null,
                  })
                  return { ...t, steps }
                })
                break

              case 'tool_result':
                patchLastTurn(threadId, (t) => ({
                  ...t,
                  steps: (t.steps ?? []).map((s) =>
                    s.kind === 'tool' && s.ref === event.ref && s.endedAt === null
                      ? { ...s, endedAt: now, label: describeTool(s.tool ?? '', s.input, 'done') }
                      : s,
                  ),
                }))
                break

              case 'progress':
                patchLastTurn(threadId, (t) => {
                  const steps = (t.steps ?? []).slice()
                  const idx = lastOpenToolIndex(steps)
                  if (idx < 0) return t
                  steps[idx] = { ...steps[idx], detail: humanizeStep(event.step) }
                  return { ...t, steps }
                })
                break

              case 'complete':
                patchLastTurn(threadId, (t) => ({
                  ...t,
                  content: event.result.explanation || t.content || 'Done.',
                  action: event.result.action,
                  saveVersion: event.result.saveVersion,
                  versionNote: event.result.versionNote,
                  steps: closeSteps(t.steps ?? [], now),
                  endedAt: now,
                  streaming: false,
                }))
                break

              case 'error':
                patchLastTurn(threadId, (t) => ({
                  ...t,
                  content: event.message,
                  failed: true,
                  steps: closeSteps(t.steps ?? [], now),
                  endedAt: now,
                  streaming: false,
                }))
                break
            }
          }

          try {
            await streamPostAssistant(thread.subject.postId, text, onEvent, controller.signal)

            // The server writes the edit to the post itself — `updatedContent`
            // is what it already saved. Never PUT it back; just refresh.
            const settled = get().threads[threadId]?.turns ?? []
            const applied = settled[settled.length - 1]
            if (applied?.action === 'edited' || streamedContent) {
              void queryClient.invalidateQueries({ queryKey: postKey(thread.subject.postId) })
            }
            finish('idle')
          } catch (err) {
            const aborted = err instanceof DOMException && err.name === 'AbortError'
            patchLastTurn(threadId, (t) => ({
              ...t,
              content: aborted ? 'Cancelled.' : errorText(err),
              failed: true,
              steps: closeSteps(t.steps ?? [], performance.now()),
              endedAt: performance.now(),
              streaming: false,
            }))
            finish(aborted ? 'idle' : 'error')
          } finally {
            runners.delete(threadId)
          }
        },

        cancel: (threadId) => {
          runners.get(threadId)?.abort()
          runners.delete(threadId)
        },
      }
    },
    { name: 'assistant' },
  ),
)

/** True while any thread has a turn in flight — drives the sidebar trigger. */
export function selectAnyRunning(state: AssistantState): boolean {
  return Object.values(state.threads).some((t) => t.status === 'running')
}

/** True when a thread finished while the user was looking elsewhere. */
export function selectAnyUnread(state: AssistantState): boolean {
  return Object.values(state.threads).some((t) => t.unread)
}

function lastOpenToolIndex(steps: AssistantStep[]): number {
  for (let i = steps.length - 1; i >= 0; i--) {
    if (steps[i].kind === 'tool' && steps[i].endedAt === null) return i
  }
  return -1
}

/**
 * The first content delta means the model has stopped planning and started
 * writing the post; close whatever was open and show that.
 */
function withWritingStep(steps: AssistantStep[], now: number): AssistantStep[] {
  if (steps.some((s) => s.kind === 'compose')) return steps
  const closed = steps.map((s) => (s.endedAt === null ? { ...s, endedAt: now } : s))
  return [
    ...closed,
    { id: 'compose', kind: 'compose', label: 'Writing the post', startedAt: now, endedAt: null },
  ]
}

function closeSteps(steps: AssistantStep[], now: number): AssistantStep[] {
  return steps.map((s) => (s.endedAt === null ? { ...s, endedAt: now } : s))
}

function errorText(err: unknown): string {
  return err instanceof Error ? err.message : 'The assistant failed'
}
