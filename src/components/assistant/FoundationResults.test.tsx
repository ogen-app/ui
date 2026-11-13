import { fireEvent, render, screen } from '@testing-library/react'
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { i18next, loadLocaleResources } from '@/i18n'
import { renderWithProviders } from '@/test/renderWithProviders'
import { QueryWrapper } from '@/test/queryWrapper'
import { useAssistantStore } from '@/stores/assistantStore'
import { useViewContextStore } from '@/stores/viewContextStore'
import type { ViewContext } from '@/lib/viewContext'
import type {
  BrandRead,
  FoundationResults as Results,
  UndoState,
} from '@/types/assistant'
import { FoundationResults } from './FoundationResults'
import { StarterChips } from './StarterChips'

const send = vi.fn(async () => {})
const askFor = vi.fn()
const undo = vi.fn(async () => {})
const confirmProposal = vi.fn(async () => {})
const ignoreFinding = vi.fn(async () => {})

beforeEach(() => {
  for (const fn of [send, askFor, undo, confirmProposal, ignoreFinding])
    fn.mockClear()
  useAssistantStore.setState({
    send,
    askFor,
    undo,
    confirmProposal,
    ignoreFinding,
  })
})

function show(
  results: Results,
  {
    view,
    undoStates = {},
  }: { view?: ViewContext; undoStates?: Record<string, UndoState> } = {},
) {
  return renderWithProviders(
    <FoundationResults
      threadId="workspace"
      turnId="t1"
      results={results}
      undoStates={undoStates}
      view={view}
      disabled={false}
    />,
  )
}

const on = (
  screen: ViewContext['screen'],
  focus?: ViewContext['focus'],
): ViewContext => ({
  version: 1,
  screen,
  scope: { kind: 'workspace' },
  ...(focus ? { focus } : {}),
})

const brand = (changes: Partial<BrandRead> = {}): BrandRead => ({
  voices: [],
  factsTotal: 0,
  templates: [],
  ...changes,
})

describe('a voice changed', () => {
  it('says what changed, field by field, with UNDO and no OPEN', async () => {
    await show({
      voice: {
        change: 'updated',
        id: 'v1',
        name: 'Warm host',
        whenToUse: 'Most posts',
        isDefault: true,
        unbound: 0,
        changes: [
          { field: 'formality', before: 'neutral', after: 'casual' },
          { field: 'emoji', before: 'sparingly', after: 'never' },
          {
            field: 'channelNotes.instagram',
            before: '',
            after: 'Lead with the picture',
          },
        ],
        undoId: 'u1',
      },
    })
    expect(screen.getByText('Warm host')).toBeTruthy()
    expect(screen.getByText('Formality')).toBeTruthy()
    // The old value struck through, then the new one, in the library's words.
    expect(screen.getByText('neutral').tagName).toBe('S')
    expect(screen.getByText(/casual/)).toBeTruthy()
    expect(screen.getByText('Emoji')).toBeTruthy()
    expect(screen.getByText('some emoji').tagName).toBe('S')
    expect(screen.getByText('Lead with the picture')).toBeTruthy()
    expect(screen.queryByText('OPEN')).toBeNull()
    fireEvent.click(screen.getByText('UNDO'))
    expect(undo).toHaveBeenCalledWith('workspace', 't1', 'u1')
  })

  it('says a new voice’s rules, in the library’s words', async () => {
    await show({
      voice: {
        change: 'added',
        id: 'v1',
        name: 'Warm host',
        whenToUse: 'Most posts',
        isDefault: false,
        rules: { emoji: '', formality: 'casual', person: 'we', length: 'odd' },
        unbound: 0,
        changes: [],
      },
    })
    expect(screen.getByText('Added')).toBeTruthy()
    // Only the rules it sets: an empty or unknown value is left out.
    expect(screen.getByText(/^casual.+we$/)).toBeTruthy()
    expect(screen.queryByText(/odd/)).toBeNull()
  })
})

describe('the guardrails changed', () => {
  it('shows only the change: the lines added', async () => {
    await show({
      guardrails: {
        changes: [{ field: 'bannedWords', added: ['luxury'] }],
        undoId: 'u3',
      },
    })
    expect(screen.getByText('Guardrails')).toBeTruthy()
    expect(screen.getByText('Banned words')).toBeTruthy()
    expect(screen.getByText('+ luxury')).toBeTruthy()
  })
})

describe('an audience changed', () => {
  it('names the field and its old and new value', async () => {
    await show({
      audience: {
        change: 'updated',
        id: 'a1',
        name: 'Wedding planners',
        who: '',
        readsOn: 'LinkedIn',
        unbound: 0,
        changes: [{ field: 'readsOn', before: 'Instagram', after: 'LinkedIn' }],
        undoId: 'u2',
      },
    })
    expect(screen.getByText('Reads on')).toBeTruthy()
    expect(screen.getByText('Instagram').tagName).toBe('S')
  })
})

describe('a fact', () => {
  it('says it was removed, and offers UNDO', async () => {
    await show({
      fact: {
        change: 'removed',
        id: 'f1',
        statement: 'Spa open 9–20',
        source: '',
        expiresAt: '',
        undoId: 'u7',
      },
    })
    expect(screen.getByText('Removed')).toBeTruthy()
    expect(screen.getByText('UNDO')).toBeTruthy()
  })

  it('says it was renewed', async () => {
    await show({
      fact: {
        change: 'renewed',
        id: 'f1',
        statement: 'Spa open 9–20',
        source: 'Spa menu',
        expiresAt: '2027-03-31',
        undoId: 'u7',
      },
    })
    expect(screen.getByText('Renewed')).toBeTruthy()
    expect(screen.getByText('Spa menu')).toBeTruthy()
  })
})

describe('a bulk change', () => {
  const bulk = {
    done: 6,
    made: {
      facts: { added: 0, updated: 0, removed: 6 },
      voices: { added: 0, updated: 1, removed: 0 },
      audiences: { added: 0, updated: 0, removed: 0 },
    },
    undoIds: ['b1', 'b2', 'b3'],
    kept: [
      {
        factId: 'f1',
        statement: 'A',
        reason: 'a 2026 document also states it',
      },
      {
        factId: 'f2',
        statement: 'B',
        reason: 'a 2026 document also states it',
      },
    ],
    failed: [],
  }

  it('heads with what it made, and says what it kept and why', async () => {
    await show({ bulk })
    expect(screen.getByText('Removed 6 facts')).toBeTruthy()
    expect(screen.getByText('Updated 1 voice')).toBeTruthy()
    expect(screen.getByText('Kept 2')).toBeTruthy()
    expect(screen.getByText('a 2026 document also states it')).toBeTruthy()
    fireEvent.click(screen.getByText('UNDO'))
    expect(undo).toHaveBeenCalledTimes(3)
  })

  it('says how many came back when only some could', async () => {
    await show(
      { bulk },
      { undoStates: { b1: 'undone', b2: 'undone', b3: 'changed' } },
    )
    expect(screen.getByText('2 of 3 undone')).toBeTruthy()
    expect(screen.queryByText('Undone')).toBeNull()
  })
})

describe('what getBrand read', () => {
  const expired = [
    {
      id: 'f1',
      statement: 'Spring rate from €690',
      source: 'Pricing annex',
      expiresAt: '2026-03-31',
    },
    {
      id: 'f2',
      statement: 'Rooftop closed',
      source: 'Press kit',
      expiresAt: '',
    },
  ]

  it('lists the expired facts out of all of them, with RENEW and EDIT', async () => {
    await show({ brand: brand({ factsTotal: 29 }), expiredFacts: expired })
    expect(screen.getByText('2 expired')).toBeTruthy()
    expect(screen.getByText('of 29')).toBeTruthy()
    // A fact with no expiry date says where it came from, and no empty date.
    expect(screen.getByText('Press kit')).toBeTruthy()
    fireEvent.click(screen.getAllByText('RENEW')[0])
    expect(send).toHaveBeenCalledWith(
      'workspace',
      'Renew the fact “Spring rate from €690” for another season.',
    )
    fireEvent.click(screen.getAllByText('EDIT')[0])
    expect(askFor).toHaveBeenCalled()
  })

  it('draws nothing when the read was only the step before an edit', async () => {
    await show({
      brand: brand(),
      expiredFacts: expired,
      fact: {
        change: 'added',
        id: 'f9',
        statement: 'New',
        source: '',
        expiresAt: '',
      },
    })
    expect(screen.queryByText('2 expired')).toBeNull()
  })

  it('shows the templates on the Templates screen, and the palette on the Look screen', async () => {
    const read = brand({
      templates: [
        {
          id: 't1',
          name: 'Quiet frame',
          role: 'foreground',
          ratios: ['9:16'],
          platforms: [],
          isDefault: true,
        },
      ],
      look: {
        palette: [{ hex: '#2f3b33', role: 'Primary' }],
        typefaces: [],
        logos: 0,
      },
    })
    const first = await show(
      { brand: read },
      { view: on('foundation.templates') },
    )
    expect(screen.getByText('1 template')).toBeTruthy()
    expect(screen.getByText('9:16 · foreground · default')).toBeTruthy()
    expect(screen.queryByText('Palette')).toBeNull()
    first.unmount()
    await show({ brand: read }, { view: on('foundation.look') })
    expect(screen.getByText('Palette')).toBeTruthy()
    expect(screen.getByText('#2F3B33')).toBeTruthy()
  })

  it('names what a voice summary was read from', async () => {
    await show(
      {
        brand: brand({
          voices: [
            {
              id: 'v1',
              name: 'Warm host',
              isDefault: true,
              rules: 4,
              samples: 3,
              channelNotes: 2,
            },
          ],
        }),
      },
      { view: on('foundation.voice', { kind: 'voice', id: 'v1' }) },
    )
    expect(screen.getByText('Read from')).toBeTruthy()
    expect(
      screen.getByText('Warm host: rules, 3 samples, and 2 channel notes'),
    ).toBeTruthy()
  })
})

describe('a brand reading', () => {
  it('shows a running read with what it reads and the way to it', async () => {
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
        sources: { pages: 0, assets: 3 },
        answered: [],
      },
    })
    expect(screen.getByText('Reading').className).toContain('text-accent')
    expect(screen.getByText('3 documents')).toBeTruthy()
    expect(
      screen.getByText('About two minutes. You can leave this screen.'),
    ).toBeTruthy()
    expect(screen.getByText('OPEN THE READ').getAttribute('href')).toBe(
      '/foundation/read/r1',
    )
  })

  it('words a failure with no message, never printing its code', async () => {
    await show({
      distill: {
        runId: 'r1',
        status: 'failed',
        failureCode: 'no_usable_sources',
        counts: {
          voices: 0,
          audiences: 0,
          guardrails: 0,
          facts: 0,
          questions: 0,
        },
        questions: [],
        sources: { website: 'villa.example', pages: 0, assets: 0 },
        answered: [],
      },
    })
    expect(screen.queryByText(/no_usable_sources/)).toBeNull()
  })

  it('lists the answers a confirmed round gave, and where from', async () => {
    await show({
      distill: {
        runId: 'r2',
        status: 'running',
        counts: {
          voices: 0,
          audiences: 0,
          guardrails: 0,
          facts: 0,
          questions: 0,
        },
        questions: [],
        answered: [
          {
            questionId: 'q1',
            question: 'Who is it not for?',
            answer: 'Families with young children',
            from: 'the brochure, p. 2',
          },
        ],
      },
    })
    expect(screen.getByText('Answered 1 question')).toBeTruthy()
    expect(
      screen.getByText('Families with young children, from the brochure, p. 2'),
    ).toBeTruthy()
  })
})

describe('series', () => {
  it('lists the library with where each runs', async () => {
    await show({
      seriesList: {
        series: [
          {
            id: 's1',
            name: 'From the kitchen',
            recipe: '',
            runs: false,
            runsIn: [
              {
                campaignId: 'c1',
                campaignName: 'Spring reopening',
                rhythm: { times: 1, per: 'week' },
              },
            ],
          },
          {
            id: 's2',
            name: 'A room a week',
            recipe: '',
            runs: false,
            runsIn: [],
          },
        ],
      },
    })
    expect(screen.getByText('2 in the library')).toBeTruthy()
    expect(screen.getByText('In Spring reopening · Once a week')).toBeTruthy()
    expect(screen.getByText('Not running')).toBeTruthy()
    // The series' own screen is behind its flag: nothing links to it.
    expect(screen.queryByText('OPEN')).toBeNull()
  })

  it('makes and runs one in a single card, with one UNDO', async () => {
    await show({
      series: {
        change: 'added',
        id: 's3',
        name: 'People of the house',
        recipe: 'A person who works here, their corner',
        runs: false,
        runsIn: [],
        undoId: 'u6',
        run: {
          campaignId: 'c1',
          campaignName: 'Spring reopening',
          seriesId: 's3',
          seriesName: 'People of the house',
          running: true,
          rhythm: { times: 1, per: 'week' },
        },
      },
    })
    expect(screen.getByText('Recipe')).toBeTruthy()
    expect(screen.getByText('Runs in Spring reopening')).toBeTruthy()
    expect(screen.getByText('OPEN').getAttribute('href')).toBe(
      '/campaigns/c1/strategy',
    )
    expect(screen.getAllByText('UNDO')).toHaveLength(1)
  })
})

describe('a brand check', () => {
  const check = {
    checked: 4,
    clean: 2,
    left: 0,
    dismissed: 0,
    checkedAgainst: {
      voices: [{ id: 'v1', name: 'Warm host' }],
      guardrails: true,
    },
    findings: [
      {
        key: 'k1',
        postId: 'p1',
        title: 'Rooftop teaser',
        rule: 'banned_word',
        severity: 'high',
        issue: 'Says “luxury”, a banned word.',
        campaignId: 'c1',
        fixes: [
          {
            kind: 'revise_post',
            title: 'Replace the word',
            postId: 'p1',
            proposalId: 'pr1',
          },
          { kind: 'open_post', title: 'Open the post', postId: 'p1' },
        ],
      },
      {
        key: 'k2',
        postId: 'p2',
        title: 'Chef’s table',
        rule: 'voice',
        severity: 'medium',
        issue: 'Formal, where Warm host is casual.',
        campaignId: 'c2',
        fixes: [],
      },
    ],
  }

  it('draws the findings as the calendar does, with IGNORE and the fixes', async () => {
    await show({ brandCheck: check })
    expect(screen.getByText('2 things to look at')).toBeTruthy()
    expect(screen.getByText('in 4 posts')).toBeTruthy()
    expect(screen.getByText('01').className).toContain('text-warning')
    expect(screen.getByText('Says “luxury”, a banned word.')).toBeTruthy()
    fireEvent.click(screen.getByText('Replace the word'))
    expect(confirmProposal).toHaveBeenCalledWith('workspace', 'pr1')
    expect(screen.getByText('or Open the post').getAttribute('href')).toBe(
      '/campaigns/c1/posts/p1',
    )
    // IGNORE dismisses against the finding's own campaign.
    fireEvent.click(screen.getAllByText('IGNORE')[1])
    expect(ignoreFinding).toHaveBeenCalledWith('workspace', 't1', 'c2', 'k2')
    expect(
      screen.getByText('The other 2 follow the voice and the guardrails.'),
    ).toBeTruthy()
    expect(screen.getByText('Checked against')).toBeTruthy()
    expect(screen.getByText('Warm host voice, Guardrails')).toBeTruthy()
  })

  it('draws an ignored finding as one line', async () => {
    renderWithProviders(
      <FoundationResults
        threadId="workspace"
        turnId="t1"
        results={{ brandCheck: check }}
        undoStates={{}}
        ignored={['k1']}
        disabled={false}
      />,
    )
    expect(await screen.findByText('1 thing to look at')).toBeTruthy()
    expect(screen.getByText(/Rooftop teaser/)).toBeTruthy()
  })
})

describe('suggestions on the Foundation screens', () => {
  const chips = (
    location: Partial<ReturnType<typeof useViewContextStore.getState>>,
  ) => {
    useViewContextStore.setState(location)
    return render(<StarterChips kind="workspace" onPick={() => {}} />, {
      wrapper: QueryWrapper,
    })
  }

  it('offer each section’s own verbs', () => {
    let c = chips({ location: { screen: 'foundation.facts' }, page: null })
    expect(screen.getByText('Which facts expired?')).toBeTruthy()
    expect(screen.getByText('Add a fact')).toBeTruthy()
    c.unmount()
    c = chips({ location: { screen: 'foundation.guardrails' }, page: null })
    expect(screen.getByText('Check posts against these')).toBeTruthy()
    expect(screen.getByText('Add a banned word')).toBeTruthy()
    c.unmount()
    c = chips({
      location: {
        screen: 'foundation.voice',
        focus: { kind: 'voice', id: 'v1' },
      },
      page: null,
    })
    expect(screen.getByText('Make it less formal')).toBeTruthy()
    expect(screen.getByText('Read the brand again')).toBeTruthy()
    c.unmount()
    c = chips({ location: { screen: 'foundation.series' }, page: null })
    expect(screen.getByText('Run one in a campaign')).toBeTruthy()
    c.unmount()
    // The look has its own verbs, not the templates'.
    c = chips({ location: { screen: 'foundation.look' }, page: null })
    expect(screen.queryByText('Templates for stories')).toBeNull()
    expect(screen.getByText('Which template fits…')).toBeTruthy()
    c.unmount()
    chips({
      location: { screen: 'assets' },
      page: { selection: { kind: 'asset', ids: ['a1'] } },
    })
    expect(screen.getByText('Read our brand from these')).toBeTruthy()
  })
})

describe('in Spanish', () => {
  afterAll(async () => {
    await i18next.changeLanguage('en')
  })

  it('words a brand check and a field change', async () => {
    await loadLocaleResources('es')
    await i18next.changeLanguage('es')
    await show({
      brandCheck: {
        checked: 3,
        clean: 3,
        left: 0,
        dismissed: 0,
        checkedAgainst: { voices: [], guardrails: true },
        findings: [],
      },
      guardrails: {
        changes: [{ field: 'bannedWords', added: ['lujo'] }],
      },
    })
    expect(screen.getByText('Nada que revisar')).toBeTruthy()
    expect(screen.getByText('en 3 publicaciones')).toBeTruthy()
    expect(screen.getByText('Palabras prohibidas')).toBeTruthy()
    expect(screen.getByText('Revisado con')).toBeTruthy()
    expect(screen.queryByText('Nothing to look at')).toBeNull()
    expect(screen.queryByText('Banned words')).toBeNull()
  })
})
