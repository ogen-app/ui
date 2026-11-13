import { fireEvent, screen } from '@testing-library/react'
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { i18next, loadLocaleResources } from '@/i18n'
import { renderWithProviders } from '@/test/renderWithProviders'
import { useAssistantStore } from '@/stores/assistantStore'
import type {
  AssistantProposal,
  CalendarFindings,
  RepairResults as Results,
} from '@/types/assistant'
import { FindingsBlock } from './FindingsBlock'
import { RepairResults } from './RepairResults'

const confirmProposal = vi.fn(async () => {})
const dismissProposal = vi.fn(async () => {})
const ignoreFinding = vi.fn(async () => {})
const restoreFinding = vi.fn(async () => {})
const send = vi.fn(async () => {})
const undo = vi.fn(async () => {})

beforeEach(() => {
  for (const fn of [
    confirmProposal,
    dismissProposal,
    ignoreFinding,
    restoreFinding,
    send,
    undo,
  ])
    fn.mockClear()
  useAssistantStore.setState({
    confirmProposal,
    dismissProposal,
    ignoreFinding,
    restoreFinding,
    send,
    undo,
  })
})

const typeFinding: CalendarFindings = {
  campaignId: 'c1',
  dismissed: 1,
  checkedAt: '2026-11-12T16:40:00Z',
  findings: [
    {
      key: 'post_type_not_allowed:a',
      code: 'post_type_not_allowed',
      severity: 'warning',
      message: 'Spa reopening is a Story; Stories were removed',
      detail: 'It publishes Thu 17 and will be refused.',
      blocksPublishing: true,
      postIds: ['p1'],
      posts: [{ id: 'p1', title: 'Spa reopening', date: '2026-04-17' }],
      fixes: [
        {
          kind: 'convert_post_type',
          title: 'Convert to image post',
          postIds: ['p1'],
          proposalId: 'pr1',
        },
        {
          kind: 'enable_post_type',
          title: 'Re-add Stories',
          proposalId: 'pr2',
          card: {
            verb: 'Re-add Stories',
            rows: [{ kind: 'destination', value: 'Instagram' }],
            sources: [],
          },
        },
      ],
    },
    {
      key: 'outside:b',
      code: 'outside_window',
      severity: 'warning',
      message: 'Rooftop teaser is outside the campaign dates',
      blocksPublishing: false,
      postIds: ['p2'],
      posts: [],
      fixes: [
        {
          kind: 'move_post',
          title: 'Move to another slot',
          postId: 'p2',
          proposalId: 'pr3',
          options: [
            { id: 's1', title: 'Mon 14, 18:00', recommended: true },
            { id: 's2', title: 'Wed 16, 12:00' },
          ],
        },
      ],
    },
  ],
  dismissedFindings: [
    {
      key: 'quiet:c',
      code: 'gap',
      severity: 'info',
      message: 'Friday is quiet',
      blocksPublishing: false,
      postIds: [],
      posts: [],
      fixes: [],
    },
  ],
}

function findings({
  ignored = [],
  proposals = [],
}: { ignored?: string[]; proposals?: AssistantProposal[] } = {}) {
  return renderWithProviders(
    <FindingsBlock
      threadId="campaign:c1"
      turnId="t1"
      findings={typeFinding}
      ignored={ignored}
      proposals={proposals}
      disabled={false}
    />,
  )
}

const offer = (
  id: string,
  status: AssistantProposal['status'],
  changes: Partial<AssistantProposal> = {},
): AssistantProposal => ({
  id,
  tool: 'x',
  summary: id,
  options: [],
  status,
  ...changes,
})

describe('a calendar finding', () => {
  it('heads with what blocks publishing, and says what it costs', async () => {
    await findings()
    expect(screen.getByText('2 things to look at')).toBeTruthy()
    expect(screen.getByText('1 blocks publishing')).toBeTruthy()
    expect(
      screen.getByText('It publishes Thu 17 and will be refused.'),
    ).toBeTruthy()
    // Amber follows what blocks publishing, not the severity.
    expect(screen.getByText('01').className).toContain('text-warning-ink')
    expect(screen.getByText('02').className).not.toContain('text-warning')
  })

  it('runs a plain fix on the click, in one button style', async () => {
    await findings()
    const button = screen.getByText('Convert to image post')
    expect(button.className).toContain('uppercase')
    fireEvent.click(button)
    expect(confirmProposal).toHaveBeenCalledWith('campaign:c1', 'pr1')
  })

  it('opens a fix with its own card as an offer, not a click', async () => {
    await findings()
    fireEvent.click(screen.getByText('or Re-add Stories'))
    expect(confirmProposal).not.toHaveBeenCalled()
    expect(screen.getByText('PROPOSAL')).toBeTruthy()
    expect(screen.getByText('Instagram')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Re-add Stories' }))
    expect(confirmProposal).toHaveBeenCalledWith('campaign:c1', 'pr2')
  })

  it('lets a move choose its slot', async () => {
    await findings()
    fireEvent.click(screen.getByText('Move to another slot'))
    expect(screen.getByText('CHOOSE ONE')).toBeTruthy()
    fireEvent.click(screen.getAllByText('CHOOSE')[1])
    expect(confirmProposal).toHaveBeenCalledWith('campaign:c1', 'pr3', 's2')
  })

  it('says a finding was fixed once its offer ran, with no buttons', async () => {
    await findings({
      proposals: [
        offer('pr3', 'confirmed', {
          options: [{ id: 's1', title: 'Mon 14, 18:00' }],
          chosen: 's1',
        }),
      ],
    })
    expect(
      screen.getByText('Fixed: Move to another slot · Mon 14, 18:00'),
    ).toBeTruthy()
    expect(screen.queryByText('Move to another slot')).toBeNull()
    // The other finding still offers its own.
    expect(screen.getByText('Convert to image post')).toBeTruthy()
  })

  it('ignores by its key, in the campaign', async () => {
    await findings()
    fireEvent.click(screen.getAllByText('IGNORE')[1])
    expect(ignoreFinding).toHaveBeenCalledWith(
      'campaign:c1',
      't1',
      'c1',
      'outside:b',
    )
  })

  it('draws an ignored one as a line, and lists every ignore with RESTORE', async () => {
    await findings({ ignored: ['outside:b'] })
    expect(screen.getByText('1 thing to look at')).toBeTruthy()
    expect(
      screen.getByText('Ignored: Rooftop teaser is outside the campaign dates'),
    ).toBeTruthy()
    // The one ignored before the check, and the one ignored since.
    expect(screen.getByText('2 ignored on this campaign')).toBeTruthy()
    fireEvent.click(screen.getByText('SHOW'))
    fireEvent.click(screen.getAllByText('RESTORE')[1])
    expect(restoreFinding).toHaveBeenCalledWith('c1', 'quiet:c')
  })

  it('says when it read the calendar, and checks again', async () => {
    await findings()
    expect(screen.getByText(/^Read .+\.$/)).toBeTruthy()
    fireEvent.click(screen.getByText('CHECK AGAIN'))
    expect(send).toHaveBeenCalledWith(
      'campaign:c1',
      'Check the calendar again.',
    )
  })
})

function show(
  results: Results,
  {
    undoStates = {},
    proposals = [],
  }: {
    undoStates?: Record<string, 'undone'>
    proposals?: AssistantProposal[]
  } = {},
) {
  return renderWithProviders(
    <RepairResults
      threadId="campaign:c1"
      turnId="t1"
      results={results}
      undoStates={undoStates}
      proposals={proposals}
      disabled={false}
    />,
  )
}

const review = {
  campaignId: 'c1',
  postsChecked: 4,
  dismissed: 0,
  dismissedFindings: [],
  readFrom: ['brief', 'posts'],
  findings: [
    {
      kind: 'post' as const,
      key: 'post_drift:1',
      severity: 'high' as const,
      label: 'Late check-out',
      postId: 'p2',
      issue: 'Promises free parking.',
      suggestion: 'The facts say parking is €25 a night.',
      fixes: [
        {
          kind: 'revise_post',
          title: 'Rewrite it to follow the brief',
          postId: 'p2',
          proposalId: 'pr4',
        },
        { kind: 'open_post', title: 'Open the post', postId: 'p2' },
      ],
    },
  ],
}

describe('the review', () => {
  it('offers each finding’s own fixes, and IGNORE', async () => {
    await show({ review })
    expect(screen.getByText('1 thing drifts from the brief')).toBeTruthy()
    expect(screen.getByText('4 posts read')).toBeTruthy()
    expect(
      screen.getByText(
        'In Late check-out. The facts say parking is €25 a night.',
      ),
    ).toBeTruthy()
    fireEvent.click(screen.getByText('Rewrite it to follow the brief'))
    expect(confirmProposal).toHaveBeenCalledWith('campaign:c1', 'pr4')
    expect(screen.getByText('or Open the post').getAttribute('href')).toBe(
      '/campaigns/c1/posts/p2',
    )
    fireEvent.click(screen.getByText('IGNORE'))
    expect(ignoreFinding).toHaveBeenCalledWith(
      'campaign:c1',
      't1',
      'c1',
      'post_drift:1',
    )
    expect(screen.getByText('Brief, Posts')).toBeTruthy()
  })

  it('draws the brief check in the same shape', async () => {
    await show({ briefReview: { ...review, readFrom: ['brief'] } })
    expect(screen.getByText('1 thing in the brief')).toBeTruthy()
  })

  it('never says they agree when the findings were only ignored', async () => {
    await show({
      review: { ...review, findings: [], dismissedFindings: review.findings },
    })
    expect(screen.getByText('Nothing open · 1 ignored')).toBeTruthy()
    expect(screen.queryByText('The brief and the posts agree')).toBeNull()
  })
})

describe('the optimise plan', () => {
  const plan = {
    campaignId: 'c1',
    proposalId: 'pr5',
    window: { from: '2026-04-13', to: '2026-04-19' },
    moves: [
      {
        postId: 'p1',
        title: 'Spa reopening',
        from: '2026-04-17',
        to: '2026-04-14',
        toAt: '2026-04-14T10:00:00Z',
      },
    ],
    locked: [
      {
        postId: 'p3',
        title: 'Thermal pool',
        date: '2026-04-15',
        at: '2026-04-15T10:00:00Z',
      },
    ],
  }

  it('sits inside its offer, with the window, the grid and the moves', async () => {
    await show({ plan }, { proposals: [offer('pr5', 'pending')] })
    expect(screen.getByText('PROPOSAL')).toBeTruthy()
    expect(screen.getByText('Move 1 post')).toBeTruthy()
    expect(screen.getByText(/^within /)).toBeTruthy()
    expect(screen.getByText('Before')).toBeTruthy()
    expect(screen.getByText('After')).toBeTruthy()
    expect(screen.getByText(/^Fri, Apr 17 → Tue, Apr 14, /)).toBeTruthy()
    expect(screen.getByText(/^Stays Wed, Apr 15, /)).toBeTruthy()
    fireEvent.click(screen.getByText('MOVE 1 POST'))
    expect(confirmProposal).toHaveBeenCalledWith('campaign:c1', 'pr5')
  })

  it('counts a run too long to draw', async () => {
    await show(
      { plan: { ...plan, window: { from: '2026-04-01', to: '2026-05-30' } } },
      { proposals: [offer('pr5', 'pending')] },
    )
    expect(screen.queryByText('Before')).toBeNull()
  })
})

describe('a move that ran', () => {
  it('names one post with its old and new time, and UNDO', async () => {
    await show({
      moved: {
        moved: 1,
        moves: [
          {
            postId: 'p1',
            title: 'Late check-out',
            from: '2026-04-19',
            to: '2026-04-14',
            fromAt: '2026-04-19T10:00:00Z',
            toAt: '2026-04-14T18:00:00Z',
          },
        ],
        byStatus: { draft: 1 },
        locked: 0,
        skipped: [],
        undoId: 'u3',
      },
    })
    expect(screen.getByText('Moved')).toBeTruthy()
    expect(screen.getByText('Late check-out')).toBeTruthy()
    expect(screen.getByText(/^Sun, Apr 19, .+ → Tue, Apr 14, /)).toBeTruthy()
    fireEvent.click(screen.getByText('UNDO'))
    expect(undo).toHaveBeenCalledWith('campaign:c1', 't1', 'u3')
  })

  it('counts a run by what the posts were', async () => {
    await show({
      moved: {
        moved: 9,
        moves: [
          { postId: 'a', title: '', from: '2026-03-01', to: '2026-03-02' },
          { postId: 'b', title: '', from: '2026-04-01', to: '2026-04-08' },
        ],
        byStatus: { draft: 5, planned: 2, ready_for_publish: 2 },
        locked: 5,
        skipped: [],
        undoId: 'u4',
      },
    })
    expect(screen.getByText('9 posts')).toBeTruthy()
    expect(screen.getByText('over 6 weeks')).toBeTruthy()
    expect(screen.getByText('7 moved')).toBeTruthy()
    expect(screen.getByText('2 moved')).toBeTruthy()
    expect(screen.getByText('5 scheduled')).toBeTruthy()
  })
})

describe('a post fix', () => {
  it('names a converted post, its types, what it kept and when it publishes', async () => {
    await show({
      converted: {
        changed: 1,
        withdrawing: 0,
        skipped: [],
        posts: [
          {
            postId: 'p1',
            title: 'Spa reopening',
            fromStatus: 'scheduled',
            fromType: 'story',
            toType: 'image-post',
            kept: ['caption', 'media'],
            scheduledAt: '2026-04-17T10:00:00Z',
          },
        ],
        undoId: 'u1',
      },
    })
    expect(screen.getByText('Spa reopening')).toBeTruthy()
    expect(screen.getByText('story → image-post')).toBeTruthy()
    expect(screen.getByText('Kept caption and media')).toBeTruthy()
    expect(screen.getByText(/^Still scheduled /)).toBeTruthy()
    fireEvent.click(screen.getByText('UNDO'))
    expect(undo).toHaveBeenCalledWith('campaign:c1', 't1', 'u1')
  })

  it('says an unscheduled post’s status now, and a withdrawal can’t be undone', async () => {
    await show({
      unscheduled: {
        changed: 1,
        withdrawing: 1,
        skipped: [{ postId: 'p9', reason: 'it is published' }],
        posts: [
          {
            postId: 'p1',
            title: 'Spa reopening',
            fromStatus: 'scheduled',
            toStatus: 'ready_for_publish',
            wasAt: '2026-04-17T10:00:00Z',
            kept: [],
          },
        ],
      },
    })
    expect(screen.getByText('Unscheduled')).toBeTruthy()
    expect(screen.getByText('Back to Ready for Publish')).toBeTruthy()
    expect(screen.getByText(/^Was /)).toBeTruthy()
    expect(
      screen.getByText(/withdrawn from publishing\. It keeps its date/),
    ).toBeTruthy()
    expect(screen.getByText('Left as it was: it is published')).toBeTruthy()
  })
})

describe('a rewritten post (CON-474)', () => {
  it('says it was kept as a version, and cites the post’s own sources', async () => {
    await show({
      revised: {
        postId: 'p1',
        revised: true,
        versioned: true,
        grounding: {
          mode: 'grounded',
          sources: [{ id: 'a1', title: 'Brochure', ideaId: 'i1' }],
        },
      },
    })
    expect(screen.getByText('Post rewritten')).toBeTruthy()
    expect(
      screen.getByText('The old one stays in the post’s versions'),
    ).toBeTruthy()
    expect(
      screen.getByRole('link', { name: 'Brochure' }).getAttribute('href'),
    ).toBe('/assets/a1')
  })

  it('names the post and its voice, with OPEN and UNDO (CON-477)', async () => {
    await show({
      revised: {
        postId: 'p1',
        campaignId: 'c1',
        title: 'Chef’s table',
        voiceName: 'Warm host',
        undoId: 'u9',
        revised: true,
        versioned: true,
      },
    })
    expect(screen.getByText('Chef’s table')).toBeTruthy()
    expect(screen.getByText('rewritten')).toBeTruthy()
    expect(screen.getByText('A new version, in Warm host')).toBeTruthy()
    expect(screen.getByText('OPEN').getAttribute('href')).toBe(
      '/campaigns/c1/posts/p1',
    )
    expect(screen.getByText('UNDO')).toBeTruthy()
  })

  it('warns when no version was kept, and says nothing of sources it never knew', async () => {
    await show({ revised: { postId: 'p1', revised: true, versioned: false } })
    expect(screen.getByText(/history has no copy of it/)).toBeTruthy()
    expect(screen.queryByText('Sources')).toBeNull()
  })

  it('marks a post that was never grounded', async () => {
    await show({
      revised: {
        postId: 'p1',
        revised: true,
        versioned: true,
        grounding: { mode: 'exploratory', sources: [] },
      },
    })
    expect(screen.getByText('Not grounded')).toBeTruthy()
  })
})

describe('in Spanish', () => {
  afterAll(async () => {
    await i18next.changeLanguage('en')
  })

  it('words the review', async () => {
    await loadLocaleResources('es')
    await i18next.changeLanguage('es')
    await show({
      review: { ...review, postsChecked: 0, findings: [] },
    })
    expect(
      screen.getByText('El brief y las publicaciones coinciden'),
    ).toBeTruthy()
    expect(screen.queryByText('The brief and the posts agree')).toBeNull()
  })

  it('words a rewritten post', async () => {
    await loadLocaleResources('es')
    await i18next.changeLanguage('es')
    await show({ revised: { postId: 'p1', revised: true, versioned: true } })
    expect(screen.getByText('Publicación reescrita')).toBeTruthy()
    expect(screen.queryByText('Post rewritten')).toBeNull()
  })

  it('words the findings’ headline and footer', async () => {
    await loadLocaleResources('es')
    await i18next.changeLanguage('es')
    await findings()
    expect(screen.getByText('1 impide publicar')).toBeTruthy()
    expect(screen.getByText('REVISAR DE NUEVO')).toBeTruthy()
    expect(screen.queryByText('CHECK AGAIN')).toBeNull()
  })
})
