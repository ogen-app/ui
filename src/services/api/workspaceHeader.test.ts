import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { setActiveWorkspaceId } from '@/lib/activeWorkspace'

/**
 * Which requests name a workspace, and which must not (CON-147).
 *
 * This is the rule the whole per-tab model rests on, and it fails in two
 * directions that both matter:
 *
 * - a scoped call going out *without* the header lands in whichever workspace
 *   the account defaults to — publishing to the wrong client's account is the
 *   version of that bug that reaches the outside world;
 * - an account-level call going out *with* one is unrecoverable: those are
 *   exactly the calls a tab makes when its own workspace has stopped answering.
 *
 * The flag is stubbed rather than read, so these assertions describe the
 * feature's behaviour whichever way `multi-workspace` happens to be set today.
 */
const isEnabled = vi.hoisted(() => vi.fn(() => true))
vi.mock('@/config/featureFlags', () => ({ isFeatureEnabled: isEnabled }))

const { workspaceHeader } = await import('./base')

const HEADER = 'X-Workspace-Id'

beforeEach(() => {
  isEnabled.mockReturnValue(true)
  setActiveWorkspaceId('ws-b')
})

afterEach(() => {
  setActiveWorkspaceId(null)
})

describe('workspaceHeader', () => {
  it('names the tab’s workspace on every workspace-scoped route', () => {
    for (const path of [
      '/api/campaigns',
      '/api/posts/p1/attachments',
      '/api/users',
      '/api/users/u1/role',
      '/api/invitations',
      '/api/tenants/current',
      '/api/settings/calendar.u1.c1',
      '/api/integrations/zernio/accounts',
      '/api/events?topics=all',
    ]) {
      expect(workspaceHeader(path), path).toEqual({ [HEADER]: 'ws-b' })
    }
  })

  it('leaves account-level routes unscoped, so a stale pin can be recovered from', () => {
    for (const path of [
      '/api/workspaces',
      '/api/workspaces/ws-a',
      '/api/workspaces/ws-a/switch',
      '/api/current_user',
      '/api/sessions',
    ]) {
      expect(workspaceHeader(path), path).toEqual({})
    }
  })

  it('leaves the public invite routes unscoped — the token names the workspace', () => {
    expect(workspaceHeader('/api/invitations/accept/tok-1')).toEqual({})
    // The owner-side invitation routes are a different thing and stay scoped.
    expect(workspaceHeader('/api/invitations/inv-1')).toEqual({ [HEADER]: 'ws-b' })
  })

  it('ignores the query string when deciding', () => {
    expect(workspaceHeader('/api/workspaces?include=counts')).toEqual({})
  })

  it('sends nothing when the tab has no workspace pinned', () => {
    setActiveWorkspaceId(null)
    expect(workspaceHeader('/api/campaigns')).toEqual({})
  })

  it('sends nothing at all while the feature is off', () => {
    isEnabled.mockReturnValue(false)
    expect(workspaceHeader('/api/campaigns')).toEqual({})
  })
})
