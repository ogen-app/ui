import { fireEvent, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderWithProviders } from '@/test/renderWithProviders'
import { useAssistantStore } from '@/stores/assistantStore'
import type { CampaignProblems } from '@/services/api/campaignProblems'
import { AttentionRail } from './AttentionRail'

// The real settings store persists to localStorage, which this environment
// lacks; the row only needs its `openRightPanel`.
const openRightPanel = vi.hoisted(() => vi.fn())
vi.mock('@/stores/settingsStore', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/stores/settingsStore')>()
  const state = { openRightPanel }
  return {
    ...actual,
    useSettingsStore: Object.assign(
      (select: (s: typeof state) => unknown) => select(state),
      { getState: () => state, setState: () => {}, subscribe: () => () => {} },
    ),
  }
})

const dismiss = vi.fn(async () => {})
vi.mock('@/services/api/campaignProblems', () => ({
  dismissCampaignFinding: (...args: unknown[]) => dismiss(...(args as [])),
}))

const send = vi.fn(async () => {})

beforeEach(() => {
  dismiss.mockClear()
  send.mockClear()
  openRightPanel.mockClear()
  useAssistantStore.setState({ send })
})

const problems: CampaignProblems = {
  dismissed: 2,
  problems: [
    {
      key: 'post_type_not_allowed:a',
      code: 'post_type_not_allowed',
      severity: 'warning',
      message:
        '1 story post on Instagram uses a post type the campaign no longer includes there',
      postIds: ['p1'],
      fixes: [
        { kind: 'enable_post_type', title: 'Allow story on Instagram again' },
      ],
    },
    {
      key: 'unwritten_soon:b',
      code: 'unwritten_soon',
      severity: 'warning',
      message: '“Chef’s table” publishes in 2 days and isn’t written',
      postIds: ['p2'],
      fixes: [{ kind: 'open_post', title: 'Open the post', postId: 'p2' }],
    },
  ],
}

describe('the calendar’s problems on the Overview', () => {
  it('asks the campaign’s assistant to fix one, by its key', async () => {
    await renderWithProviders(
      <AttentionRail items={[]} problems={problems} campaignId="c1" />,
    )
    fireEvent.click(screen.getByText('FIX WITH ASSISTANT'))
    expect(openRightPanel).toHaveBeenCalledWith('assistant')
    expect(send).toHaveBeenCalledWith(
      'campaign:c1',
      `Fix the problem post_type_not_allowed:a: ${problems.problems[0].message}`,
    )
  })

  it('opens the post when that is the fix', async () => {
    await renderWithProviders(
      <AttentionRail items={[]} problems={problems} campaignId="c1" />,
    )
    expect(screen.getByText('OPEN POST').getAttribute('href')).toBe(
      '/campaigns/c1/posts/p2',
    )
  })

  it('ignores one, and says how many are ignored', async () => {
    await renderWithProviders(
      <AttentionRail items={[]} problems={problems} campaignId="c1" />,
    )
    expect(screen.getByText('2 ignored')).toBeTruthy()
    fireEvent.click(screen.getAllByText('IGNORE')[1])
    await waitFor(() =>
      expect(dismiss).toHaveBeenCalledWith('c1', 'unwritten_soon:b'),
    )
  })

  it('is all clear only when neither the server nor the rules found anything', async () => {
    await renderWithProviders(
      <AttentionRail
        items={[]}
        problems={{ problems: [], dismissed: 1 }}
        campaignId="c1"
      />,
    )
    expect(screen.getByText('You’re all set'.replace('’', "'"))).toBeTruthy()
  })
})
