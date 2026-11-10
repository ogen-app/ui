import { fireEvent, screen } from '@testing-library/react'
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { i18next, loadLocaleResources } from '@/i18n'
import { renderWithProviders } from '@/test/renderWithProviders'
import { useAssistantStore } from '@/stores/assistantStore'
import type { WorkspaceResults as Results } from '@/types/assistant'
import { WorkspaceResults } from './WorkspaceResults'

vi.mock('@/hooks/usePlatforms', () => ({
  usePlatformCatalog: () => ({
    resolve: (slug: string) =>
      ({ instagram: { name: 'Instagram' }, linkedin: { name: 'LinkedIn' } })[
        slug
      ],
  }),
}))

vi.mock('@/hooks/useWorkspaces', () => ({
  useWorkspaceMembers: () => ({
    data: [{ id: 'u1', name: 'Marta Ruiz', email: 'marta@example.com' }],
  }),
}))

const undo = vi.fn(async () => {})

beforeEach(() => {
  undo.mockClear()
  useAssistantStore.setState({ undo })
})

function show(results: Results) {
  return renderWithProviders(
    <WorkspaceResults
      threadId="workspace"
      turnId="t1"
      results={results}
      undoStates={{}}
    />,
  )
}

const week: Results['activity'] = {
  from: '2026-04-13',
  to: '2026-04-19',
  tz: 'Europe/Lisbon',
  published: 9,
  failed: 1,
  failedPosts: [],
  created: 5,
  scheduled: 4,
  campaignsCreated: 0,
  days: [
    {
      date: '2026-04-16',
      published: 0,
      failed: 1,
      created: 0,
      campaignsCreated: 0,
    },
  ],
}

describe('the activity card', () => {
  it('totals the week, keeps the miss amber and opens each day', async () => {
    await show({ activity: week })
    expect(screen.getByText('Apr 13 – Apr 19')).toBeTruthy()
    expect(screen.getByText('Didn’t go out')).toBeTruthy()
    expect(screen.getByText('1 didn’t go out').className).toContain(
      'text-warning',
    )
    expect(screen.getByText('OPEN').getAttribute('href')).toBe(
      '/activity/2026-04-16',
    )
    expect(screen.getByText('Days in Europe/Lisbon')).toBeTruthy()
  })
})

describe('a post’s history', () => {
  it('words what happened and names who, from the members', async () => {
    await show({
      history: {
        postId: 'p1',
        title: 'Easter brunch',
        more: false,
        unrecorded: true,
        entries: [
          {
            at: '2026-04-15T15:42:00Z',
            kind: 'event',
            what: 'status draft → scheduled',
            by: 'Marta Ruiz',
            byId: 'u1',
          },
          {
            at: '2026-04-15T11:05:00Z',
            kind: 'version',
            what: 'Restored from v3',
            version: 4,
            by: '…',
            byId: 'u1',
            source: 'assistant',
          },
          {
            at: '2026-04-14T10:00:00Z',
            kind: 'event',
            what: 'scheduled',
            by: '…',
            byId: 'gone',
          },
          {
            at: '2026-04-13T10:00:00Z',
            kind: 'event',
            what: 'something new',
            by: 'the system',
          },
        ],
      },
    })
    expect(screen.getByText('Moved from Draft to Auto-publish')).toBeTruthy()
    expect(
      screen.getByText('Saved version 4 · Restored from version 3'),
    ).toBeTruthy()
    expect(screen.getByText('The assistant, for Marta Ruiz')).toBeTruthy()
    expect(screen.getByText('A former member')).toBeTruthy()
    // A sentence this build predates is shown as the server wrote it.
    expect(screen.getByText('something new')).toBeTruthy()
    expect(screen.getByText('Ogen')).toBeTruthy()
  })
})

describe('the setup', () => {
  it('links a broken account to its row in Settings', async () => {
    await show({
      setup: {
        timezone: 'Europe/Lisbon',
        autoPublish: ['instagram'],
        accounts: [
          {
            id: 'a1',
            platform: 'instagram',
            username: 'villa',
            needsReconnect: true,
            autoPublish: true,
          },
          {
            id: 'a2',
            platform: 'linkedin',
            username: 'villa-li',
            needsReconnect: false,
            autoPublish: false,
          },
        ],
      },
    })
    expect(screen.getByText('1 account needs reconnecting')).toBeTruthy()
    expect(screen.getByText('RECONNECT').getAttribute('href')).toBe(
      '/workspace-settings?reconnect=a1&platform=instagram',
    )
  })
})

describe('an auto-publish change', () => {
  it('says what now publishes on its own, and undoes it', async () => {
    await show({
      autoPublish: { platforms: ['instagram', 'linkedin'], undoId: 'u9' },
    })
    expect(
      screen.getByText('Publishing on their own: Instagram and LinkedIn'),
    ).toBeTruthy()
    fireEvent.click(screen.getByText('UNDO'))
    expect(undo).toHaveBeenCalledWith('workspace', 't1', 'u9')
  })
})

describe('in Spanish', () => {
  afterAll(async () => {
    await i18next.changeLanguage('en')
  })

  it('words the cards', async () => {
    await loadLocaleResources('es')
    await i18next.changeLanguage('es')
    await show({ activity: week })
    expect(screen.getByText('No salieron')).toBeTruthy()
    expect(screen.getByText('Días en Europe/Lisbon')).toBeTruthy()
    expect(screen.queryByText('Didn’t go out')).toBeNull()
  })
})
