import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '@/test/renderWithProviders'
import { i18next, loadLocaleResources } from '@/i18n'
import type { IdeaBody } from '@/services/api/ideas'
import type { AssetAnalysis } from '@/types/assetAnalysis'
import { InsightsPanel, type PanelState } from './InsightsPanel'

const verdicts = vi.hoisted(() => ({ fn: vi.fn() }))
vi.mock('@/services/api/ideas', async (actual) => ({
  ...(await actual<typeof import('@/services/api/ideas')>()),
  setIdeaVerdict: verdicts.fn,
}))

const idea = (n: number, over: Partial<IdeaBody> = {}): IdeaBody => ({
  id: `i${n}`,
  title: `Idea ${n}`,
  note: `Angle ${n}\n\nWhy ${n} fits\n\nSources: p. ${n}`,
  campaign_id: null,
  verdict: null,
  created_at: '2026-10-12T10:00:00Z',
  created_by: null,
  decided_at: null,
  decided_by: null,
  remind_at: null,
  origin: 'asset_analysis',
  ...over,
})

const lens = (over: Partial<AssetAnalysis> = {}): AssetAnalysis => ({
  id: 'an-1',
  asset_id: 'a1',
  campaign_id: 'c1',
  campaign_name: 'Spring launch',
  status: 'ready',
  strategy: 'full',
  summary: 'First paragraph.\n\nSecond paragraph.',
  language: 'en',
  key_points: ['Point one'],
  topics: ['video'],
  entities: [{ name: 'Acme', kind: 'org' }],
  relevance: { score: 88, why: 'Settles the launch date.' },
  partial_source: false,
  truncated: false,
  failure_code: '',
  failure_reason: '',
  analyzed_at: '2026-10-12T10:00:00Z',
  ideas: [],
  ...over,
})

function renderPanel(
  state: PanelState,
  l: AssetAnalysis | undefined,
  onRetry = () => {},
) {
  return renderWithProviders(
    <InsightsPanel state={state} lens={l} onRetry={onRetry} retrying={false} />,
  )
}

describe('InsightsPanel', () => {
  it('reads a campaign lens: fit, a summary at rest, mentions by kind', async () => {
    await renderPanel('ready', lens({ ideas: [idea(1), idea(2)] }))
    expect(screen.getByText('Read for Spring launch')).toBeInTheDocument()
    expect(screen.getByText('Settles the launch date.')).toBeInTheDocument()
    // At rest: the lead paragraph only, the rest a click away.
    expect(screen.getByText('First paragraph.')).toBeInTheDocument()
    expect(screen.queryByText('Second paragraph.')).not.toBeInTheDocument()
    expect(screen.queryByText('Point one')).not.toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: '2 post ideas' }),
    ).toBeInTheDocument()
    // Mentions are text, grouped under their kind — no tooltip.
    expect(screen.getByText('Organisations')).toBeInTheDocument()
    expect(screen.getByText('Acme')).not.toHaveAttribute('title')
  })

  it('reads the full summary in place, and folds it back', async () => {
    await renderPanel('ready', lens())
    const more = screen.getByRole('button', { name: /Read the full summary/ })
    expect(more).toHaveAttribute('aria-expanded', 'false')
    fireEvent.click(more)
    expect(screen.getByText('Second paragraph.')).toBeInTheDocument()
    expect(screen.getByText('Point one')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /Show less/ }))
    expect(screen.queryByText('Second paragraph.')).not.toBeInTheDocument()
  })

  it('offers no "read more" when the lead already says everything', async () => {
    await renderPanel('ready', lens({ summary: 'Short.', key_points: [] }))
    expect(
      screen.queryByRole('button', { name: /Read the full summary/ }),
    ).not.toBeInTheDocument()
  })

  it('shows five ideas, hides the ones answered no, and opens one in place', async () => {
    const ideas = [
      ...Array.from({ length: 7 }, (_, i) => idea(i + 1)),
      idea(8, { verdict: 'no' }),
    ]
    await renderPanel('ready', lens({ ideas }))
    expect(
      screen.getByRole('heading', { name: '7 post ideas' }),
    ).toBeInTheDocument()
    expect(screen.getByText('Idea 5')).toBeInTheDocument()
    expect(screen.queryByText('Idea 6')).not.toBeInTheDocument()
    expect(screen.queryByText('Idea 8')).not.toBeInTheDocument()

    fireEvent.click(screen.getByText('Show 2 more ideas'))
    expect(screen.getByText('Idea 7')).toBeInTheDocument()
    expect(screen.queryByText('Idea 8')).not.toBeInTheDocument()

    expect(screen.queryByText('Why 1 fits')).not.toBeInTheDocument()
    fireEvent.click(screen.getByText('Idea 1'))
    expect(screen.getByText('Why 1 fits')).toBeInTheDocument()
    expect(screen.getByText('Open in Ideas')).toBeInTheDocument()
  })

  it('narrows the ideas to a verdict pile, the answered-no ones included', async () => {
    await renderPanel(
      'ready',
      lens({
        ideas: [
          idea(1),
          idea(2),
          idea(3, { verdict: 'yes' }),
          idea(4, { verdict: 'no' }),
        ],
      }),
    )
    const no = screen.getByRole('button', { name: '1 Set aside' })
    expect(
      screen.getByRole('button', { name: '2 On the desk' }),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: /In the drawer/ }),
    ).not.toBeInTheDocument()
    expect(screen.queryByText('Idea 4')).not.toBeInTheDocument()

    fireEvent.click(no)
    expect(await screen.findByText('Idea 4')).toBeInTheDocument()
    expect(screen.queryByText('Idea 1')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: '1 Set aside' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )

    fireEvent.click(screen.getByRole('button', { name: '1 Set aside' }))
    expect(await screen.findByText('Idea 1')).toBeInTheDocument()
    expect(screen.queryByText('Idea 4')).not.toBeInTheDocument()
  })

  it('says so when a lens distilled nothing', async () => {
    await renderPanel('ready', lens({ ideas: [] }))
    expect(screen.getByText('No ideas from this one')).toBeInTheDocument()
  })

  it('names the lens it is waiting on', async () => {
    await renderPanel('analysing', lens({ status: 'running' }))
    expect(screen.getByText('Analysing for Spring launch')).toBeInTheDocument()
  })

  it('explains a failure by its code and retries it', async () => {
    const onRetry = vi.fn()
    await renderPanel(
      'failed',
      lens({ status: 'failed', failure_code: 'model_unavailable' }),
      onRetry,
    )
    expect(
      screen.getByText('The analysis model could not be reached.'),
    ).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /try again/i }))
    expect(onRetry).toHaveBeenCalledOnce()
  })

  it('treats the plan gate as a plan question, not an error', async () => {
    await renderPanel(
      'notInPlan',
      lens({ status: 'skipped', failure_code: 'entitlement_disabled' }),
    )
    expect(
      screen.getByText('Asset insights aren’t included in your plan.'),
    ).toBeInTheDocument()
    expect(screen.getByText('See plans')).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: /try again/i }),
    ).not.toBeInTheDocument()
  })

  it('asks for writing on an empty note, and opens Source', async () => {
    const onOpenSource = vi.fn()
    await renderWithProviders(
      <InsightsPanel
        state="empty"
        lens={lens({ summary: '' })}
        authored
        onOpenSource={onOpenSource}
        onRetry={() => {}}
        retrying={false}
      />,
    )
    expect(screen.getByText('Nothing to read yet')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /start writing/i }))
    expect(onOpenSource).toHaveBeenCalled()
  })

  it('says a file had no text, without asking for writing', async () => {
    await renderPanel('empty', lens({ summary: '' }))
    expect(screen.getByText('No text to analyse')).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: /start writing/i }),
    ).not.toBeInTheDocument()
  })

  it('offers to analyse a never-analysed asset now', async () => {
    const onRetry = vi.fn()
    await renderPanel('none', undefined, onRetry)
    fireEvent.click(screen.getByRole('button', { name: /analyse now/i }))
    expect(onRetry).toHaveBeenCalledOnce()
  })

  it('draws a Markdown heading as a heading, not as hashes', async () => {
    await renderPanel(
      'ready',
      lens({ summary: '## Small models **win**\n\nThe position.' }),
    )
    fireEvent.click(
      screen.getByRole('button', { name: /Read the full summary/ }),
    )
    expect(
      screen.getByRole('heading', { name: 'Small models win' }),
    ).toBeInTheDocument()
    expect(screen.getByText('win').tagName).toBe('STRONG')
    expect(screen.queryByText(/##/)).not.toBeInTheDocument()
  })

  it('tracks the steps while the file is read', async () => {
    await renderPanel('reading', undefined)
    expect(screen.getByText('Extract text')).toBeInTheDocument()
    expect(screen.getByText('Distil ideas')).toBeInTheDocument()
  })

  it('keeps a reading on screen while it is read again', async () => {
    await renderPanel('ready', lens({ status: 'running' }))
    expect(screen.getByText(/Re-reading for Spring launch/)).toBeInTheDocument()
    expect(screen.getByText('First paragraph.')).toBeInTheDocument()
  })

  it('reads the summary as light Markdown', async () => {
    await renderPanel(
      'ready',
      lens({ summary: 'Lead with **the chart**.\n\n- one\n- two' }),
    )
    // The lead keeps its own marks at rest.
    expect(screen.getByText('the chart').tagName).toBe('STRONG')
    fireEvent.click(
      screen.getByRole('button', { name: /Read the full summary/ }),
    )
    expect(screen.getByText('two').tagName).toBe('LI')
  })

  it('shows page references only in an opened idea, merged and sorted', async () => {
    await renderPanel(
      'ready',
      lens({
        ideas: [
          idea(1, { note: 'Angle\n\nWhy\n\nSources: pp. 57–59, pp. 55–57' }),
        ],
      }),
    )
    expect(screen.queryByText('pp. 55–59')).not.toBeInTheDocument()
    fireEvent.click(screen.getByText('Idea 1'))
    expect(screen.getByText('pp. 55–59')).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: /^Reference\s*·\s*pages 55–59$/ }),
    ).toBeInTheDocument()
  })

  it('orders the ideas best fit first, each with its score and verdict', async () => {
    await renderPanel(
      'ready',
      lens({
        ideas: [
          idea(1, { fit_score: 41 }),
          idea(2),
          idea(3, { fit_score: 88, verdict: 'yes' }),
        ],
      }),
    )
    const titles = screen
      .getAllByRole('button', { expanded: false })
      .map((b) => b.textContent ?? '')
      .filter((text) => /Idea \d/.test(text))
    expect(titles[0]).toContain('Idea 3')
    expect(titles[1]).toContain('Idea 1')
    expect(titles[2]).toContain('Idea 2')
    expect(
      screen.getByRole('img', { name: 'Fit 88 of 100' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Not scored' })).toBeInTheDocument()
    // On the desk has a mark now, not only the answered.
    expect(screen.getAllByRole('img', { name: 'On the desk' })).toHaveLength(2)
    expect(screen.getByRole('img', { name: 'Making' })).toBeInTheDocument()
  })

  it('explains the score, heaviest criterion first, in an opened idea', async () => {
    await renderPanel(
      'ready',
      lens({
        ideas: [
          idea(1, {
            fit_score: 78,
            fit_breakdown: {
              lens: 'campaign',
              campaign_id: 'c1',
              caps: [],
              criteria: {
                timeliness: { level: 1, why: 'Window ended.' },
                message_fit: { level: 4, why: 'Serves the message.' },
                phase_fit: {
                  level: 4,
                  why: 'Widens the story.',
                  phase: 'Launch',
                },
              },
            },
          }),
        ],
      }),
    )
    fireEvent.click(screen.getByText('Idea 1'))
    expect(
      screen.getByRole('heading', {
        name: /^Why it scores 78\s*·\s*for Spring launch$/,
      }),
    ).toBeInTheDocument()
    const ratings = screen
      .getAllByRole('img')
      .map((img) => img.getAttribute('aria-label'))
      .filter((name) => name?.includes(' of 5'))
    expect(ratings).toEqual([
      'Key message: 4 of 5',
      'Campaign phase: 4 of 5',
      'Timing: 1 of 5',
    ])
    expect(screen.getByText('Launch')).toBeInTheDocument()
  })

  it('answers an idea in place, and asks when for the drawer', async () => {
    verdicts.fn.mockReset().mockResolvedValue(undefined)
    await renderPanel('ready', lens({ ideas: [idea(1), idea(2)] }))
    fireEvent.click(screen.getByText('Idea 1'))
    const group = screen.getByRole('group', { name: 'Answer this idea' })

    await userEvent.click(within(group).getByRole('button', { name: /Making/ }))
    expect(verdicts.fn).toHaveBeenCalledWith('i1', 'yes', null)

    await userEvent.click(
      within(group).getByRole('button', { name: /In the drawer/ }),
    )
    await userEvent.click(
      await screen.findByRole('menuitem', { name: 'Ask me in a week' }),
    )
    expect(verdicts.fn).toHaveBeenLastCalledWith(
      'i1',
      'later',
      expect.any(String),
    )
  })

  it('holds the answer still while one is on its way', async () => {
    let settle: (value?: unknown) => void = () => {}
    verdicts.fn
      .mockReset()
      .mockImplementationOnce(
        () => new Promise((resolve) => (settle = resolve)),
      )
      .mockResolvedValue(undefined)
    await renderPanel('ready', lens({ ideas: [idea(1)] }))
    fireEvent.click(screen.getByText('Idea 1'))
    const group = screen.getByRole('group', { name: 'Answer this idea' })

    await userEvent.click(within(group).getByRole('button', { name: /Making/ }))
    expect(
      within(group).getByRole('button', { name: /^Set aside$/ }),
    ).toBeDisabled()
    fireEvent.click(within(group).getByRole('button', { name: /^Set aside$/ }))
    expect(verdicts.fn).toHaveBeenCalledTimes(1)

    settle()
    await waitFor(() =>
      expect(
        within(group).getByRole('button', { name: /^Set aside$/ }),
      ).not.toBeDisabled(),
    )
  })

  it("names an answered idea's verdict and offers the way back", async () => {
    verdicts.fn.mockReset().mockResolvedValue(undefined)
    await renderPanel(
      'ready',
      lens({
        ideas: [
          idea(1, { verdict: 'yes', decided_at: '2026-10-14T10:00:00Z' }),
        ],
      }),
    )
    fireEvent.click(screen.getByText('Idea 1'))
    expect(
      screen.getByRole('button', { name: /Making/, pressed: true }),
    ).toBeInTheDocument()
    await userEvent.click(
      screen.getByRole('button', { name: 'Put it back on the desk' }),
    )
    expect(verdicts.fn).toHaveBeenCalledWith('i1', null, null)
  })
})

describe('InsightsPanel in Spanish', () => {
  beforeAll(async () => {
    await loadLocaleResources('es')
    await i18next.changeLanguage('es')
  })
  afterAll(async () => {
    await i18next.changeLanguage('en')
  })

  it('reads the breakdown, the reference and the answer from the catalogue', async () => {
    await renderPanel(
      'ready',
      lens({
        ideas: [
          idea(1, {
            fit_score: 78,
            fit_breakdown: {
              lens: 'campaign',
              campaign_id: 'c1',
              caps: ['off_brief'],
              criteria: { message_fit: { level: 4, why: 'Sirve.' } },
            },
          }),
        ],
      }),
    )
    fireEvent.click(screen.getByText('Idea 1'))
    expect(screen.getByText('Por qué puntúa 78')).toBeInTheDocument()
    expect(screen.getByText('Mensaje clave')).toBeInTheDocument()
    expect(
      screen.getByText('Limitada: va contra el brief.'),
    ).toBeInTheDocument()
    expect(screen.getByText('Referencia')).toBeInTheDocument()
    expect(
      screen.getByRole('group', { name: 'Responder a esta idea' }),
    ).toBeInTheDocument()
    // The English a literal would have left behind.
    expect(screen.queryByText(/Why it scores/)).not.toBeInTheDocument()
    expect(screen.queryByText('Key message')).not.toBeInTheDocument()
  })
})
