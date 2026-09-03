import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, screen, waitFor } from '@testing-library/react'
import { renderWithProviders } from '@/test/renderWithProviders'
import {
  useDeleteWorkspace,
  useSwitchWorkspace,
  useWorkspace,
} from './useWorkspaces'
import {
  getActiveWorkspaceId,
  setActiveWorkspaceId,
} from '@/lib/activeWorkspace'
import {
  deleteWorkspace,
  getWorkspace,
  listWorkspaces,
  switchWorkspace,
} from '@/services/api/workspaces'
import { reconnectEvents } from '@/stores/eventStreamStore'
import type { WorkspaceChoice } from '@/types/workspace'

/**
 * The three multi-workspace behaviours a refactor can quietly break (CON-147):
 *
 * - `useWorkspace` must never pair a tenant with a role read from anywhere but
 *   the account's workspace list — after a switch clears the cache the two
 *   queries land independently, and a stopgap role would draw the *default*
 *   workspace's controls in the one the tab moved to.
 * - Deleting the workspace the tab is pinned to tears the whole cache down,
 *   the same way a switch does; invalidating only the list would leave every
 *   scoped query serving a workspace that no longer exists.
 * - The best-effort "remember as default" writes are coalesced: only the
 *   newest target is sent, one request at a time, so an early response landing
 *   late can never overwrite a newer choice.
 */

vi.mock('@/services/api/workspaces', () => ({
  createWorkspace: vi.fn(),
  deleteWorkspace: vi.fn(),
  getWorkspace: vi.fn(),
  inviteMember: vi.fn(),
  listInvitations: vi.fn(),
  listMembers: vi.fn(),
  listWorkspaces: vi.fn(),
  removeMember: vi.fn(),
  revokeInvitation: vi.fn(),
  switchWorkspace: vi.fn(),
  updateMemberRole: vi.fn(),
  updateWorkspace: vi.fn(),
}))

// A switch flushes debounced editor saves and rebinds the event stream; both
// reach outside the hook (timers, EventSource) and neither is under test.
vi.mock('@/lib/pendingSaves', () => ({
  flushAllPendingSaves: vi.fn(() => Promise.resolve()),
}))
vi.mock('@/stores/eventStreamStore', () => ({
  reconnectEvents: vi.fn(),
}))

const TENANT = {
  id: 'ws-2',
  name: 'Second Workspace',
  slug: 'second-workspace',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
}

function choice(
  id: string,
  role: WorkspaceChoice['role'] = 'member',
): WorkspaceChoice {
  return {
    id,
    name: `Workspace ${id}`,
    slug: `workspace-${id}`,
    role,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    member_count: 1,
    is_default: false,
  }
}

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((res) => {
    resolve = res
  })
  return { promise, resolve }
}

/** A macrotask, so every settled promise chain has run to completion. */
function settle() {
  return act(() => new Promise<void>((res) => setTimeout(res, 0)))
}

function RoleProbe() {
  const workspace = useWorkspace()
  return <p>{workspace ? `role:${workspace.role}` : 'no-workspace'}</p>
}

function SwitchProbe() {
  const { mutate } = useSwitchWorkspace()
  return (
    <div>
      <button onClick={() => mutate('ws-a')}>switch-a</button>
      <button onClick={() => mutate('ws-b')}>switch-b</button>
      <button onClick={() => mutate('ws-c')}>switch-c</button>
    </div>
  )
}

function DeleteProbe() {
  const { mutate } = useDeleteWorkspace()
  return <button onClick={() => mutate('ws-1')}>delete-ws-1</button>
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(switchWorkspace).mockResolvedValue(undefined)
  vi.mocked(deleteWorkspace).mockResolvedValue(undefined)
})

afterEach(() => {
  setActiveWorkspaceId(null)
})

describe('useWorkspace', () => {
  it('answers nothing until the listed role is known, then the listed role', async () => {
    vi.mocked(getWorkspace).mockResolvedValue(TENANT)
    const list = deferred<WorkspaceChoice[]>()
    vi.mocked(listWorkspaces).mockReturnValue(list.promise)

    await renderWithProviders(<RoleProbe />)

    // The tenant has resolved; the list has not. This is the window in which
    // the old stopgap answered with `current_user`'s role — the role in the
    // *default* workspace, not this one.
    await waitFor(() => expect(getWorkspace).toHaveBeenCalled())
    await settle()
    expect(screen.getByText('no-workspace')).toBeInTheDocument()

    act(() => list.resolve([choice('ws-1', 'owner'), choice('ws-2', 'member')]))

    expect(await screen.findByText('role:member')).toBeInTheDocument()
  })

  it('answers nothing for a tenant the account no longer lists', async () => {
    vi.mocked(getWorkspace).mockResolvedValue(TENANT)
    vi.mocked(listWorkspaces).mockResolvedValue([choice('ws-1', 'owner')])

    await renderWithProviders(<RoleProbe />)

    await waitFor(() => expect(listWorkspaces).toHaveBeenCalled())
    await settle()
    // No role can be guessed for a workspace that is gone; callers show their
    // loading state and the 403 recovery (`lib/staleWorkspace`) does the rest.
    expect(screen.getByText('no-workspace')).toBeInTheDocument()
  })
})

describe('useSwitchWorkspace', () => {
  it('sends only the newest default, one request at a time', async () => {
    const first = deferred<void>()
    const second = deferred<void>()
    vi.mocked(switchWorkspace)
      .mockReturnValueOnce(first.promise)
      .mockReturnValueOnce(second.promise)

    await renderWithProviders(<SwitchProbe />)

    fireEvent.click(screen.getByText('switch-a'))
    await waitFor(() => expect(switchWorkspace).toHaveBeenCalledWith('ws-a'))

    // Two more switches while the first write is still in flight. Neither may
    // start a parallel request — a response crossing another is exactly the
    // race that used to let an old default overwrite a newer one.
    fireEvent.click(screen.getByText('switch-b'))
    fireEvent.click(screen.getByText('switch-c'))
    await settle()
    expect(switchWorkspace).toHaveBeenCalledTimes(1)

    act(() => first.resolve())

    // The stale intermediate target is never sent: only the newest survives.
    await waitFor(() => expect(switchWorkspace).toHaveBeenCalledTimes(2))
    expect(switchWorkspace).toHaveBeenLastCalledWith('ws-c')

    act(() => second.resolve())
    await settle()
    expect(switchWorkspace).toHaveBeenCalledTimes(2)
  })
})

describe('useDeleteWorkspace', () => {
  it('tears the whole cache down when the deleted workspace is the active one', async () => {
    setActiveWorkspaceId('ws-1')
    const { queryClient } = await renderWithProviders(<DeleteProbe />)
    // Stand-ins for the workspace-scoped entries a real tab holds — the ones
    // an invalidation of the workspaces list alone would leave serving the
    // deleted workspace's data.
    queryClient.setQueryData(['campaigns', 'summaries'], [])
    queryClient.setQueryData(['brand'], { voices: [] })

    fireEvent.click(screen.getByText('delete-ws-1'))

    await waitFor(() => expect(getActiveWorkspaceId()).toBeNull())
    expect(queryClient.getQueryData(['campaigns', 'summaries'])).toBeUndefined()
    expect(queryClient.getQueryData(['brand'])).toBeUndefined()
    // The stream's connection was opened under the deleted workspace's header.
    expect(reconnectEvents).toHaveBeenCalled()
  })

  it('leaves the tab alone when the deleted workspace is another one', async () => {
    setActiveWorkspaceId('ws-2')
    const { queryClient } = await renderWithProviders(<DeleteProbe />)
    queryClient.setQueryData(['campaigns', 'summaries'], [])

    fireEvent.click(screen.getByText('delete-ws-1'))

    // TanStack passes a context object after the variables, so match on the
    // first argument rather than the whole call.
    await waitFor(() =>
      expect(vi.mocked(deleteWorkspace).mock.calls[0]?.[0]).toBe('ws-1'),
    )
    await settle()
    expect(getActiveWorkspaceId()).toBe('ws-2')
    expect(queryClient.getQueryData(['campaigns', 'summaries'])).toEqual([])
    expect(reconnectEvents).not.toHaveBeenCalled()
  })
})
