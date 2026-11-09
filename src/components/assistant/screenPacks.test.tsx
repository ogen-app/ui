import { fireEvent, render, screen } from '@testing-library/react'
import { QueryWrapper } from '@/test/queryWrapper'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useAssistantStore } from '@/stores/assistantStore'
import { useViewContextStore } from '@/stores/viewContextStore'
import { FindingsBlock } from './FindingsBlock'
import { StarterChips } from './StarterChips'

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

  it('falls back to the thread’s own on a screen with none', () => {
    useViewContextStore.setState({ location: { screen: 'post' } })
    render(<StarterChips kind="post" onPick={() => {}} />, {
      wrapper: QueryWrapper,
    })
    expect(screen.getByText('Tighten the opening')).toBeTruthy()
  })
})

describe('calendar findings', () => {
  it('number the findings, colour only warnings, and run a fix’s offer', () => {
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
          findings: [
            {
              key: 'k1',
              code: 'crowded_day',
              severity: 'warning',
              message: 'Thursday has 4 posts, Monday has 1.',
              postIds: [],
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
              postIds: [],
              fixes: [],
            },
          ],
        }}
      />,
    )
    expect(screen.getByText('2 things to look at')).toBeTruthy()
    expect(screen.getByText('01').className).toContain('text-warning')
    expect(screen.getByText('02').className).not.toContain('text-warning')
    fireEvent.click(screen.getByText('Spread them'))
    expect(confirm).toHaveBeenCalledWith('campaign:c1', 'pr7')
    expect(screen.getByText('1 dismissed finding left out.')).toBeTruthy()
  })
})
