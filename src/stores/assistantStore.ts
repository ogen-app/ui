import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import { queryClient } from '@/lib/queryClient'
import { threadName } from '@/lib/assistantTools'
import { refreshTouched, subjectTouches } from '@/lib/assistantTouched'
import { flushPendingSave } from '@/lib/pendingSaves'
import { beginLocalRun } from '@/lib/localRuns'
import { buildViewContext, type ViewContext } from '@/lib/viewContext'
import { useViewContextStore } from '@/stores/viewContextStore'
import {
  confirmProposal as confirmProposalRequest,
  dismissProposal as dismissProposalRequest,
  listThreadMessages,
  parseHistoryResult,
  streamAssistantTurn,
  undoAssistantAction,
  type AssistantStreamEvent,
  type AssistantTurnResult,
} from '@/services/api/assistant'
import { ApiError } from '@/services/api/errors'
import type { AppliedUIAction, UIAction } from '@/lib/assistantUiActions'
import { selectActivePanel, useSettingsStore } from '@/stores/settingsStore'
import { toast } from '@/stores/toastStore'
import { i18next } from '@/i18n'
import type {
  AssistantProposal,
  AssistantStep,
  AssistantThread,
  AssistantTurn,
  StreamedPost,
  ThreadSubject,
  Touched,
  UndoState,
} from '@/types/assistant'

/**
 * Assistant threads, one per scope — the workspace, a campaign or a post
 * (CON-450). A thread is *started* from its subject's page, but from then on
 * it is reachable from anywhere: the panel lists every open thread, and a turn
 * keeps running while the user navigates away.
 *
 * That is why a run lives here rather than in a component — the `fetch` and
 * its AbortController are held at module scope, so unmounting the panel or
 * leaving the page can't cancel work in flight. Same reasoning as
 * `uploadStore`.
 */

/**
 * What applies a turn's screen changes. Registered by the authenticated
 * layout (`useAssistantUiActions`), which holds the router; null outside it,
 * where a turn's `ui_action`s are kept but not run.
 */
export type UiActionApplier = {
  /** Runs one action; returns the address it replaced, or undefined. */
  apply: (action: UIAction) => Promise<string | undefined>
  /** Puts the screen back to `href`, undoing `action`. */
  restore: (href: string, action: UIAction) => Promise<void>
}

let uiApplier: UiActionApplier | null = null

export function setUiActionApplier(applier: UiActionApplier | null) {
  uiApplier = applier
}

/** In-flight runs, keyed by thread id. Never rendered — kept out of state. */
const runners = new Map<string, AbortController>()

export function threadIdFor(subject: ThreadSubject): string {
  switch (subject.kind) {
    case 'workspace':
      return 'workspace'
    case 'campaign':
      return `campaign:${subject.campaignId}`
    case 'post':
      return `post:${subject.postId}`
  }
}

/**
 * The id whose pending edits a turn must flush before it starts — and whose
 * broadcast echo it mutes. The workspace has no autosave of its own.
 */
function saveKeyFor(subject: ThreadSubject): string | null {
  switch (subject.kind) {
    case 'workspace':
      return null
    case 'campaign':
      return subject.campaignId
    case 'post':
      return subject.postId
  }
}

let turnCounter = 0
const nextTurnId = (role: AssistantTurn['role']) => `${role}-${++turnCounter}`

/** How a streamed turn ended. */
type TurnOutcome = 'answered' | 'failed' | 'cancelled'

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
  openThread: (
    subject: ThreadSubject,
    title: string,
    campaignTitle: string,
  ) => string
  /** Keep a thread's labels in sync with its subject, without selecting it. */
  renameThread: (
    threadId: string,
    title: string,
    campaignTitle?: string,
  ) => void
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
  /**
   * Runs an offer exactly as proposed, from its card (CON-446). `optionId`
   * picks one of an offer's options.
   */
  confirmProposal: (
    threadId: string,
    proposalId: string,
    optionId?: string,
  ) => Promise<void>
  /** Withdraws an offer from its card. Nothing runs. */
  dismissProposal: (threadId: string, proposalId: string) => Promise<void>
  /** Reverses a change a turn made, by the undo id its result carried. */
  undo: (threadId: string, turnId: string, undoId: string) => Promise<void>
  /** Puts the screen back to before one of a turn's `ui_action`s. */
  undoUiAction: (
    threadId: string,
    turnId: string,
    index: number,
  ) => Promise<void>
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
          s.threads[id]
            ? {
                threads: {
                  ...s.threads,
                  [id]: { ...s.threads[id], ...changes },
                },
              }
            : s,
        )

      /**
       * Runs a turn's screen changes in order, and keeps each on the turn with
       * the address it replaced. One that fails is kept without one, so it
       * offers no way back to a screen it never left.
       */
      const applyUiActions = async (
        threadId: string,
        turnId: string,
        actions: UIAction[],
      ) => {
        const applied: AppliedUIAction[] = []
        for (const action of actions) {
          let before: string | undefined
          try {
            before = (await uiApplier?.apply(action)) ?? undefined
          } catch {
            before = undefined
          }
          applied.push({ action, before })
        }
        patchTurn(threadId, turnId, (t) => ({ ...t, uiActions: applied }))
      }

      /** Replace one turn of a thread, by id. */
      const patchTurn = (
        id: string,
        turnId: string,
        update: (turn: AssistantTurn) => AssistantTurn,
      ) =>
        set((s) => {
          const thread = s.threads[id]
          if (!thread) return s
          const turns = thread.turns.map((t) =>
            t.id === turnId ? update(t) : t,
          )
          return { threads: { ...s.threads, [id]: { ...thread, turns } } }
        })

      /** Change one offer, wherever in the thread it was made. */
      const setProposal = (
        id: string,
        proposalId: string,
        changes: Partial<AssistantProposal>,
      ) =>
        set((s) => {
          const thread = s.threads[id]
          if (!thread) return s
          const turns = thread.turns.map((t) =>
            t.proposals?.some((p) => p.id === proposalId)
              ? {
                  ...t,
                  proposals: t.proposals.map((p) =>
                    p.id === proposalId ? { ...p, ...changes } : p,
                  ),
                }
              : t,
          )
          return { threads: { ...s.threads, [id]: { ...thread, turns } } }
        })

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

      /**
       * Runs one streamed turn into a thread: a typed instruction, or an offer
       * confirmed from its card (which has no user turn of its own — the
       * server records the answer). Owns the run's lifecycle: the reply turn,
       * the abort controller, the refresh, and the unread/toast bookkeeping.
       */
      const runTurn = async (
        threadId: string,
        userTurn: AssistantTurn | null,
        start: (
          onEvent: (event: AssistantStreamEvent) => void,
          signal: AbortSignal,
        ) => Promise<void>,
        onStreamError?: (status: number | undefined, message: string) => void,
      ): Promise<TurnOutcome | null> => {
        const thread = get().threads[threadId]
        if (!thread) return null
        const { subject } = thread
        const saveKey = saveKeyFor(subject)
        const startedAt = performance.now()
        const assistantTurnId = nextTurnId('assistant')
        const planStep: AssistantStep = {
          id: 'plan',
          kind: 'plan',
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
                  // A new turn moves past any offer still standing: it may
                  // still be live, but it is no longer the thing to answer.
                  ...supersede(current.turns),
                  ...(userTurn ? [userTurn] : []),
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
        // The hub reports this turn's outcome too. This tab is streaming it
        // already and refreshes the subject itself below, so the broadcast
        // copy is muted for as long as the run is ours (CON-134).
        const endLocalRun = saveKey
          ? beginLocalRun('assistant', saveKey)
          : () => {}

        // A turn that lands while the user is elsewhere is "unread" — the
        // sidebar trigger carries the dot until they come back to it — and it
        // says so once, as it happens. The dot is a state and survives a
        // navigation; the toast is the event, and is the only thing that
        // reports *which* thread finished while the user was in another one.
        //
        // Nothing is raised for a cancelled turn: stopping is done from the
        // composer, so the person it would inform is the person who did it.
        const finish = (
          status: AssistantThread['status'],
          outcome: TurnOutcome,
        ) => {
          // The *resolved* panel, not the remembered one: the assistant can
          // be remembered as open while a post panel covers it, and nobody
          // reading a quality report is watching a turn finish.
          const watching =
            selectActivePanel(useSettingsStore.getState()) === 'assistant' &&
            get().activeThreadId === threadId
          patchThread(threadId, {
            status,
            runStartedAt: null,
            unread: !watching,
          })

          if (watching || outcome === 'cancelled') return
          const thread = get().threads[threadId]
          if (!thread) return
          const description = threadName(thread)
          if (outcome === 'answered') {
            toast.info(i18next.t('assistant.finished'), { description })
          } else {
            toast.error(i18next.t('assistant.failed'), { description })
          }
        }

        // An application-level `error` event ends the turn but not the
        // stream — it closes normally afterwards, which would otherwise
        // report the turn as answered.
        let sawErrorEvent = false

        // What the turn says it changed. Null until `complete` arrives: a
        // turn that never got there refreshes its whole subject instead.
        let touched: Touched[] | null = null
        // Changes to the screen, in order, applied once the turn completes.
        let uiActions: UIAction[] = []

        const onEvent = (event: AssistantStreamEvent) => {
          const now = performance.now()
          switch (event.type) {
            case 'explanation_delta':
              patchLastTurn(threadId, (t) => ({
                ...t,
                content: t.content + event.delta,
              }))
              break

            case 'content_delta':
              patchLastTurn(threadId, (t) => ({
                ...t,
                steps: withWritingStep(t.steps ?? [], now),
              }))
              break

            case 'pack_loaded':
              // The turn restarted with another pack's tools; whatever it
              // had said so far is void.
              patchLastTurn(threadId, (t) => ({ ...t, content: '' }))
              break

            case 'post_generated':
              // Already persisted server-side — merged into the campaign's
              // post list so drafts appear on the calendar as they land.
              if (subject.kind !== 'campaign') break
              set((s) => {
                const current = s.threads[threadId]
                if (!current) return s
                return {
                  threads: {
                    ...s.threads,
                    [threadId]: {
                      ...current,
                      streamedPosts: upsertPost(
                        current.streamedPosts,
                        event.post,
                      ),
                    },
                  },
                }
              })
              patchLastTurn(threadId, (t) => {
                const steps = (t.steps ?? []).slice()
                const idx = lastOpenToolIndex(steps)
                if (idx < 0) return t
                steps[idx] = {
                  ...steps[idx],
                  generated: (steps[idx].generated ?? 0) + 1,
                }
                return { ...t, steps }
              })
              break

            case 'tool_call':
              patchLastTurn(threadId, (t) => {
                const steps = (t.steps ?? []).map((s) =>
                  s.kind !== 'tool' && s.endedAt === null
                    ? { ...s, endedAt: now }
                    : s,
                )
                steps.push({
                  id: event.ref ?? `${event.name}-${steps.length}`,
                  kind: 'tool',
                  tool: event.name,
                  input: event.input,
                  ref: event.ref,
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
                    ? { ...s, endedAt: now }
                    : s,
                ),
              }))
              break

            case 'progress':
              patchLastTurn(threadId, (t) => {
                const steps = (t.steps ?? []).slice()
                const idx = lastOpenToolIndex(steps)
                if (idx < 0) return t
                steps[idx] = { ...steps[idx], progress: event.step }
                return { ...t, steps }
              })
              break

            case 'clone_complete':
              // The clone shares the source's campaign; pair the event's new
              // post id with the subject's campaign id so the reply can jump
              // straight to the clone's editor.
              if (subject.kind !== 'post') break
              patchLastTurn(threadId, (t) => ({
                ...t,
                clone: {
                  postId: event.newPostId,
                  campaignId: subject.campaignId,
                },
              }))
              break

            case 'complete':
              touched = event.result.touched
              // Each was streamed just before `complete`; a stream that
              // dropped them still has the result's copy.
              if (uiActions.length === 0) uiActions = event.result.uiActions
              patchLastTurn(threadId, (t) => {
                const fields = turnFields(subject, event.result)
                return {
                  ...t,
                  ...fields,
                  // The cards were streamed as they were made; the result
                  // repeats them, and whichever came first keeps its state.
                  proposals: mergeProposals(t.proposals, fields.proposals),
                  content:
                    fields.content ||
                    t.content ||
                    i18next.t('assistant.reply.done'),
                  // The stream's clone event beats the result's, which only
                  // a reloaded turn has to rely on.
                  clone: t.clone ?? fields.clone,
                  steps: closeSteps(t.steps ?? [], now),
                  endedAt: now,
                  streaming: false,
                }
              })
              break

            case 'ui_action':
              uiActions = [...uiActions, event.action]
              break

            case 'proposal_created':
              patchLastTurn(threadId, (t) => ({
                ...t,
                proposals: upsertProposal(t.proposals, event.proposal),
              }))
              break

            case 'proposal_resolved':
              setProposal(threadId, event.id, {
                status: event.status,
                chosen: event.chosen,
              })
              break

            case 'error':
              onStreamError?.(event.status, event.message)
              sawErrorEvent = true
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
          await start(onEvent, controller.signal)
          if (!sawErrorEvent && uiActions.length > 0) {
            await applyUiActions(threadId, assistantTurnId, uiActions)
          }

          // The server writes the result itself — the payload describes what
          // it already saved. Never write it back; just refresh.
          await refreshTouched(queryClient, touched ?? subjectTouches(subject))
          const outcome = sawErrorEvent ? 'failed' : 'answered'
          finish('idle', outcome)
          return outcome
        } catch (err) {
          const aborted =
            err instanceof DOMException && err.name === 'AbortError'
          patchLastTurn(threadId, (t) => ({
            ...t,
            content: aborted ? cancelledText(subject) : errorText(err),
            failed: !aborted,
            cancelled: aborted,
            steps: closeSteps(t.steps ?? [], performance.now()),
            endedAt: performance.now(),
            streaming: false,
          }))
          // A stopped or failed turn may still have written posts, ideas or
          // a brief before it ended — the tools persist as they go — and
          // the finally below clears streamedPosts, so without a refresh
          // here those already-saved posts vanish from the calendar until
          // an unrelated refetch.
          await refreshTouched(queryClient, subjectTouches(subject))
          finish(aborted ? 'idle' : 'error', aborted ? 'cancelled' : 'failed')
          return aborted ? 'cancelled' : 'failed'
        } finally {
          runners.delete(threadId)
          endLocalRun()
          patchThread(threadId, { streamedPosts: [] })
        }
      }

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
          const sameCampaign =
            campaignTitle === undefined ||
            current.campaignTitle === campaignTitle
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
              activeThreadId:
                s.activeThreadId === threadId ? null : s.activeThreadId,
              currentThreadId:
                s.currentThreadId === threadId ? null : s.currentThreadId,
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
            const rows = await listThreadMessages(subject)

            const turns: AssistantTurn[] = rows.map((row) => {
              if (row.role === 'user') {
                return {
                  id: row.id,
                  role: 'user',
                  content: row.content,
                  view: storedView(row.view_context),
                  answer: answerOf(row.content),
                }
              }
              return {
                id: row.id,
                role: 'assistant',
                ...turnFields(
                  subject,
                  parseHistoryResult(row.content, subject.kind),
                ),
              }
            })
            settleHistory(turns, Date.now())
            // A turn may have started while history was loading; keep it last.
            set((s) => {
              const current = s.threads[threadId]
              if (!current) return s
              const live = current.turns
              return {
                threads: {
                  ...s.threads,
                  [threadId]: { ...current, turns: [...turns, ...live] },
                },
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

          // What the user is looking at when they sent it — read before the
          // flush below, which can wait on a write while they move on. A
          // dismissed chip sends the screen alone, once.
          const view = useViewContextStore.getState()
          const viewContext = buildViewContext(
            subject,
            view.location,
            view.page,
            view.dismissed,
          )
          if (view.dismissed) view.restore()

          // The assistant writes the post or campaign server-side, so any
          // queued autosave must land first or it would overwrite the edit a
          // moment later.
          const saveKey = saveKeyFor(subject)
          if (saveKey) await flushPendingSave(saveKey)

          await runTurn(
            threadId,
            {
              id: nextTurnId('user'),
              role: 'user',
              content: text,
              view: viewContext,
            },
            (onEvent, signal) =>
              streamAssistantTurn(
                { instruction: text, viewContext },
                onEvent,
                signal,
              ),
          )
        },

        confirmProposal: async (threadId, proposalId, optionId) => {
          const thread = get().threads[threadId]
          if (!thread || thread.status === 'running') return
          const found = findProposal(thread, proposalId)
          if (!found || found.status !== 'pending') return
          setProposal(threadId, proposalId, { status: 'confirming' })
          const saveKey = saveKeyFor(thread.subject)
          if (saveKey) await flushPendingSave(saveKey)
          const outcome = await runTurn(
            threadId,
            null,
            (onEvent, signal) =>
              confirmProposalRequest(proposalId, optionId, onEvent, signal),
            (status, message) =>
              // Gone, already answered or expired: the card stops offering.
              setProposal(threadId, proposalId, {
                status: 'closed',
                error:
                  status === 404
                    ? i18next.t('assistant.proposal.gone')
                    : message,
              }),
          )
          // Only a turn that answered ran the offer. One that failed before or
          // during the stream, or was stopped, did not finish it — the card
          // says so rather than claim it was confirmed, and the reply below it
          // carries the reason. (An `error` event has closed it already.)
          const after = findProposal(get().threads[threadId], proposalId)
          if (after?.status !== 'confirming') return
          setProposal(
            threadId,
            proposalId,
            outcome === 'answered'
              ? { status: 'confirmed' }
              : {
                  status: 'closed',
                  error: i18next.t(
                    outcome === 'cancelled'
                      ? 'assistant.proposal.stopped'
                      : 'assistant.proposal.failed',
                  ),
                },
          )
        },

        dismissProposal: async (threadId, proposalId) => {
          const thread = get().threads[threadId]
          const found = thread && findProposal(thread, proposalId)
          if (!found || found.status !== 'pending') return
          setProposal(threadId, proposalId, { status: 'dismissed' })
          try {
            await dismissProposalRequest(proposalId)
          } catch (err) {
            setProposal(threadId, proposalId, {
              status: 'closed',
              error:
                err instanceof ApiError && err.status === 404
                  ? i18next.t('assistant.proposal.gone')
                  : errorText(err),
            })
          }
        },

        undoUiAction: async (threadId, turnId, index) => {
          const turn = get().threads[threadId]?.turns.find(
            (t) => t.id === turnId,
          )
          const applied = turn?.uiActions?.[index]
          if (!applied?.before || applied.undone || !uiApplier) return
          await uiApplier.restore(applied.before, applied.action)
          patchTurn(threadId, turnId, (t) => ({
            ...t,
            uiActions: t.uiActions?.map((a, i) =>
              i === index ? { ...a, undone: true } : a,
            ),
          }))
        },

        undo: async (threadId, turnId, undoId) => {
          const state = (value: UndoState) =>
            patchTurn(threadId, turnId, (t) => ({
              ...t,
              undo: { ...t.undo, [undoId]: value },
            }))
          const thread = get().threads[threadId]
          const turn = thread?.turns.find((t) => t.id === turnId)
          if (!turn || turn.undo?.[undoId]) return
          state('pending')
          try {
            const { kind } = await undoAssistantAction(undoId)
            state('undone')
            await refreshTouched(queryClient, undoTouches(kind, thread))
          } catch (err) {
            const status = err instanceof ApiError ? err.status : 0
            // 404 is the server saying there is nothing left to undo and 409
            // that it was changed again since; both are final. Anything else —
            // a 500, a dropped connection — says nothing about the change, so
            // UNDO comes back to be tried again.
            if (status === 404) return state('gone')
            if (status === 409) return state('changed')
            patchTurn(threadId, turnId, (t) => {
              const rest = { ...t.undo }
              delete rest[undoId]
              return { ...t, undo: rest }
            })
            toast.error(i18next.t('assistant.undo.failed'), {
              description: errorText(err),
            })
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
 * A stored user turn's view context. The server keeps what the client sent; a
 * row without one, or of a version this build can't read, draws no marker.
 */
function storedView(value: unknown): ViewContext | undefined {
  if (!value || typeof value !== 'object') return undefined
  const view = value as Partial<ViewContext>
  return view.version === 1 && typeof view.screen === 'string'
    ? (view as ViewContext)
    : undefined
}

/** The parts of a turn its result decides, for a live or a reloaded turn. */
function turnFields(
  subject: ThreadSubject,
  result: AssistantTurnResult,
): Pick<
  AssistantTurn,
  | 'content'
  | 'action'
  | 'details'
  | 'saveVersion'
  | 'versionNote'
  | 'clone'
  | 'proposals'
> {
  return {
    proposals: result.proposals.length > 0 ? result.proposals : undefined,
    content: result.explanation,
    action: result.action,
    details: result.details,
    saveVersion: result.saveVersion,
    versionNote: result.versionNote,
    clone:
      result.clonePostId && subject.kind === 'post'
        ? { postId: result.clonePostId, campaignId: subject.campaignId }
        : undefined,
  }
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
  const closed = steps.map((s) =>
    s.endedAt === null ? { ...s, endedAt: now } : s,
  )
  return [
    ...closed,
    {
      id: 'compose',
      kind: 'compose',
      startedAt: now,
      endedAt: null,
    },
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
    ? i18next.t('assistant.reply.cancelledPost')
    : i18next.t('assistant.reply.cancelledCampaign')
}

function errorText(err: unknown): string {
  return err instanceof Error
    ? err.message
    : i18next.t('assistant.reply.failed')
}

function findProposal(
  thread: AssistantThread | undefined,
  proposalId: string,
): AssistantProposal | undefined {
  for (const turn of thread?.turns ?? []) {
    const found = turn.proposals?.find((p) => p.id === proposalId)
    if (found) return found
  }
  return undefined
}

function upsertProposal(
  list: AssistantProposal[] | undefined,
  proposal: AssistantProposal,
): AssistantProposal[] {
  const current = list ?? []
  return current.some((p) => p.id === proposal.id)
    ? current
    : [...current, proposal]
}

function mergeProposals(
  streamed: AssistantProposal[] | undefined,
  final: AssistantProposal[] | undefined,
): AssistantProposal[] | undefined {
  let out = streamed
  for (const p of final ?? []) out = upsertProposal(out, p)
  return out
}

/** Offers still standing when a new turn starts stop being the thing to answer. */
function supersede(turns: AssistantTurn[]): AssistantTurn[] {
  return turns.map((t) =>
    t.proposals?.some((p) => p.status === 'pending')
      ? {
          ...t,
          proposals: t.proposals.map((p) =>
            p.status === 'pending' ? { ...p, status: 'superseded' } : p,
          ),
        }
      : t,
  )
}

/** What an undo changed back, by the kind the server reports. */
function undoTouches(
  kind: string,
  thread: AssistantThread | undefined,
): Touched[] {
  if (kind === 'idea_verdict') return [{ kind: 'idea' }]
  if (kind === 'brand_fact') return [{ kind: 'fact' }]
  if (kind === 'campaign_assets')
    return [{ kind: 'asset' }, { kind: 'campaign' }]
  const campaignId =
    thread && thread.subject.kind !== 'workspace'
      ? thread.subject.campaignId
      : undefined
  return [{ kind: 'campaign', id: campaignId }]
}

/**
 * The server records an offer answered from its card as a user turn of its
 * own, in fixed words (`Confirmed: <summary>`, `Dismissed: <summary>`).
 */
const ANSWER_PREFIX = { confirmed: 'Confirmed: ', dismissed: 'Dismissed: ' }

function answerOf(content: string): AssistantTurn['answer'] {
  if (content.startsWith(ANSWER_PREFIX.confirmed)) return 'confirmed'
  if (content.startsWith(ANSWER_PREFIX.dismissed)) return 'dismissed'
  return undefined
}

/**
 * Gives a reloaded thread's offers the state the server doesn't store on the
 * card: answered from its card (a later answer turn names it), expired, or
 * moved past by a later turn. Only the last turn's open offer stays pending.
 */
export function settleHistory(turns: AssistantTurn[], now: number): void {
  const answered = new Map<string, 'confirmed' | 'dismissed'>()
  for (const turn of turns) {
    if (turn.role === 'user' && turn.answer) {
      answered.set(
        turn.content.slice(ANSWER_PREFIX[turn.answer].length),
        turn.answer,
      )
    }
  }
  const lastAssistant = [...turns].reverse().find((t) => t.role === 'assistant')
  for (const turn of turns) {
    if (!turn.proposals) continue
    turn.proposals = turn.proposals.map((p) => {
      const answer = answered.get(p.summary)
      if (answer) return { ...p, status: answer }
      if (p.expiresAt && Date.parse(p.expiresAt) <= now)
        return { ...p, status: 'expired' }
      return turn === lastAssistant ? p : { ...p, status: 'superseded' }
    })
  }
}
