import { screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { renderWithProviders } from '@/test/renderWithProviders'
import type { AppliedUIAction } from '@/lib/assistantUiActions'
import { UiActionRows } from './UiActionRows'

const view = (zernioId: string, name: string, accounts: number) => ({
  info: { zernioId, name },
  connectedPublishers: [{ accounts: Array.from({ length: accounts }) }],
})

vi.mock('@/hooks/usePlatforms', () => ({
  usePlatformCatalog: () => ({ resolve: () => undefined }),
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
    expect(screen.getByText('BACK')).toBeTruthy()
    expect(screen.queryByText('UNDO')).toBeNull()
  })

  it('shows each changed control before and after', async () => {
    await show([setWindow()])
    expect(screen.getByText('Last 28 days').tagName).toBe('S')
    expect(screen.getByText('All platforms').tagName).toBe('S')
    expect(screen.queryByText('Campaign')).toBeNull()
  })

  it('folds into the navigate before it, with no before → after', async () => {
    await show([
      {
        before: '/ideas',
        action: { type: 'navigate', screen: 'analytics' },
      },
      setWindow({
        window: { preset: '90d', platforms: [], campaignId: 'c1' },
      }),
    ])
    expect(
      screen.getByText(
        'Opened Analytics · Last 90 days · All platforms · Spring reopening',
      ),
    ).toBeTruthy()
    expect(screen.getAllByText('BACK')).toHaveLength(1)
    expect(screen.queryByText('Last 28 days')).toBeNull()
  })
})
