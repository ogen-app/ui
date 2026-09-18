import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { getSetting, putSetting } from '@/services/api/settings'
import { useAuthStore } from '@/stores/authStore'
import { toast } from '@/stores/toastStore'
import { useFeatureFlag } from '@/config/featureFlags'
import { useWorkspaceWarnings } from '@/hooks/useWorkspaceWarnings'
import {
  dismissTask,
  manualTaskId,
  parseTasks,
  reconcileTasks,
  serializeTasks,
  sortTasks,
  type Task,
} from '@/lib/tasks'

/**
 * Tasks' data layer (CON-225, prototype).
 *
 * **The store is a stand-in.** There is no tasks table, so the whole list
 * lives in one tenant key/value row — the same trade `campaign-accounts` makes
 * while waiting for its column. Two consequences the real endpoint fixes and
 * this cannot:
 *
 * - **Every write is the whole list.** Two people editing different tasks in
 *   the same second means the later write wins for both; there are no
 *   row-level operations to have instead.
 * - **The row is workspace-wide and readable by every member**, which is right
 *   for shared work and is why nothing personal may go in a task. The rows are
 *   tasks, not notes.
 *
 * Everything about *what a task is* stays in `lib/tasks.ts`, pure and
 * testable; this file only moves it to and from the store.
 */

/** One row for the workspace — tasks are shared, not personal. */
const STORAGE_KEY = 'tasks'
export const TASKS_QUERY_KEY = ['settings', STORAGE_KEY] as const

/**
 * Every save of the row goes through one chain, because the store is
 * overwrite-only: two PUTs in flight commit in whichever order the server
 * lands them, so an older list could replace a newer one. `useTaskWriter` and
 * `useTaskReconciliation` both write here; each save's snapshot was built from
 * a cache the previous save had already patched, so last-in-order is also
 * newest.
 */
let writeQueue: Promise<unknown> = Promise.resolve()

function enqueueWrite(next: Task[]): Promise<void> {
  // `then(run, run)`: a failed save must not break the chain for the next one,
  // but its own rejection still has to reach the caller.
  const run = () => putSetting(STORAGE_KEY, serializeTasks(next))
  const chained = writeQueue.then(run, run)
  writeQueue = chained.catch(() => {})
  return chained
}

export function useTasks() {
  const enabled = useFeatureFlag('tasks')

  const { data, isLoading, isError } = useQuery({
    queryKey: TASKS_QUERY_KEY,
    queryFn: async () => parseTasks(await getSetting(STORAGE_KEY)),
    enabled,
    staleTime: 30_000,
  })

  const tasks = useMemo(() => sortTasks(data ?? []), [data])
  return { tasks, isLoading: enabled && isLoading, isError: enabled && isError }
}

/**
 * Writing tasks. Every mutation is "read the list, produce the next one, save
 * it" — the store has nothing finer — so they all go through one writer, which
 * is also the only place that knows the write can fail.
 */
export function useTaskWriter() {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const userId = useAuthStore((s) => s.user?.id ?? null)

  const write = useCallback(
    (next: Task[]) => {
      // Optimistic and cancel-first, as the feed's last-read moment is: a read
      // still in flight would otherwise land its older list on top of this one.
      void qc.cancelQueries({ queryKey: TASKS_QUERY_KEY })
      qc.setQueryData(TASKS_QUERY_KEY, next)
      return enqueueWrite(next).catch(() => {
        toast.error(t('tasks.saveFailed'))
        void qc.invalidateQueries({ queryKey: TASKS_QUERY_KEY })
      })
    },
    [qc, t],
  )

  const current = useCallback(
    () => (qc.getQueryData<Task[]>(TASKS_QUERY_KEY) ?? []).slice(),
    [qc],
  )

  const createTask = useCallback(
    ({
      title,
      description,
      campaignId,
      assigneeId,
    }: {
      title: string
      description: string
      campaignId: string | null
      assigneeId: string | null
    }) => {
      const now = new Date()
      const task: Task = {
        // The clock plus the author is enough: one person cannot write two
        // tasks in the same millisecond, and two people have different ids.
        id: manualTaskId(`${now.getTime()}-${userId ?? 'anon'}`),
        title: title.trim(),
        description: description.trim(),
        source: { kind: 'manual' },
        campaignId,
        fix: null,
        assigneeId,
        status: 'open',
        createdAt: now.toISOString(),
        createdBy: userId,
        closedAt: null,
        closedBy: null,
        closedReason: null,
      }
      return write([task, ...current()])
    },
    [current, userId, write],
  )

  const updateTask = useCallback(
    (id: string, change: (task: Task) => Task) =>
      write(current().map((task) => (task.id === id ? change(task) : task))),
    [current, write],
  )

  const completeTask = useCallback(
    (id: string) =>
      updateTask(id, (task) => ({
        ...task,
        status: 'done',
        closedAt: new Date().toISOString(),
        closedBy: userId,
        closedReason: 'completed',
      })),
    [updateTask, userId],
  )

  const reopenTask = useCallback(
    (id: string) =>
      updateTask(id, (task) => ({
        ...task,
        status: 'open',
        closedAt: null,
        closedBy: null,
        closedReason: null,
      })),
    [updateTask],
  )

  const assignTask = useCallback(
    (id: string, assigneeId: string | null) =>
      updateTask(id, (task) => ({ ...task, assigneeId })),
    [updateTask],
  )

  /**
   * Deleting a task — any task, and for good. "I don't care about this one" is
   * a legitimate answer to work the system raised, so a rule task goes the same
   * way a hand-written one does.
   *
   * What differs is what is left behind. A manual task leaves nothing: nobody
   * will write it again. A rule task leaves a tombstone, because its id is
   * derived from the rule and reconciliation would otherwise raise it again on
   * the very next pass — "delete" would be a button that undoes itself. The
   * warning is untouched either way and stays on its campaign.
   */
  const deleteTask = useCallback(
    (id: string) =>
      write(
        current().flatMap((task) => {
          if (task.id !== id) return [task]
          return task.source.kind === 'manual'
            ? []
            : [dismissTask(task, userId)]
        }),
      ),
    [current, userId, write],
  )

  return { createTask, completeTask, reopenTask, assignTask, deleteTask }
}

/**
 * Raises tasks for new warnings and resolves the ones whose warning has gone.
 *
 * On the client because there is no server to do it — which is why **only one
 * of these may be mounted at a time**. Two writers race over one key.
 *
 * Two screens call it: the Tasks board, which shows the result, and the
 * Activity feed, which reports the closures. That is safe because they are
 * separate destinations and can never be on screen together — and it is
 * necessary because either can be the one you open, and a subsystem that only
 * runs on one of them would leave the other reading a stale list. Never call it
 * from anything that renders alongside them (a sidebar row, a panel, a layout).
 *
 * The real subsystem does this where the warning is detected, and this hook
 * disappears with the flag.
 *
 * Idempotent by construction: a warning's task id is derived from its rule and
 * campaign, so a second pass finds its own work and changes nothing.
 */
export function useTaskReconciliation() {
  const enabled = useFeatureFlag('tasks')
  const { tasks, isLoading } = useTasks()
  const { warnings, isLoading: warningsLoading } = useWorkspaceWarnings()
  const qc = useQueryClient()
  const { t } = useTranslation()

  // One write per change, not one per render: the effect re-runs whenever the
  // queries settle, and without this a failed save would be retried in a loop.
  const inFlight = useRef(false)
  // Resetting the ref in `finally` doesn't render, so a change that arrived
  // while a write was in flight would otherwise never get its pass — the
  // persisted list would stay derived from the warnings as they stood. This
  // bump is the re-run.
  const [settled, setSettled] = useState(0)

  useEffect(() => {
    if (!enabled || isLoading || warningsLoading || inFlight.current) return
    const next = reconcileTasks(tasks, warnings, new Date())
    if (!next) return

    inFlight.current = true
    void qc.cancelQueries({ queryKey: TASKS_QUERY_KEY })
    qc.setQueryData(TASKS_QUERY_KEY, next)
    void enqueueWrite(next)
      .catch(() => {
        toast.error(t('tasks.saveFailed'))
        void qc.invalidateQueries({ queryKey: TASKS_QUERY_KEY })
      })
      .finally(() => {
        inFlight.current = false
        setSettled((n) => n + 1)
      })
  }, [enabled, isLoading, warningsLoading, tasks, warnings, settled, qc, t])
}
