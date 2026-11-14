import { fireEvent, screen } from '@testing-library/react'
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { i18next, loadLocaleResources } from '@/i18n'
import { renderWithProviders } from '@/test/renderWithProviders'
import { useAssistantStore } from '@/stores/assistantStore'
import { useViewContextStore } from '@/stores/viewContextStore'
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

const members = vi.hoisted(() => ({
  data: [{ id: 'u1', name: 'Marta Ruiz', email: 'marta@example.com' }] as
    { id: string; name: string; email: string }[] | undefined,
}))

vi.mock('@/hooks/useWorkspaces', () => ({
  useWorkspaceMembers: () => ({ data: members.data }),
}))

const undo = vi.fn(async () => {})
const runUiAction = vi.fn(async () => {})

beforeEach(() => {
  undo.mockClear()
  runUiAction.mockClear()
  useAssistantStore.setState({ undo, runUiAction })
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

const week: NonNullable<Results['activity']> = {
  from: '2026-04-13',
  to: '2026-04-19',
  tz: 'Europe/Lisbon',
  published: 9,
  failed: 1,
  failedPosts: [
    {
      postId: 'p1',
      title: 'Easter brunch on the terrace',
      status: 'failed',
      reason: 'Instagram needs reconnecting',
    },
  ],
  created: 5,
  scheduled: 4,
  campaignsCreated: 0,
  ideasDecided: 0,
  days: [
    {
      date: '2026-04-13',
      published: 3,
      failed: 0,
      created: 1,
      campaignsCreated: 0,
    },
    {
      date: '2026-04-16',
      published: 0,
      failed: 1,
      created: 0,
      campaignsCreated: 0,
    },
  ],
}

describe('the week card (CON-480)', () => {
  it('heads a week by its days, tiles the totals with zeroes kept, and opens each day', async () => {
    await show({ activity: week })
    expect(screen.getByText('WEEK', { exact: false })).toBeTruthy()
    expect(screen.getByText('April 13 – 19')).toBeTruthy()
    expect(screen.getByText('Mon–Sun')).toBeTruthy()
    // Every tile, the zero ideas decided included.
    expect(screen.getByText('ideas decided')).toBeTruthy()
    expect(screen.getByText('0')).toBeTruthy()
    expect(screen.getByText('1').className).toContain('text-warning-ink')
    expect(
      screen.getByText('Easter brunch on the terrace didn’t go out').className,
    ).toContain('text-warning-ink')
    expect(screen.getByText('Instagram needs reconnecting')).toBeTruthy()
    expect(
      screen.getAllByText('OPEN').map((a) => a.getAttribute('href')),
    ).toEqual(['/activity/2026-04-13', '/activity/2026-04-16'])
    expect(
      screen.getByText('Tue, Wed, Fri, Sat, and Sun had nothing.'),
    ).toBeTruthy()
    expect(
      screen.getByText('Apr 13 – Apr 19 · Europe/Lisbon · The whole workspace'),
    ).toBeTruthy()
  })

  it('opens a single day’s report from its header (bug 1)', async () => {
    await show({
      activity: { ...week, from: '2026-04-16', to: '2026-04-16', days: [] },
    })
    expect(screen.getByText('OPEN').getAttribute('href')).toBe(
      '/activity/2026-04-16',
    )
  })

  it('says when a quiet run’s next post goes, and names its campaign', async () => {
    await show({
      activity: {
        ...week,
        published: 0,
        failed: 0,
        failedPosts: [],
        days: [],
        campaign: { id: 'c1', name: 'Spring reopening' },
        nextScheduled: {
          postId: 'p9',
          title: 'Rooftop',
          at: '2026-04-21T17:00:00Z',
        },
      },
    })
    expect(
      screen.getByText(
        'Nothing has gone out yet. The next is Tue, Apr 21 at 06:00 PM.',
      ),
    ).toBeTruthy()
    expect(screen.getByText(/Spring reopening$/)).toBeTruthy()
  })
})

describe('the weekly report', () => {
  const digest: NonNullable<Results['digest']> = {
    from: '2026-04-13',
    to: '2026-04-19',
    empty: false,
    headline: 'A steady week',
    lede: '',
    attention: [],
    publishing: {
      published: { value: '9', good: true },
      failed: '1',
      failures: [{ title: 'Easter brunch', meta: '', reason: '' }],
    },
    performance: {
      reach: { value: '31.4K', delta: '+12%', good: true },
      interactions: { value: '1.2K', good: true },
      engagement: { value: '4.1%', good: true },
      followers: { value: '+57', good: true },
      top: [
        { title: 'The thermal pool', meta: '', reach: '8K', multiple: '7.4%' },
      ],
    },
    ideas: { decided: 12, waitingCount: 5 },
  }

  it('is the week of its Monday, as Monday’s email, with a muted rise', async () => {
    await show({ digest })
    expect(screen.getByText('Week of April 13')).toBeTruthy()
    expect(screen.getByText('as Monday’s email')).toBeTruthy()
    expect(screen.getByText('+12%').className).not.toContain('text-accent')
    expect(screen.getByText('Best post')).toBeTruthy()
    expect(screen.getByText('The thermal pool')).toBeTruthy()
    expect(screen.getByText('5 still waiting')).toBeTruthy()
  })

  it('says whom it was sent to', async () => {
    await show({
      emailed: {
        from: '2026-04-13',
        to: '2026-04-19',
        sent: [
          { userId: 'u0', name: 'You', role: 'owner', email: 'you@x' },
          { userId: 'u1', name: 'Marta Ruiz', role: 'member', email: 'm@x' },
        ],
        notSent: [],
        sentAt: new Date().toISOString(),
      },
    })
    expect(screen.getByText('Sent to 2 people')).toBeTruthy()
    expect(screen.getByText('just now')).toBeTruthy()
    expect(screen.getByText('You and Marta Ruiz')).toBeTruthy()
  })

  it('refuses someone outside the workspace, with the way to fix it', async () => {
    await show({
      emailed: {
        from: '2026-04-13',
        to: '2026-04-19',
        sent: [],
        notSent: [{ recipient: 'hello@studio.example', reason: 'not_member' }],
      },
    })
    expect(screen.getByText('Only members can receive it')).toBeTruthy()
    expect(
      screen.getByText('hello@studio.example isn’t in this workspace'),
    ).toBeTruthy()
    expect(
      screen.getByText('Invite them first, from Settings › People'),
    ).toBeTruthy()
    expect(screen.getByText('OPEN').getAttribute('href')).toBe(
      '/workspace-settings',
    )
  })
})

describe('a post’s history', () => {
  it('words each change by its kind, names who asked the assistant, and tags versions', async () => {
    await show({
      history: {
        postId: 'p1',
        title: 'Easter brunch',
        more: false,
        unrecorded: false,
        timezone: 'UTC',
        scope: { changes: ['rescheduled', 'scheduled'] },
        entries: [
          {
            at: '2026-04-15T15:42:00Z',
            kind: 'event',
            change: 'rescheduled',
            what: 'rescheduled',
            from: '2026-04-18T10:00:00Z',
            to: '2026-04-20T10:00:00Z',
            by: 'Marta Ruiz',
            byId: 'u1',
          },
          {
            at: '2026-04-15T11:05:00Z',
            kind: 'event',
            change: 'scheduled',
            what: 'scheduled',
            to: '2026-04-17T10:00:00Z',
            by: 'Marta Ruiz',
            byId: 'u1',
            source: 'assistant',
          },
          {
            at: '2026-04-14T10:00:00Z',
            kind: 'version',
            change: 'version',
            what: 'Rewrote the opening from v3',
            version: 4,
            by: '…',
            byId: 'gone',
          },
          {
            at: '2026-04-13T10:00:00Z',
            kind: 'event',
            change: 'failed',
            what: 'didn’t go out',
            reason: 'Instagram needs reconnecting',
            by: 'the system',
          },
        ],
      },
    })
    expect(screen.getByText('schedule changes')).toBeTruthy()
    expect(
      screen.getByText('Rescheduled Apr 18 → Apr 20, 10:00 AM'),
    ).toBeTruthy()
    expect(screen.getByText('Scheduled for Apr 17, 10:00 AM')).toBeTruthy()
    // An event the assistant made names who asked (bug 2).
    expect(screen.getByText('Assistant, asked by Marta Ruiz')).toBeTruthy()
    // A version's note is the author's, shown as written (bug 6).
    expect(screen.getByText('Rewrote the opening from v3')).toBeTruthy()
    expect(screen.getByText('Version 4')).toBeTruthy()
    expect(screen.getByText('A former member')).toBeTruthy()
    expect(
      screen.getByText('Didn’t go out: Instagram needs reconnecting').className,
    ).toContain('text-warning-ink')
    // VERSIONS only on the post itself.
    expect(screen.queryByText('VERSIONS')).toBeNull()
  })

  it('offers VERSIONS on the post, and says where the record thins', async () => {
    useViewContextStore.setState({
      location: { screen: 'post', focus: { kind: 'post', id: 'p1' } },
    })
    await show({
      history: {
        postId: 'p1',
        title: 'Opening day',
        more: false,
        unrecorded: true,
        unrecordedBefore: '2026-04-01T00:00:00Z',
        timezone: 'UTC',
        entries: [
          {
            at: '2026-03-28T10:00:00Z',
            kind: 'version',
            what: 'saved a version',
            version: 3,
            by: 'Someone',
          },
        ],
      },
    })
    expect(screen.getByText('VERSIONS')).toBeTruthy()
    expect(
      screen.getByText(
        'Versions saved before Apr 1 say only whether a person, the assistant or Ogen saved them, not who.',
      ),
    ).toBeTruthy()
    useViewContextStore.setState({ location: { screen: null } })
  })
})

describe('a history read before the members load', () => {
  afterAll(() => {
    members.data = [
      { id: 'u1', name: 'Marta Ruiz', email: 'marta@example.com' },
    ]
  })

  it('names people as the server did, not as former members', async () => {
    members.data = undefined
    await show({
      history: {
        postId: 'p1',
        title: 'Easter brunch',
        more: false,
        unrecorded: false,
        entries: [
          {
            at: '2026-04-15T15:42:00Z',
            kind: 'event',
            what: 'scheduled',
            by: 'Marta Ruiz',
            byId: 'u1',
          },
        ],
      },
    })
    expect(screen.getByText('Marta Ruiz')).toBeTruthy()
    expect(screen.queryByText('A former member')).toBeNull()
  })
})

const setup: NonNullable<Results['setup']> = {
  timezone: 'Europe/Lisbon',
  autoPublish: ['instagram'],
  accounts: [
    {
      id: 'a1',
      platform: 'instagram',
      username: 'villa',
      needsReconnect: true,
      autoPublish: true,
      unhealthySince: '2026-04-16T09:00:00Z',
      waitingPosts: 2,
    },
    {
      id: 'a2',
      platform: 'linkedin',
      username: 'villa-li',
      needsReconnect: false,
      autoPublish: false,
      waitingPosts: 0,
    },
  ],
}

describe('the connections', () => {
  it('says since when, what waits, and reconnects through the deep link', async () => {
    await show({ setup })
    expect(screen.getByText('Instagram needs reconnecting')).toBeTruthy()
    expect(screen.getByText('Signed out')).toBeTruthy()
    expect(screen.getByText('since Apr 16')).toBeTruthy()
    expect(screen.getByText('2 scheduled posts')).toBeTruthy()
    fireEvent.click(screen.getByText('RECONNECT INSTAGRAM'))
    expect(runUiAction).toHaveBeenCalledWith('workspace', 't1', {
      type: 'open_connect',
      screen: 'settings',
      connect: { platform: 'instagram', accountId: 'a1', reconnect: true },
    })
  })

  it('reads auto-publish per platform, warning where it can’t go out', async () => {
    await show({ setup })
    expect(screen.getByText('Instagram publishes on its own')).toBeTruthy()
    expect(screen.getByText('1 of 2')).toBeTruthy()
    expect(screen.getByText('but needs reconnecting')).toBeTruthy()
    expect(screen.getByText('you get a reminder at the time')).toBeTruthy()
  })
})

describe('an auto-publish change', () => {
  it('says what changed and what it leaves alone, and undoes it', async () => {
    await show({
      autoPublish: {
        platforms: ['instagram', 'linkedin'],
        undoId: 'u9',
        platform: 'linkedin',
        platformLabel: 'LinkedIn',
        on: true,
        scheduledUnaffected: 3,
      },
    })
    expect(screen.getByText('Turned on for LinkedIn')).toBeTruthy()
    expect(
      screen.getByText(
        'Posts scheduled from now on follow it; the 3 already scheduled keep how they were scheduled.',
      ),
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
    await show({ activity: week, setup })
    expect(screen.getByText('ideas decididas')).toBeTruthy()
    expect(screen.getByText('Sesión cerrada')).toBeTruthy()
    expect(screen.getByText('RECONECTAR INSTAGRAM')).toBeTruthy()
    expect(screen.queryByText('ideas decided')).toBeNull()
    expect(screen.queryByText('Signed out')).toBeNull()
  })
})
