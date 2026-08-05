import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import { queryClient } from '@/lib/queryClient'
import { postKey } from '@/hooks/usePost'
import { campaignKey } from '@/hooks/useCampaigns'
import { describeTool, humanizeStep } from '@/lib/assistantTools'
import { flushPendingSave } from '@/lib/pendingSaves'
import {
  listCampaignMessages,
  listPostMessages,
  parseCampaignModelContent,
  parseModelContent,
  streamCampaignAssistant,
  streamPostAssistant,
  type AssistantStreamEvent,
} from '@/services/api/assistant'
import { useSettingsStore } from '@/stores/settingsStore'
import type {
  AssistantStep,
  AssistantThread,
  AssistantTurn,
  StreamedPost,
  ThreadSubject,
} from '@/types/assistant'

/**
 * Assistant threads, one per subject — a post (CON-42) or a campaign
 * (CON-112). A thread is *started* from its subject's page, but from then on
 * it is reachable from anywhere: the panel lists every open thread, and a turn
 * keeps running while the user navigates away.
 *
 * That is why a run lives here rather than in a component — the `fetch` and
 * its AbortController are held at module scope, so unmounting the panel or
 * leaving the page can't cancel work in flight. Same reasoning as
 * `uploadStore`.
 */

/** In-flight runs, keyed by thread id. Never rendered — kept out of state. */
const runners = new Map<string, AbortController>()

export function threadIdFor(subject: ThreadSubject): string {
  return subject.kind === 'post' ? `post:${subject.postId}` : `campaign:${subject.campaignId}`
}

/** The id whose pending edits a turn must flush before it starts. */
function saveKeyFor(subject: ThreadSubject): string {
  return subject.kind === 'post' ? subject.postId : subject.campaignId
}

let turnCounter = 0
const nextTurnId = (role: AssistantTurn['role']) => `${role}-${++turnCounter}`

type AssistantState = {
  threads: Record<string, AssistantThread>
  /** The thread the panel is showing, or null for the thread list. */
  activeThreadId: string | null
  /**
   * The thread for whatever the user is *looking at* — set on arrival at a
   * subject's page and left alone by panel navigation, so it survives
   * `selectThread(null)`. The list uses it to sort and to mark the current row;
   * `activeThreadId` can't, because browsing the list clears it.
   */
  currentThreadId: string | null
  /**
   * A draft asked for from outside the panel — an overview CTA, a starter
   * chip's equivalent elsewhere. The panel puts it in the composer and clears
   * it; `token` makes the same text asked for twice count twice.
   */
  prefillRequest: { threadId: string; text: string; token: number } | null

  /** Register a thread for a subject and make it the active one. */
  openThread: (subject: ThreadSubject, title: string, campaignTitle: string) => string
  /** Keep a thread's labels in sync with its subject, without selecting it. */
  renameThread: (threadId: string, title: string, campaignTitle?: string) => void
  /** Show a thread that is already open. */
  selectThread: (threadId: string | null) => void
  /**
   * Show a thread with `text` waiting in its composer. Never sends it — same
   * rule as the starter chips: the campaign tools write, so the user gets the
   * last word.
   */
  askFor: (threadId: string, text: string) => void
  /** Called by the panel once the draft has landed in the composer. */
  clearPrefillRequest: () => void
  /** Load persisted history once per thread. */
  loadHistory: (threadId: string) => Promise<void>
  /** Run one turn. No-op if the thread is already running. */
  send: (threadId: string, instruction: string) => Promise<void>
  /** Abort the running turn. Work already written server-side stands. */
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
        currentThreadId: null,
        prefillRequest: null,

        openThread: (subject, title, campaignTitle) => {
          const id = threadIdFor(subject)
          set((s) => {
            const existing = s.threads[id]
            const thread: AssistantThread = existing
              ? { ...existing, title, campaignTitle, unread: false }
              : {
                  id,
                  subject,
                  title,
                  campaignTitle,
                  turns: [],
                  status: 'idle',
                  runStartedAt: null,
                  unread: false,
                  loaded: false,
                  streamedPosts: [],
                }
            return {
              threads: { ...s.threads, [id]: thread },
              activeThreadId: id,
              currentThreadId: id,
            }
          })
          return id
        },

        renameThread: (threadId, title, campaignTitle) => {
          const current = get().threads[threadId]
          if (!current) return
          const sameTitle = current.title === title
          const sameCampaign = campaignTitle === undefined || current.campaignTitle === campaignTitle
          if (sameTitle && sameCampaign) return
          patchThread(threadId, {
            title,
            ...(campaignTitle === undefined ? {} : { campaignTitle }),
          })
        },

        selectThread: (threadId) => {
          set({ activeThreadId: threadId })
          if (threadId) patchThread(threadId, { unread: false })
        },

        askFor: (threadId, text) => {
          set((s) => ({
            activeThreadId: threadId,
            prefillRequest: {
              threadId,
              text,
              token: (s.prefillRequest?.token ?? 0) + 1,
            },
          }))
          patchThread(threadId, { unread: false })
        },

        clearPrefillRequest: () => set({ prefillRequest: null }),

        markRead: (threadId) => patchThread(threadId, { unread: false }),

        closeThread: (threadId) => {
          get().cancel(threadId)
          set((s) => {
            const threads = { ...s.threads }
            delete threads[threadId]
            return {
              threads,
              activeThreadId: s.activeThreadId === threadId ? null : s.activeThreadId,
              currentThreadId: s.currentThreadId === threadId ? null : s.currentThreadId,
            }
          })
        },

        loadHistory: async (threadId) => {
          const thread = get().threads[threadId]
          if (!thread || thread.loaded) return
          // Mark loaded up front so a re-render can't fire a second fetch.
          patchThread(threadId, { loaded: true })
          try {
            const { subject } = thread
            const rows =
              subject.kind === 'post'
                ? await listPostMessages(subject.postId)
                : await listCampaignMessages(subject.campaignId)

            const turns: AssistantTurn[] = rows.map((row) => {
              if (row.role === 'user') {
                return { id: row.id, role: 'user', content: row.content }
              }
              if (subject.kind === 'post') {
                const result = parseModelContent(row.content)
                return {
                  id: row.id,
                  role: 'assistant',
                  content: result.explanation,
                  action: result.action,
                  saveVersion: result.saveVersion,
                  versionNote: result.versionNote,
                }
              }
              const result = parseCampaignModelContent(row.content)
              return {
                id: row.id,
                role: 'assistant',
                content: result.explanation,
                action: result.action,
                details: result.details,
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
          const { subject } = thread

          // The assistant writes the post or campaign server-side, so any
          // queued autosave must land first or it would overwrite the edit a
          // moment later.
          await flushPendingSave(saveKeyFor(subject))

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
                  streamedPosts: [],
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

              case 'post_generated':
                // Already persisted server-side — merged into the campaign's
                // post list so drafts appear on the calendar as they land.
                set((s) => {
                  const current = s.threads[threadId]
                  if (!current) return s
                  return {
                    threads: {
                      ...s.threads,
                      [threadId]: {
                        ...current,
                        streamedPosts: upsertPost(current.streamedPosts, event.post),
                      },
                    },
                  }
                })
                patchLastTurn(threadId, (t) => {
                  const steps = (t.steps ?? []).slice()
                  const idx = lastOpenToolIndex(steps)
                  if (idx < 0) return t
                  const count = countOf(steps[idx].detail) + 1
                  steps[idx] = { ...steps[idx], detail: `${count} generated` }
                  return { ...t, steps }
                })
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

              case 'clone_complete':
                // The clone shares the source's campaign; pair the event's new
                // post id with the subject's campaign id so the reply can jump
                // straight to the clone's editor.
                patchLastTurn(threadId, (t) => ({
                  ...t,
                  clone: { postId: event.newPostId, campaignId: subject.campaignId },
                }))
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

              case 'campaign_complete':
                patchLastTurn(threadId, (t) => ({
                  ...t,
                  content: event.result.explanation || t.content || 'Done.',
                  action: event.result.action,
                  details: event.result.details,
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
            if (subject.kind === 'post') {
              await streamPostAssistant(subject.postId, text, onEvent, controller.signal)
            } else {
              await streamCampaignAssistant(subject.campaignId, text, onEvent, controller.signal)
            }

            // The server writes the result itself — the payload describes what
            // it already saved. Never write it back; just refresh.
            await refreshSubject(subject, get().threads[threadId], streamedContent)
            finish('idle')
          } catch (err) {
            const aborted = err instanceof DOMException && err.name === 'AbortError'
            patchLastTurn(threadId, (t) => ({
              ...t,
              content: aborted ? cancelledText(subject) : errorText(err),
              failed: !aborted,
              cancelled: aborted,
              steps: closeSteps(t.steps ?? [], performance.now()),
              endedAt: performance.now(),
              streaming: false,
            }))
            // A stopped or failed campaign turn may still have written posts
            // or a brief before it ended — the flow persists as it goes — and
            // the finally below clears streamedPosts, so without a refresh
            // here those already-saved posts vanish from the calendar until
            // an unrelated refetch.
            await refreshSubject(subject, get().threads[threadId], streamedContent)
            finish(aborted ? 'idle' : 'error')
          } finally {
            runners.delete(threadId)
            patchThread(threadId, { streamedPosts: [] })
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

/**
 * Pulls the subject's server state back into the cache after a turn. Resolves
 * once the refetch has settled, so the streamed placeholders can be dropped
 * without the posts blinking out of the calendar first.
 */
async function refreshSubject(
  subject: ThreadSubject,
  thread: AssistantThread | undefined,
  streamedContent: string,
): Promise<void> {
  if (subject.kind === 'post') {
    const turns = thread?.turns ?? []
    const applied = turns[turns.length - 1]
    if (applied?.action === 'edited' || streamedContent) {
      await queryClient.invalidateQueries({ queryKey: postKey(subject.postId) })
    }
    return
  }
  // Campaign turns can touch the brief, the dates, or the post list, and the
  // post list key nests under the campaign's — one invalidation covers all.
  await queryClient.invalidateQueries({ queryKey: campaignKey(subject.campaignId) })
}

/** True while any thread has a turn in flight — drives the sidebar trigger. */
export function selectAnyRunning(state: AssistantState): boolean {
  return Object.values(state.threads).some((t) => t.status === 'running')
}

/** True when a thread finished while the user was looking somewhere else. */
export function selectAnyUnread(state: AssistantState): boolean {
  return Object.values(state.threads).some((t) => t.unread)
}

/** True while the campaign's own thread is working — freezes its editors. */
export function selectCampaignRunning(campaignId: string) {
  return (state: AssistantState): boolean =>
    state.threads[`campaign:${campaignId}`]?.status === 'running'
}

const NO_POSTS: StreamedPost[] = []

/** Drafts the campaign's running turn has persisted but not yet refetched. */
export function selectStreamedPosts(campaignId: string) {
  return (state: AssistantState): StreamedPost[] =>
    state.threads[`campaign:${campaignId}`]?.streamedPosts ?? NO_POSTS
}

function upsertPost(posts: StreamedPost[], post: StreamedPost): StreamedPost[] {
  const i = posts.findIndex((p) => p.id === post.id)
  if (i < 0) return [...posts, post]
  const next = posts.slice()
  next[i] = post
  return next
}

/** Reads the running count back out of a `"3 generated"` detail line. */
function countOf(detail: string | undefined): number {
  const match = detail?.match(/^(\d+) generated$/)
  return match ? Number(match[1]) : 0
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

/**
 * A post turn writes once, at the end, so stopping it really does undo
 * nothing. Campaign flows persist as they go — say so rather than implying a
 * rollback that never happens.
 */
function cancelledText(subject: ThreadSubject): string {
  return subject.kind === 'post'
    ? 'Cancelled.'
    : 'Stopped. Anything already written to the campaign was kept.'
}

function errorText(err: unknown): string {
  return err instanceof Error ? err.message : 'The assistant failed'
}
