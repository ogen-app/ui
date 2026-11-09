import { fireEvent, screen } from '@testing-library/react'
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { i18next, loadLocaleResources } from '@/i18n'
import { renderWithProviders } from '@/test/renderWithProviders'
import { useAssistantStore } from '@/stores/assistantStore'
import type {
  CalendarFindings,
  RepairResults as Results,
} from '@/types/assistant'
import { FindingsBlock } from './FindingsBlock'
import { RepairResults } from './RepairResults'

const confirmProposal = vi.fn(async () => {})
const ignoreFinding = vi.fn(async () => {})
const undo = vi.fn(async () => {})

beforeEach(() => {
  for (const fn of [confirmProposal, ignoreFinding, undo]) fn.mockClear()
  useAssistantStore.setState({ confirmProposal, ignoreFinding, undo })
})

const typeFinding: CalendarFindings = {
  campaignId: 'c1',
  dismissed: 0,
  findings: [
    {
      key: 'post_type_not_allowed:a',
      code: 'post_type_not_allowed',
      severity: 'warning',
      message: '2 story posts on Instagram use a dropped type',
      postIds: ['p1', 'p2'],
      fixes: [
        {
          kind: 'convert_post_type',
          title: 'Make them image-post',
          postIds: ['p1', 'p2'],
          proposalId: 'pr1',
        },
        {
          kind: 'delete',
          title: 'Delete them',
          postIds: ['p1', 'p2'],
          proposalId: 'pr2',
        },
      ],
    },
    {
      key: 'gap:b',
      code: 'gap',
      severity: 'info',
      message: 'nothing is planned from 20 Apr to 27 Apr',
      postIds: [],
      fixes: [],
    },
  ],
}

function findings(ignored: string[] = []) {
  return renderWithProviders(
    <FindingsBlock
      threadId="campaign:c1"
      turnId="t1"
      findings={typeFinding}
      ignored={ignored}
      disabled={false}
    />,
  )
}

describe('a calendar finding', () => {
  it('ignores by its key, in the campaign', async () => {
    await findings()
    fireEvent.click(screen.getAllByText('IGNORE')[1])
    expect(ignoreFinding).toHaveBeenCalledWith(
      'campaign:c1',
      't1',
      'c1',
      'gap:b',
    )
  })

  it('draws an ignored one as a line, and counts only the rest', async () => {
    await findings(['gap:b'])
    expect(screen.getByText('1 thing to look at')).toBeTruthy()
    expect(
      screen.getByText('Ignored: nothing is planned from 20 Apr to 27 Apr'),
    ).toBeTruthy()
  })

  it('asks before a delete runs, naming how many', async () => {
    await findings()
    fireEvent.click(screen.getByText('or Delete them'))
    expect(confirmProposal).not.toHaveBeenCalled()
    expect(
      screen.getByText('Delete these 2 posts? Nothing brings them back.'),
    ).toBeTruthy()
    fireEvent.click(screen.getByText('DELETE 2 POSTS'))
    expect(confirmProposal).toHaveBeenCalledWith('campaign:c1', 'pr2')
  })

  it('runs any other fix on the click', async () => {
    await findings()
    fireEvent.click(screen.getByText('Make them image-post'))
    expect(confirmProposal).toHaveBeenCalledWith('campaign:c1', 'pr1')
  })
})

function show(results: Results, undoStates = {}) {
  return renderWithProviders(
    <RepairResults
      threadId="campaign:c1"
      turnId="t1"
      results={results}
      undoStates={undoStates}
      disabled={false}
    />,
  )
}

describe('the review', () => {
  it('offers each finding’s own fixes, and IGNORE', async () => {
    await show({
      review: {
        campaignId: 'c1',
        postsChecked: 4,
        dismissed: 0,
        findings: [
          {
            kind: 'post',
            key: 'post_drift:1',
            severity: 'high',
            label: 'Late check-out',
            postId: 'p2',
            issue: 'Promises free parking.',
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
      },
    })
    expect(screen.getByText('1 thing drifts from the brief')).toBeTruthy()
    expect(screen.getByText('4 posts read')).toBeTruthy()
    expect(screen.getByText('01').className).toContain('text-warning')
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
  })
})

describe('the optimise plan', () => {
  it('lists the moves and the scheduled posts that stay', async () => {
    await show({
      plan: {
        campaignId: 'c1',
        proposalId: 'pr5',
        moves: [
          {
            postId: 'p1',
            title: 'Spa reopening',
            from: '2026-04-17',
            to: '2026-04-14',
          },
        ],
        locked: [{ postId: 'p3', title: 'Thermal pool', date: '2026-04-15' }],
      },
    })
    expect(screen.getByText('Move 1 post')).toBeTruthy()
    expect(screen.getByText('1 scheduled post stays')).toBeTruthy()
    expect(screen.getByText('Fri, Apr 17 → Tue, Apr 14')).toBeTruthy()
    expect(screen.getByText('Stays Wed, Apr 15')).toBeTruthy()
  })
})

describe('a post fix', () => {
  it('undoes a conversion, and says a withdrawal can’t be', async () => {
    await show({
      converted: { changed: 2, withdrawing: 0, skipped: [], undoId: 'u1' },
      unscheduled: {
        changed: 1,
        withdrawing: 1,
        skipped: [{ postId: 'p9', reason: 'it is published' }],
      },
    })
    expect(screen.getByText('2 posts changed type')).toBeTruthy()
    expect(screen.getAllByText('UNDO')).toHaveLength(1)
    fireEvent.click(screen.getByText('UNDO'))
    expect(undo).toHaveBeenCalledWith('campaign:c1', 't1', 'u1')
    expect(
      screen.getByText(/withdrawn from publishing\. It keeps its date/),
    ).toBeTruthy()
    expect(screen.getByText('Left as it was: it is published')).toBeTruthy()
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
      review: { campaignId: 'c1', postsChecked: 0, dismissed: 0, findings: [] },
    })
    expect(
      screen.getByText('El brief y las publicaciones coinciden'),
    ).toBeTruthy()
    expect(screen.queryByText('The brief and the posts agree')).toBeNull()
  })

  it('asks before a delete in Spanish', async () => {
    await loadLocaleResources('es')
    await i18next.changeLanguage('es')
    await findings()
    fireEvent.click(screen.getByText('o Delete them'))
    expect(
      screen.getByText('¿Eliminar estas 2 publicaciones? Nada las recupera.'),
    ).toBeTruthy()
    expect(screen.getByText('ELIMINAR 2 PUBLICACIONES')).toBeTruthy()
  })
})
