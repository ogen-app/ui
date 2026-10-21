import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, screen, waitFor, within } from '@testing-library/react'
import { useEffect, useState } from 'react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '@/test/renderWithProviders'
import { i18next, loadLocaleResources } from '@/i18n'
import { EntitlementError } from '@/services/api/errors'
import type { IdeaBody } from '@/services/api/ideas'
import type { AssetAnalysis, IdeaDistillRun } from '@/types/assetAnalysis'
import { AssetIdeaList } from './AssetIdeaList'

const api = vi.hoisted(() => ({
  list: vi.fn(),
  request: vi.fn(),
  flag: { on: true },
}))
vi.mock('@/services/api/content', async (actual) => ({
  ...(await actual<typeof import('@/services/api/content')>()),
  listIdeaDistills: api.list,
  requestIdeaDistill: api.request,
}))
vi.mock('@/config/featureFlags', async (actual) => ({
  ...(await actual<typeof import('@/config/featureFlags')>()),
  useFeatureFlag: (flag: string) =>
    flag === 'idea-distill' ? api.flag.on : false,
}))

const idea = (n: number, over: Partial<IdeaBody> = {}): IdeaBody => ({
  id: `i${n}`,
  title: `Idea ${n}`,
  note: `Angle ${n}`,
  campaign_id: null,
  verdict: null,
  created_at: '2026-10-21T10:00:00Z',
  created_by: null,
  decided_at: null,
  decided_by: null,
  remind_at: null,
  origin: 'asset_analysis',
  fit_score: 70 - n,
  ...over,
})

const lens = (over: Partial<AssetAnalysis> = {}): AssetAnalysis => ({
  id: 'an-1',
  asset_id: 'a1',
  campaign_id: null,
  campaign_name: null,
  status: 'ready',
  strategy: 'full',
  summary: 'Summary.',
  language: 'en',
  key_points: [],
  topics: [],
  entities: [],
  relevance: null,
  partial_source: false,
  truncated: false,
  failure_code: '',
  failure_reason: '',
  analyzed_at: '2026-10-21T10:00:00Z',
  ideas: [idea(1), idea(2)],
  ...over,
})

const run = (over: Partial<IdeaDistillRun> = {}): IdeaDistillRun => ({
  id: 'r1',
  asset_id: 'a1',
  campaign_id: null,
  analysis_id: 'an-1',
  status: 'pending',
  focus: '',
  count: 5,
  ideas_count: 0,
  failure_code: '',
  failure_reason: '',
  created_by: null,
  created_at: '2026-10-21T10:00:00Z',
  finished_at: null,
  ...over,
})

/** The list with a lens a test can swap, as a refetch of the analyses would. */
const harness: { set: (l: AssetAnalysis) => void } = { set: () => {} }
function Harness() {
  const [current, set] = useState(lens)
  useEffect(() => {
    harness.set = set
  }, [])
  return <AssetIdeaList lens={current} />
}

const button = () => screen.getByRole('button', { name: 'Distill more ideas' })

describe('Distill more ideas (CON-398)', () => {
  beforeEach(() => {
    api.flag.on = true
    api.list.mockReset().mockResolvedValue([])
    api.request.mockReset()
  })

  it('is absent while the flag is off', async () => {
    api.flag.on = false
    await renderWithProviders(<AssetIdeaList lens={lens()} />)
    expect(screen.getByText('Idea 1')).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Distill more ideas' }),
    ).not.toBeInTheDocument()
    expect(api.list).not.toHaveBeenCalled()
  })

  it('asks for the chosen count and focus, then holds the button while it runs', async () => {
    const user = userEvent.setup()
    api.request.mockResolvedValue(
      run({ count: 8, focus: 'objections from CFOs' }),
    )
    await renderWithProviders(<AssetIdeaList lens={lens()} />)
    await user.click(
      await screen.findByRole('button', { name: 'Distill more ideas' }),
    )

    const dialog = screen.getByRole('dialog')
    // Five by default, and the commit says so.
    expect(within(dialog).getByRole('radio', { name: '5' })).toHaveAttribute(
      'aria-checked',
      'true',
    )
    await user.click(within(dialog).getByRole('radio', { name: '8' }))
    await user.type(
      within(dialog).getByLabelText('Focus (optional)'),
      'objections from CFOs',
    )
    await user.click(
      within(dialog).getByRole('button', { name: 'DISTILL 8 IDEAS' }),
    )

    expect(api.request).toHaveBeenCalledWith('a1', null, {
      count: 8,
      focus: 'objections from CFOs',
    })
    expect(
      await screen.findByText('Distilling 8 more ideas…'),
    ).toBeInTheDocument()
    expect(
      screen.getByText(/Focused on “objections from CFOs”/),
    ).toBeInTheDocument()
    expect(button()).toBeDisabled()
    expect(screen.getByText('Finding more ideas…')).toBeInTheDocument()
    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
    )
  })

  it('moves the count with the arrow keys, as a radio group does', async () => {
    const user = userEvent.setup()
    await renderWithProviders(<AssetIdeaList lens={lens()} />)
    await user.click(
      await screen.findByRole('button', { name: 'Distill more ideas' }),
    )
    const dialog = screen.getByRole('dialog')
    within(dialog).getByRole('radio', { name: '5' }).focus()
    await user.keyboard('{ArrowRight}{ArrowRight}')
    expect(within(dialog).getByRole('radio', { name: '7' })).toHaveFocus()
    expect(
      within(dialog).getByRole('button', { name: 'DISTILL 7 IDEAS' }),
    ).toBeInTheDocument()
  })

  it('refuses a focus over 300 characters before sending it', async () => {
    const user = userEvent.setup()
    await renderWithProviders(<AssetIdeaList lens={lens()} />)
    await user.click(
      await screen.findByRole('button', { name: 'Distill more ideas' }),
    )
    const dialog = screen.getByRole('dialog')
    const focus = within(dialog).getByLabelText('Focus (optional)')
    await user.click(focus)
    await user.paste('a'.repeat(301))
    expect(focus).toHaveAttribute('aria-invalid', 'true')
    expect(
      within(dialog).getByText('Focus can be at most 300 characters.'),
    ).toBeInTheDocument()
    expect(within(dialog).getByText('301 / 300')).toBeInTheDocument()
    expect(
      within(dialog).getByRole('button', { name: 'DISTILL 5 IDEAS' }),
    ).toBeDisabled()
  })

  it('picks up a run already in flight after a reload', async () => {
    api.list.mockResolvedValue([run({ status: 'running', count: 4 })])
    await renderWithProviders(<AssetIdeaList lens={lens()} />)
    expect(
      await screen.findByText('Distilling 4 more ideas…'),
    ).toBeInTheDocument()
    expect(button()).toBeDisabled()
  })

  it('waits for an analysis that is being re-read', async () => {
    await renderWithProviders(
      <AssetIdeaList lens={lens({ status: 'running' })} />,
    )
    expect(await screen.findByText('Analysis in progress')).toBeInTheDocument()
    expect(button()).toBeDisabled()
  })

  it('says when the month’s runs are used up, at the foot of the list', async () => {
    const user = userEvent.setup()
    api.request.mockRejectedValue(
      new EntitlementError(402, 'entitlement_exceeded', {
        reason: 'limit',
        feature: 'idea_distills_per_month',
        limit: 20,
        current: 20,
      }),
    )
    await renderWithProviders(<AssetIdeaList lens={lens()} />)
    await user.click(
      await screen.findByRole('button', { name: 'Distill more ideas' }),
    )
    await user.click(screen.getByRole('button', { name: 'DISTILL 5 IDEAS' }))
    expect(
      await screen.findByText('This month’s idea runs are used up.'),
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'See plans' })).toBeInTheDocument()
    expect(button()).toBeDisabled()
    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
    )
  })

  it('marks the ideas that land while the page is open, and narrows to them', async () => {
    const user = userEvent.setup()
    api.list.mockResolvedValueOnce([run({ status: 'running' })])
    const { queryClient } = await renderWithProviders(<Harness />)
    await screen.findByText('Distilling 5 more ideas…')

    // The run lands: the runs say so, and the lens carries its idea.
    api.list.mockResolvedValue([run({ status: 'ready', ideas_count: 1 })])
    act(() =>
      harness.set(
        lens({
          ideas: [
            idea(1),
            idea(2),
            idea(3, { title: 'Fresh one', distill_run_id: 'r1' }),
          ],
        }),
      ),
    )
    await queryClient.invalidateQueries({ queryKey: ['assets', 'a1'] })

    const fresh = await screen.findByRole('button', {
      name: 'Show the 1 new idea only',
    })
    expect(
      screen.queryByText('Distilling 5 more ideas…'),
    ).not.toBeInTheDocument()
    expect(
      within(screen.getByText('Fresh one')).getByRole('img', { name: 'New' }),
    ).toBeInTheDocument()
    // A run that landed says nothing at the foot: its ideas are the answer.
    expect(button()).toBeEnabled()

    await user.click(fresh)
    expect(screen.queryByText('Idea 1')).not.toBeInTheDocument()
    expect(screen.getByText('Fresh one')).toBeInTheDocument()
  })

  it('says nothing about a run that settled before this visit', async () => {
    api.list.mockResolvedValue([
      run({ status: 'failed', failure_code: 'model_unavailable' }),
    ])
    await renderWithProviders(<AssetIdeaList lens={lens()} />)
    await waitFor(() => expect(api.list).toHaveBeenCalled())
    expect(button()).toBeEnabled()
    expect(
      screen.queryByText('Couldn’t distill more ideas.'),
    ).not.toBeInTheDocument()
  })

  describe('in Spanish', () => {
    afterAll(async () => {
      await i18next.changeLanguage('en')
    })

    it('reads from the catalogue', async () => {
      await loadLocaleResources('es')
      await i18next.changeLanguage('es')
      await renderWithProviders(<AssetIdeaList lens={lens()} />)
      expect(
        await screen.findByRole('button', { name: 'Destilar más ideas' }),
      ).toBeInTheDocument()
      expect(screen.queryByText('Distill more ideas')).not.toBeInTheDocument()
    })
  })
})
