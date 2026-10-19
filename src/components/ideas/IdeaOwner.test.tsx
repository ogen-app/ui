import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { WorkspaceMember } from '@/types/workspace'

const state = vi.hoisted(() => ({
  members: [] as WorkspaceMember[],
  flag: true,
}))

vi.mock('@/hooks/useWorkspaces', () => ({
  useWorkspaceMembers: () => ({ data: state.members }),
}))

vi.mock('@/config/featureFlags', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/config/featureFlags')>()),
  useFeatureFlag: () => state.flag,
}))

const { IdeaOwnerLine } = await import('./IdeaOwner')
const { readIdeaOwner, writeIdeaOwner } =
  await import('@/services/api/ideaOwnerLocal')

function member(id: string, name: string): WorkspaceMember {
  return {
    id,
    name,
    email: `${id}@example.com`,
    role: 'owner',
    joined_at: '2026-09-01T00:00:00Z',
    is_self: id === 'u1',
  }
}

describe('IdeaOwnerLine', () => {
  beforeEach(() => {
    localStorage.clear()
    state.flag = true
    state.members = []
  })

  it('names the sole member and offers no way to change it', () => {
    state.members = [member('u1', 'Anna K.')]
    render(<IdeaOwnerLine ideaId="i1" />)

    expect(screen.getByText('Owner')).toBeInTheDocument()
    expect(screen.getByText('Anna K.')).toBeInTheDocument()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
    expect(screen.queryByText('No owner')).not.toBeInTheDocument()
    // Derived, not stored: a second member joining finds nothing to undo.
    expect(readIdeaOwner('i1')).toBeNull()
  })

  it('ignores a stored owner while there is only one member', () => {
    writeIdeaOwner('i1', 'gone')
    state.members = [member('u1', 'Anna K.')]
    render(<IdeaOwnerLine ideaId="i1" />)

    expect(screen.getByText('Anna K.')).toBeInTheDocument()
  })

  it('offers the members, unowned by default, once there is a choice', async () => {
    state.members = [member('u1', 'Anna K.'), member('u2', 'Ben L.')]
    render(<IdeaOwnerLine ideaId="i1" />)

    const trigger = screen.getByRole('button', { name: /No owner/ })
    await userEvent.click(trigger)
    await userEvent.click(screen.getByRole('menuitem', { name: 'Ben L.' }))

    expect(readIdeaOwner('i1')).toBe('u2')
    expect(screen.getByRole('button', { name: /Ben L\./ })).toBeInTheDocument()
  })

  it('reads an owner who has left as no owner', () => {
    writeIdeaOwner('i1', 'gone')
    state.members = [member('u1', 'Anna K.'), member('u2', 'Ben L.')]
    render(<IdeaOwnerLine ideaId="i1" />)

    expect(screen.getByRole('button', { name: /No owner/ })).toBeInTheDocument()
  })

  it('renders nothing with the flag off', () => {
    state.flag = false
    state.members = [member('u1', 'Anna K.')]
    const { container } = render(<IdeaOwnerLine ideaId="i1" />)

    expect(container).toBeEmptyDOMElement()
  })
})
