import { fireEvent, render, screen } from '@testing-library/react'
import { QueryWrapper } from '@/test/queryWrapper'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useAssistantStore } from '@/stores/assistantStore'
import { useViewContextStore } from '@/stores/viewContextStore'
import { FindingsBlock } from './FindingsBlock'
import { StarterChips } from './StarterChips'

const campaignState = vi.hoisted(() => ({ data: null as unknown }))
vi.mock('@/hooks/useCampaignAssistantState', () => ({
  useCampaignAssistantState: () => campaignState,
}))

beforeEach(() => {
  useViewContextStore.setState({
    location: { screen: null },
    page: null,
    pageToken: 0,
    dismissed: false,
    request: null,
  })
})

describe('starters follow the screen', () => {
  it('leads a campaign’s screens with its numbers, over a thread going (CON-483)', () => {
    campaignState.data = {
      state: {
        goal: {
          cadence: 'month',
          perPeriod: 20,
          target: 60,
          planned: 40,
          room: 20,
          unknown: false,
          period: { label: 'next week', target: 5, planned: 2, left: 3 },
        },
      },
      starters: [
        {
          kind: 'fill',
          count: 3,
          period: {
            label: 'next week',
            cadence: 'week',
            index: 2,
            start: '2026-04-13',
            end: '2026-04-19',
            target: 5,
            planned: 2,
            left: 3,
          },
          instruction: 'Draft 3 posts for next week.',
        },
        {
          kind: 'draft',
          count: 20,
          instruction: 'Draft 20 posts to reach the goal.',
        },
      ],
    }
    useAssistantStore.setState({
      activeThreadId: 'campaign:c1',
      threads: {
        'campaign:c1': {
          id: 'campaign:c1',
          subject: { kind: 'campaign', campaignId: 'c1' },
          turns: [],
          status: 'idle',
        },
      } as never,
    })
    useViewContextStore.setState({ location: { screen: 'campaign.calendar' } })
    const onPick = vi.fn()
    render(
      <StarterChips kind="campaign" onPick={onPick} placement="footer" />,
      { wrapper: QueryWrapper },
    )
    const chips = screen.getAllByRole('button').map((b) => b.textContent)
    // Worded from the starter's own figures (CON-511): the week by its days,
    // and the message in the user's language rather than the server's.
    expect(chips.slice(0, 2)).toEqual([
      expect.stringMatching(/^Fill Apr 13\s?–\s?19$/),
      'Draft 20 posts',
    ])
    fireEvent.click(screen.getByText(/^Fill Apr 13/))
    expect(onPick).toHaveBeenCalledWith(
      expect.stringMatching(
        /^Draft 3 posts for Apr 13\s?–\s?19, the slots left in this goal period\.$/,
      ),
    )
    fireEvent.click(screen.getByText('Draft 20 posts'))
    expect(onPick).toHaveBeenLastCalledWith(
      'Draft 20 posts to reach the campaign’s goal.',
    )
    campaignState.data = null
  })

  it('keeps a starter with no figures on the server’s own words (CON-511)', () => {
    campaignState.data = {
      state: {},
      starters: [
        { kind: 'draft', label: 'Draft two posts', instruction: 'Draft two.' },
        { kind: 'calendar', instruction: 'Fix them.' },
      ],
    }
    useAssistantStore.setState({
      activeThreadId: 'campaign:c1',
      threads: {
        'campaign:c1': {
          id: 'campaign:c1',
          subject: { kind: 'campaign', campaignId: 'c1' },
          turns: [],
          status: 'idle',
        },
      } as never,
    })
    useViewContextStore.setState({ location: { screen: 'campaign.calendar' } })
    const onPick = vi.fn()
    render(
      <StarterChips kind="campaign" onPick={onPick} placement="footer" />,
      { wrapper: QueryWrapper },
    )
    fireEvent.click(screen.getByText('Draft two posts'))
    expect(onPick).toHaveBeenCalledWith('Draft two.')
    // No figures and no chip of its own: nothing to offer.
    expect(screen.queryByText('Fix them.')).toBeNull()
    campaignState.data = null
  })

  it('offers a screen’s own verbs', () => {
    useViewContextStore.setState({ location: { screen: 'campaign.calendar' } })
    render(<StarterChips kind="campaign" onPick={() => {}} />, {
      wrapper: QueryWrapper,
    })
    expect(screen.getByText('Anything wrong this week?')).toBeTruthy()
    expect(screen.queryByText('Generate a content plan')).toBeNull()
  })

  it('switches to verbs for what is ticked', () => {
    useViewContextStore.setState({
      location: { screen: 'ideas' },
      page: { selection: { kind: 'idea', ids: ['i1', 'i2', 'i3'] } },
    })
    render(<StarterChips kind="workspace" onPick={() => {}} />, {
      wrapper: QueryWrapper,
    })
    expect(screen.getByText('Draft the selected')).toBeTruthy()
    expect(screen.queryByText('Find ideas about…')).toBeNull()
  })

  it('asks about a set only when more than one idea is ticked (CON-481)', () => {
    useViewContextStore.setState({
      location: { screen: 'ideas' },
      page: { selection: { kind: 'idea', ids: ['i1'], count: 1 } },
    })
    render(<StarterChips kind="workspace" onPick={() => {}} />, {
      wrapper: QueryWrapper,
    })
    expect(screen.getByText('Find similar ideas')).toBeTruthy()
    expect(screen.queryByText('What do these share?')).toBeNull()
  })

  it('offers an open idea’s own verbs (CON-481)', () => {
    useViewContextStore.setState({
      location: { screen: 'ideas' },
      page: { focus: { kind: 'idea', id: 'i1' } },
    })
    render(<StarterChips kind="workspace" onPick={() => {}} />, {
      wrapper: QueryWrapper,
    })
    expect(screen.getByText('Why does this fit?')).toBeTruthy()
    expect(screen.getByText('Draft it')).toBeTruthy()
  })

  it('offers the posts list a filter, and moves for a selection (CON-482)', () => {
    useViewContextStore.setState({ location: { screen: 'campaign.list' } })
    const { unmount } = render(
      <StarterChips kind="campaign" onPick={() => {}} />,
      { wrapper: QueryWrapper },
    )
    expect(screen.getByText('Only the drafts')).toBeTruthy()
    unmount()
    useViewContextStore.setState({
      location: { screen: 'campaign.list' },
      page: { selection: { kind: 'post', ids: ['p1', 'p2'], count: 2 } },
    })
    render(<StarterChips kind="campaign" onPick={() => {}} />, {
      wrapper: QueryWrapper,
    })
    expect(screen.getByText('Move these')).toBeTruthy()
  })

  it('gives a Foundation list’s selection its own starters (CON-482)', () => {
    useViewContextStore.setState({
      location: { screen: 'foundation.voices' },
      page: { selection: { kind: 'voice', ids: ['v1', 'v2'], count: 2 } },
    })
    render(<StarterChips kind="workspace" onPick={() => {}} />, {
      wrapper: QueryWrapper,
    })
    expect(screen.getByText('Ask about these')).toBeTruthy()
  })

  it('falls back to the thread’s own on a screen with none', () => {
    useViewContextStore.setState({ location: { screen: 'post' } })
    render(<StarterChips kind="post" onPick={() => {}} />, {
      wrapper: QueryWrapper,
    })
    expect(screen.getByText('Tighten the opening')).toBeTruthy()
  })
})

describe('calendar findings', () => {
  it('number the findings, colour only what blocks publishing, and run a fix’s offer', () => {
    const confirm = vi.fn(async () => {})
    useAssistantStore.setState({ confirmProposal: confirm })
    render(
      <FindingsBlock
        threadId="campaign:c1"
        turnId="t1"
        disabled={false}
        findings={{
          campaignId: 'c1',
          dismissed: 1,
          dismissedFindings: [
            {
              key: 'k3',
              code: 'gap',
              severity: 'info',
              message: 'Friday is quiet',
              blocksPublishing: false,
              postIds: [],
              posts: [],
              fixes: [],
            },
          ],
          findings: [
            {
              key: 'k1',
              code: 'crowded_day',
              severity: 'warning',
              message: 'Thursday has 4 posts, Monday has 1.',
              blocksPublishing: true,
              postIds: [],
              posts: [],
              fixes: [
                {
                  kind: 'redistribute',
                  title: 'Spread them',
                  proposalId: 'pr7',
                },
              ],
            },
            {
              key: 'k2',
              code: 'gap',
              severity: 'info',
              message: 'Nothing goes out 20–27 April.',
              blocksPublishing: false,
              postIds: [],
              posts: [],
              fixes: [],
            },
          ],
        }}
      />,
      { wrapper: QueryWrapper },
    )
    expect(screen.getByText('2 things to look at')).toBeTruthy()
    expect(screen.getByText('01').className).toContain('text-warning')
    expect(screen.getByText('02').className).not.toContain('text-warning')
    fireEvent.click(screen.getByText('Spread them'))
    expect(confirm).toHaveBeenCalledWith('campaign:c1', 'pr7')
    expect(screen.getByText('1 ignored on this campaign')).toBeTruthy()
  })
})
