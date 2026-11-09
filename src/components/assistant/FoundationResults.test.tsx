import { fireEvent, render, screen } from '@testing-library/react'
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { i18next, loadLocaleResources } from '@/i18n'
import { renderWithProviders } from '@/test/renderWithProviders'
import { QueryWrapper } from '@/test/queryWrapper'
import { useAssistantStore } from '@/stores/assistantStore'
import { useViewContextStore } from '@/stores/viewContextStore'
import type { FoundationResults as Results } from '@/types/assistant'
import { FoundationResults } from './FoundationResults'
import { StarterChips } from './StarterChips'

const send = vi.fn(async () => {})
const askFor = vi.fn()
const undo = vi.fn(async () => {})
const confirmProposal = vi.fn(async () => {})

beforeEach(() => {
  for (const fn of [send, askFor, undo, confirmProposal]) fn.mockClear()
  useAssistantStore.setState({ send, askFor, undo, confirmProposal })
})

function show(results: Results, subject = { kind: 'workspace' as const }) {
  return renderWithProviders(
    <FoundationResults
      threadId="workspace"
      turnId="t1"
      subject={subject}
      results={results}
      undoStates={{}}
      disabled={false}
    />,
  )
}

describe('a voice changed', () => {
  it('says what it is now, in the library’s words, with OPEN and UNDO', async () => {
    await show({
      voice: {
        change: 'updated',
        id: 'v1',
        name: 'Warm host',
        whenToUse: 'Most posts',
        isDefault: true,
        rules: {
          emoji: 'never',
          formality: 'casual',
          person: 'we',
          length: 'medium',
        },
        unbound: 0,
        undoId: 'u1',
      },
    })
    expect(screen.getByText('Warm host')).toBeTruthy()
    expect(screen.getByText(/casual/)).toBeTruthy()
    expect(screen.getByText('The default voice')).toBeTruthy()
    expect(screen.getByText('OPEN')).toBeTruthy()
    fireEvent.click(screen.getByText('UNDO'))
    expect(undo).toHaveBeenCalledWith('workspace', 't1', 'u1')
  })

  it('says what a removed one was taken off', async () => {
    await show({
      audience: {
        change: 'removed',
        id: 'a1',
        name: 'Planners',
        who: 'Wedding planners',
        readsOn: '',
        unbound: 3,
        undoId: 'u2',
      },
    })
    expect(screen.getByText('REMOVED', { exact: false })).toBeTruthy()
    expect(
      screen.getByText('Taken off 3 campaigns and posts that used it'),
    ).toBeTruthy()
    expect(screen.queryByText('OPEN')).toBeNull()
  })
})

describe('a bulk change', () => {
  it('undoes every change it made, and names the ones it couldn’t', async () => {
    await show({
      bulk: {
        done: 2,
        undoIds: ['b1', 'b2'],
        failed: [{ what: 'remove a fact', reason: 'it was changed since' }],
      },
    })
    expect(screen.getByText('2 changes')).toBeTruthy()
    expect(
      screen.getByText('Couldn’t remove a fact: it was changed since'),
    ).toBeTruthy()
    fireEvent.click(screen.getByText('UNDO'))
    expect(undo).toHaveBeenCalledWith('workspace', 't1', 'b1')
    expect(undo).toHaveBeenCalledWith('workspace', 't1', 'b2')
  })
})

describe('expired facts', () => {
  it('renews on the click, and fills the composer to edit', async () => {
    await show({
      expiredFacts: [
        {
          id: 'f1',
          statement: 'Spring rate from €690 a night',
          source: 'Pricing annex p. 1',
          expiresAt: '2026-03-31',
        },
      ],
    })
    expect(screen.getByText('1 expired')).toBeTruthy()
    fireEvent.click(screen.getByText('RENEW'))
    expect(send).toHaveBeenCalledWith(
      'workspace',
      'Renew the fact “Spring rate from €690 a night” for another season.',
    )
    fireEvent.click(screen.getByText('EDIT'))
    expect(askFor).toHaveBeenCalledWith(
      'workspace',
      'Change the fact “Spring rate from €690 a night” to ',
    )
  })
})

describe('a brand reading', () => {
  it('shows a running read with the way to it', async () => {
    await show({
      distill: {
        runId: 'r1',
        status: 'running',
        counts: {
          voices: 0,
          audiences: 0,
          guardrails: 0,
          facts: 0,
          questions: 0,
        },
        questions: [],
      },
    })
    expect(screen.getByText('Reading')).toBeTruthy()
    expect(screen.getByText('OPEN THE READ').getAttribute('href')).toBe(
      '/foundation/read/r1',
    )
  })
})

describe('series', () => {
  it('lists the library with what runs here and how often', async () => {
    await show({
      seriesList: {
        campaignId: 'c1',
        series: [
          {
            id: 's1',
            name: 'From the kitchen',
            recipe: '',
            runs: true,
            rhythm: { times: 1, per: 'week' },
          },
          { id: 's2', name: 'A room a week', recipe: '', runs: false },
        ],
      },
    })
    expect(screen.getByText('2 in the library')).toBeTruthy()
    expect(screen.getByText('Once a week')).toBeTruthy()
    expect(screen.getByText('Not running here')).toBeTruthy()
  })
})

describe('a brand check', () => {
  it('numbers the findings, runs an offered fix and opens a post through its campaign', async () => {
    await show({
      brandCheck: {
        checked: 4,
        left: 0,
        findings: [
          {
            postId: 'p1',
            title: 'Rooftop teaser',
            rule: 'banned_word',
            severity: 'high',
            quote: 'luxury',
            issue: 'Uses a banned word.',
            suggestion: '',
            campaignId: 'c1',
            fixTitle: 'Open the post',
          },
          {
            postId: 'p2',
            title: 'Chef’s table',
            rule: 'voice',
            severity: 'medium',
            quote: '',
            issue: 'Formal, where Warm host is casual.',
            suggestion: '',
            campaignId: 'c1',
            fixTitle: 'Rewrite in Warm host',
            proposalId: 'pr1',
          },
        ],
      },
    })
    expect(screen.getByText('2 things to look at')).toBeTruthy()
    expect(screen.getByText('in 4 posts')).toBeTruthy()
    expect(screen.getByText('01').className).toContain('text-warning')
    expect(screen.getByText('OPEN POST').getAttribute('href')).toBe(
      '/campaigns/c1/posts/p1',
    )
    fireEvent.click(screen.getByText('Rewrite in Warm host'))
    expect(confirmProposal).toHaveBeenCalledWith('workspace', 'pr1')
  })
})

describe('suggestions on the Foundation screens', () => {
  it('offer each section’s own verbs', () => {
    useViewContextStore.setState({
      location: { screen: 'foundation.facts' },
      page: null,
    })
    const { unmount } = render(
      <StarterChips kind="workspace" onPick={() => {}} />,
      { wrapper: QueryWrapper },
    )
    expect(screen.getByText('Which facts expired?')).toBeTruthy()
    unmount()
    useViewContextStore.setState({
      location: { screen: 'campaign.list' },
      page: { selection: { kind: 'post', ids: ['p1'] } },
    })
    render(<StarterChips kind="campaign" onPick={() => {}} />, {
      wrapper: QueryWrapper,
    })
    expect(screen.getByText('Check against the brand')).toBeTruthy()
  })
})

describe('in Spanish', () => {
  afterAll(async () => {
    await i18next.changeLanguage('en')
  })

  it('words a brand check', async () => {
    await loadLocaleResources('es')
    await i18next.changeLanguage('es')
    await show({ brandCheck: { checked: 3, left: 0, findings: [] } })
    expect(screen.getByText('Nada que revisar')).toBeTruthy()
    expect(screen.getByText('en 3 publicaciones')).toBeTruthy()
    expect(screen.queryByText('Nothing to look at')).toBeNull()
  })
})
