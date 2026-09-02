import { describe, expect, it } from 'vitest'
import {
  dismissTask,
  openTasks,
  parseTasks,
  reconcileTasks,
  ruleTaskId,
  serializeTasks,
  sortTasks,
  type Task,
} from './tasks.ts'
import type { WorkspaceWarning } from './workspaceWarnings.ts'
import type { AttentionSeverity } from './campaignReadiness.ts'

const NOW = new Date(2026, 7, 19, 12, 0)

function warning(
  ruleId: string,
  severity: AttentionSeverity = 'alert',
  campaignId = 'c1',
): WorkspaceWarning {
  return {
    id: `${campaignId}:${ruleId}`,
    campaignId,
    campaignName: 'First campaign',
    severity,
    item: {
      id: ruleId,
      severity,
      label: `${ruleId} needs doing`,
      actionLabel: 'Review posts',
      fix: 'posts',
    },
  }
}

function task(overrides: Partial<Task> = {}): Task {
  return {
    id: 'manual:1',
    title: 'Write the launch teaser',
    description: '',
    source: { kind: 'manual' },
    campaignId: null,
    fix: null,
    assigneeId: null,
    status: 'open',
    createdAt: new Date(2026, 7, 18, 9, 0).toISOString(),
    createdBy: 'u1',
    closedAt: null,
    closedBy: null,
    closedReason: null,
    ...overrides,
  }
}

describe('reconcileTasks', () => {
  it('raises a task for a warning nothing has been raised for', () => {
    const next = reconcileTasks([], [warning('failed-posts')], NOW)
    expect(next).toHaveLength(1)
    expect(next![0]).toMatchObject({
      id: ruleTaskId('c1', 'failed-posts'),
      title: 'failed-posts needs doing',
      status: 'open',
      // The system raised it, so nobody authored it.
      createdBy: null,
      campaignId: 'c1',
      fix: 'posts',
    })
  })

  it('leaves hygiene warnings alone — only alert and risk become work', () => {
    expect(
      reconcileTasks([], [warning('stale-drafts', 'todo')], NOW),
    ).toBeNull()
    expect(reconcileTasks([], [warning('no-language', 'info')], NOW)).toBeNull()
    expect(
      reconcileTasks([], [warning('slot-collision', 'risk')], NOW),
    ).toHaveLength(1)
  })

  it('is idempotent: a second pass over its own work changes nothing', () => {
    const first = reconcileTasks([], [warning('failed-posts')], NOW)!
    expect(reconcileTasks(first, [warning('failed-posts')], NOW)).toBeNull()
  })

  it('resolves a task whose warning has gone, and says the system did it', () => {
    const raised = reconcileTasks([], [warning('failed-posts')], NOW)!
    const next = reconcileTasks(raised, [], NOW)
    expect(next![0]).toMatchObject({
      status: 'done',
      closedReason: 'auto',
      closedBy: null,
      closedAt: NOW.toISOString(),
    })
  })

  it('reopens its own resolved task when the problem comes back', () => {
    const raised = reconcileTasks([], [warning('failed-posts')], NOW)!
    const resolved = reconcileTasks(raised, [], NOW)!
    const next = reconcileTasks(resolved, [warning('failed-posts')], NOW)
    expect(next![0]).toMatchObject({
      status: 'open',
      closedAt: null,
      closedReason: null,
    })
    // One row per rule, not one per recurrence.
    expect(next).toHaveLength(1)
  })

  it('does not reopen a task a person ticked while the warning still holds', () => {
    const raised = reconcileTasks([], [warning('failed-posts')], NOW)!
    const ticked = raised.map((t) => ({
      ...t,
      status: 'done' as const,
      closedAt: NOW.toISOString(),
      closedBy: 'u1',
      closedReason: 'completed' as const,
    }))
    // "We know, it's fine" is a judgement the system may not overrule.
    expect(reconcileTasks(ticked, [warning('failed-posts')], NOW)).toBeNull()
  })

  it('never raises a task the user deleted, even while its warning holds', () => {
    const raised = reconcileTasks([], [warning('failed-posts')], NOW)!
    const deleted = raised.map((t) => dismissTask(t, 'u1', NOW))
    // Deleting is final: no re-raise, no reopen, however long the problem lasts.
    expect(reconcileTasks(deleted, [warning('failed-posts')], NOW)).toBeNull()
    // And it stays deleted once the warning clears and comes back.
    expect(reconcileTasks(deleted, [], NOW)).toBeNull()
  })

  it('never touches a manual task, whatever the warnings say', () => {
    const mine = task({ status: 'open' })
    expect(reconcileTasks([mine], [], NOW)).toBeNull()
  })

  it('keeps one task per rule per campaign', () => {
    const next = reconcileTasks(
      [],
      [
        warning('failed-posts', 'alert', 'c1'),
        warning('failed-posts', 'alert', 'c2'),
      ],
      NOW,
    )
    expect(next).toHaveLength(2)
    expect(new Set(next!.map((t) => t.id)).size).toBe(2)
  })
})

describe('parseTasks', () => {
  it('reads back what it wrote', () => {
    const tasks = [task()]
    expect(parseTasks(serializeTasks(tasks))).toEqual(tasks)
  })

  it('answers "no tasks" for an unwritten key, junk, or the wrong shape', () => {
    expect(parseTasks(null)).toEqual([])
    expect(parseTasks('not json')).toEqual([])
    expect(parseTasks('{"tasks":[]}')).toEqual([])
  })

  it('drops a malformed row rather than losing the list with it', () => {
    const raw = JSON.stringify([task(), { id: 'x' }, null])
    expect(parseTasks(raw)).toHaveLength(1)
  })
})

describe('sortTasks', () => {
  it('puts open work above finished work, newest first inside each', () => {
    const older = task({
      id: 'a',
      createdAt: new Date(2026, 7, 10).toISOString(),
    })
    const newer = task({
      id: 'b',
      createdAt: new Date(2026, 7, 18).toISOString(),
    })
    const done = task({
      id: 'c',
      status: 'done',
      closedAt: new Date(2026, 7, 19).toISOString(),
      closedReason: 'completed',
    })
    expect(sortTasks([done, older, newer]).map((t) => t.id)).toEqual([
      'b',
      'a',
      'c',
    ])
  })
})

describe('openTasks', () => {
  it('counts only what is still to do', () => {
    expect(openTasks([task(), task({ id: 'b', status: 'done' })])).toHaveLength(
      1,
    )
  })
})
