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
  // The real defaults, so the client rows' links can read where to go.
  const state = { ...actual.useSettingsStore.getState(), openRightPanel }
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
  restoreCampaignFinding: async () => {},
  listDismissedFindings: async () => [],
}))

const send = vi.fn(async () => {})
const restoreFinding = vi.fn(async () => {})

beforeEach(() => {
  dismiss.mockClear()
  send.mockClear()
  restoreFinding.mockClear()
  openRightPanel.mockClear()
  useAssistantStore.setState({ send, restoreFinding })
})

const finding = (changes: Partial<CampaignProblems['problems'][number]>) => ({
  key: '',
  code: '',
  severity: 'warning' as const,
  message: '',
  blocksPublishing: false,
  postIds: [],
  posts: [],
  fixes: [],
  ...changes,
})

const problems: CampaignProblems = {
  dismissed: 1,
  dismissedProblems: [
    finding({ key: 'quiet:c', code: 'gap', message: 'Friday is quiet' }),
  ],
  problems: [
    finding({
      key: 'post_type_not_allowed:a',
      code: 'post_type_not_allowed',
      message: 'Spa reopening is a Story; Stories were removed',
      blocksPublishing: true,
      postIds: ['p1'],
      fixes: [
        { kind: 'convert_post_type', title: 'Convert to image post' },
        { kind: 'enable_post_type', title: 'Re-add Stories' },
      ],
    }),
    finding({
      key: 'unwritten_soon:b',
      code: 'unwritten_soon',
      message: '“Chef’s table” publishes in 2 days and isn’t written',
      postIds: ['p2'],
      fixes: [{ kind: 'open_post', title: 'Open the post', postId: 'p2' }],
    }),
    finding({
      key: 'ahead:d',
      code: 'ahead_of_goal',
      severity: 'info',
      message: 'LinkedIn is ahead: 4 a week against 2',
    }),
  ],
}

describe('the calendar’s problems on the Overview', () => {
  it('offers the fix itself, and asks the campaign’s assistant for it', async () => {
    await renderWithProviders(
      <AttentionRail items={[]} problems={problems} campaignId="c1" />,
    )
    fireEvent.click(screen.getByText('Convert to image post'))
    expect(openRightPanel).toHaveBeenCalledWith('assistant')
    // No raw key in what the user's bubble says.
    expect(send).toHaveBeenCalledWith(
      'campaign:c1',
      'Convert to image post: Spa reopening is a Story; Stories were removed',
    )
    fireEvent.click(screen.getByText('or Re-add Stories'))
    expect(send).toHaveBeenLastCalledWith(
      'campaign:c1',
      'Re-add Stories: Spa reopening is a Story; Stories were removed',
    )
  })

  it('asks for every fix at once from the header', async () => {
    await renderWithProviders(
      <AttentionRail items={[]} problems={problems} campaignId="c1" />,
    )
    fireEvent.click(screen.getByText('FIX WITH ASSISTANT'))
    expect(send).toHaveBeenCalledWith('campaign:c1', 'Fix these with me.')
  })

  it('opens the post when that is the fix', async () => {
    await renderWithProviders(
      <AttentionRail items={[]} problems={problems} campaignId="c1" />,
    )
    expect(screen.getByText('Open the post').getAttribute('href')).toBe(
      '/campaigns/c1/posts/p2',
    )
  })

  it('offers only IGNORE on a problem with no fix', async () => {
    await renderWithProviders(
      <AttentionRail items={[]} problems={problems} campaignId="c1" />,
    )
    const row = screen
      .getByText('LinkedIn is ahead: 4 a week against 2')
      .closest('li')
    expect(row?.textContent).toContain('IGNORE')
    expect(row?.querySelectorAll('button')).toHaveLength(1)
  })

  it('counts beside the title, ignores one, and restores from the list', async () => {
    await renderWithProviders(
      <AttentionRail items={[]} problems={problems} campaignId="c1" />,
    )
    expect(screen.getByText('3 · 1 ignored')).toBeTruthy()
    fireEvent.click(screen.getAllByText('IGNORE')[1])
    await waitFor(() =>
      expect(dismiss).toHaveBeenCalledWith('c1', 'unwritten_soon:b'),
    )
    fireEvent.click(screen.getByText('SHOW'))
    fireEvent.click(screen.getByText('RESTORE'))
    expect(restoreFinding).toHaveBeenCalledWith('c1', 'quiet:c')
  })

  it('never folds the server’s problems behind SHOW MORE', async () => {
    await renderWithProviders(
      <AttentionRail
        items={Array.from({ length: 6 }, (_, i) => ({
          id: `rule-${i}`,
          severity: 'todo' as const,
          label: `Rule ${i}`,
          actionLabel: 'Open',
          fix: 'posts' as const,
        }))}
        problems={problems}
        campaignId="c1"
      />,
    )
    expect(
      screen.getByText('LinkedIn is ahead: 4 a week against 2'),
    ).toBeTruthy()
    expect(screen.getByText(/^SHOW \d+ MORE$/)).toBeTruthy()
  })

  it('is all clear only when neither the server nor the rules found anything', async () => {
    await renderWithProviders(
      <AttentionRail
        items={[]}
        problems={{ problems: [], dismissed: 0, dismissedProblems: [] }}
        campaignId="c1"
      />,
    )
    expect(screen.getByText('You’re all set')).toBeTruthy()
  })

  it('keeps what is already wrong ahead of the server’s problems', async () => {
    await renderWithProviders(
      <AttentionRail
        items={[
          {
            id: 'failed-posts',
            severity: 'alert',
            label: '1 post failed to publish',
            actionLabel: 'Review posts',
            fix: 'posts',
          },
        ]}
        problems={problems}
        campaignId="c1"
      />,
    )
    const labels = screen
      .getAllByRole('listitem')
      .map((li) => li.textContent ?? '')
    expect(labels[0]).toContain('1 post failed to publish')
    expect(labels[1]).toContain(problems.problems[0].message)
  })
})
