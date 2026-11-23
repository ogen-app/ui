import { screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { i18next, loadLocaleResources } from '@/i18n'
import { renderWithProviders } from '@/test/renderWithProviders'
import type { AppliedUIAction } from '@/lib/assistantUiActions'
import { UiActionRows } from './UiActionRows'

const view = (zernioId: string, name: string, accounts: number) => ({
  info: {
    zernioId,
    name,
    postTypes: [{ slug: 'image-post', label: 'Image post' }],
  },
  connectedPublishers: [
    {
      accounts: Array.from({ length: accounts }, (_, i) => ({
        id: `${zernioId}-${i}`,
        is_active: true,
      })),
    },
  ],
})

vi.mock('@/hooks/usePlatforms', () => ({
  usePlatformCatalog: () => ({
    resolve: (slug: string) =>
      ({ instagram: { name: 'Instagram' } })[slug as 'instagram'],
  }),
  usePlatformViews: () => [
    view('instagram', 'Instagram', 1),
    view('linkedin', 'LinkedIn', 1),
    view('tiktok', 'TikTok', 0),
  ],
}))

vi.mock('@/hooks/useCampaigns', () => ({
  useCampaigns: () => ({ data: [{ id: 'c1', name: 'Spring reopening' }] }),
}))

const setWindow = (
  changes: Partial<AppliedUIAction['action']> = {},
): AppliedUIAction => ({
  before: '/analytics?window=28d',
  action: {
    type: 'set_window',
    screen: 'analytics',
    window: {
      from: '2026-03-01',
      to: '2026-03-31',
      platforms: ['instagram', 'tiktok'],
    },
    before: { preset: '28d', platforms: [] },
    changed: ['period', 'platforms'],
    ...changes,
  },
})

function show(actions: AppliedUIAction[]) {
  return renderWithProviders(
    <UiActionRows threadId="workspace" turnId="t1" actions={actions} />,
  )
}

describe('a set_window row (CON-479)', () => {
  it('names only what changed, and only the platforms the page counts', async () => {
    await show([setWindow()])
    expect(
      screen.getByText('Analytics set to Mar 1 – Mar 31 · Instagram'),
    ).toBeTruthy()
    expect(screen.getByText('Back')).toBeTruthy()
    expect(screen.queryByText('Undo')).toBeNull()
  })

  it('shows each changed control before and after', async () => {
    await show([setWindow()])
    expect(screen.getByText('Last 28 days').tagName).toBe('S')
    expect(screen.getByText('All platforms').tagName).toBe('S')
    expect(screen.queryByText('Campaign')).toBeNull()
  })

  // Since CON-497 a navigate's `before` is the window the dashboard opened
  // with — 28 days, every platform, the campaign in scope — and `changed` is
  // only what moved from it (CON-507).
  const opened = (changes: Partial<AppliedUIAction['action']> = {}) =>
    setWindow({
      window: { preset: '90d', platforms: [], campaignId: 'c1' },
      before: { preset: '28d', platforms: [], campaignId: 'c1' },
      changed: ['period'],
      ...changes,
    })

  it('folds into the navigate before it, and shows what moved from where it opened', async () => {
    await show([
      {
        before: '/ideas',
        action: { type: 'navigate', screen: 'analytics' },
      },
      opened(),
    ])
    expect(screen.getByText('Opened Analytics · Last 90 days')).toBeTruthy()
    expect(screen.getAllByText('Back')).toHaveLength(1)
    expect(screen.getByText('Last 28 days').tagName).toBe('S')
    expect(screen.getByText('Period')).toBeTruthy()
    // The campaign was in scope already, so it isn't named as a change.
    expect(screen.queryByText('Campaign')).toBeNull()
  })

  it('names only the campaign when only the campaign moved', async () => {
    await show([
      {
        before: '/ideas',
        action: { type: 'navigate', screen: 'analytics' },
      },
      opened({
        window: { preset: '28d', platforms: [], campaignId: 'c1' },
        before: { preset: '28d', platforms: [] },
        changed: ['campaign'],
      }),
    ])
    expect(screen.getByText('Opened Analytics · Spring reopening')).toBeTruthy()
    expect(screen.getByText('All campaigns').tagName).toBe('S')
    expect(screen.queryByText('Period')).toBeNull()
  })

  it('keeps a navigate elsewhere and the window as two rows, with what changed', async () => {
    await show([
      { before: '/ideas', action: { type: 'navigate', screen: 'assets' } },
      setWindow(),
    ])
    expect(screen.getByText('Opened Assets')).toBeTruthy()
    expect(
      screen.getByText('Analytics set to Mar 1 – Mar 31 · Instagram'),
    ).toBeTruthy()
    expect(screen.getByText('Last 28 days').tagName).toBe('S')
  })

  it('words the change after a navigate in Spanish', async () => {
    await loadLocaleResources('es')
    await i18next.changeLanguage('es')
    try {
      await show([
        {
          before: '/ideas',
          action: { type: 'navigate', screen: 'analytics' },
        },
        opened(),
      ])
      expect(screen.getByText('Periodo')).toBeTruthy()
      expect(screen.queryByText('Period')).toBeNull()
      expect(screen.queryByText('Last 28 days')).toBeNull()
    } finally {
      await i18next.changeLanguage('en')
    }
  })

  it('names the dates a preset the picker lacks lands as', async () => {
    await show([
      setWindow({
        window: {
          from: '2026-03-01',
          to: '2026-03-31',
          preset: '31d',
          platforms: [],
        },
        changed: ['period'],
      }),
    ])
    expect(screen.getByText('Analytics set to Mar 1 – Mar 31')).toBeTruthy()
  })
})

describe('an open_connect row (CON-480)', () => {
  const connect = (
    connect: NonNullable<AppliedUIAction['action']['connect']>,
    threadId = 'workspace',
  ) =>
    renderWithProviders(
      <UiActionRows
        threadId={threadId}
        turnId="t1"
        actions={[
          {
            before: '/activity',
            action: { type: 'open_connect', screen: 'settings', connect },
          },
        ]}
      />,
    )

  it('names the place it landed, with what is open in grey, and the note', async () => {
    await connect({
      platform: 'instagram',
      accountId: 'instagram-0',
      reconnect: true,
    })
    expect(screen.getByText('reconnect window open')).toBeTruthy()
    expect(
      screen.getByText(
        'The sign-in is Instagram’s. Nothing changes until you finish it there.',
      ),
    ).toBeTruthy()
    expect(screen.getByText('Back')).toBeTruthy()
  })

  it('says when the account isn’t connected here (bug 5)', async () => {
    await connect({ platform: 'tiktok', accountId: 'gone', reconnect: true })
    expect(screen.getByText('tiktok isn’t connected here')).toBeTruthy()
  })

  it('points a campaign to Strategy once a new platform is connected', async () => {
    await connect({ platform: 'tiktok', reconnect: false }, 'campaign:c1')
    expect(
      screen.getByText(
        'Add tiktok to this campaign’s platforms once it is connected — on Strategy.',
      ),
    ).toBeTruthy()
  })
})

describe('list rows (CON-482)', () => {
  it('words what a posts filter set, in grey after the screen', async () => {
    await renderWithProviders(
      <UiActionRows
        threadId="campaign:c1"
        turnId="t1"
        actions={[
          {
            before: '/campaigns/c1/list',
            action: {
              type: 'set_filter',
              screen: 'campaign.list',
              campaignId: 'c1',
              filter: 'status=draft&platform=instagram&post_type=image-post',
            },
          },
        ]}
      />,
    )
    // The post type as the platforms word it, not its slug.
    expect(screen.getByText('draft · Instagram · Image post')).toBeTruthy()
  })

  it('counts the rows the list ticked, not the ids sent', async () => {
    await renderWithProviders(
      <UiActionRows
        threadId="campaign:c1"
        turnId="t1"
        actions={[
          {
            before: '/campaigns/c1/list',
            ticked: 2,
            action: {
              type: 'select',
              screen: 'campaign.list',
              campaignId: 'c1',
              selection: { kind: 'post', ids: ['p1', 'p2', 'p3'] },
            },
          },
        ]}
      />,
    )
    expect(screen.getByText('Selected 2 posts')).toBeTruthy()
  })
})
