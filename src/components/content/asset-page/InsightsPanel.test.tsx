import { describe, expect, it, vi } from 'vitest'
import { fireEvent, screen } from '@testing-library/react'
import { renderWithProviders } from '@/test/renderWithProviders'
import type { IdeaBody } from '@/services/api/ideas'
import type { AssetAnalysis } from '@/types/assetAnalysis'
import { InsightsPanel, type PanelState } from './InsightsPanel'

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
  it('reads a campaign lens: fit, summary, points and mentions', async () => {
    await renderPanel('ready', lens())
    expect(screen.getByText('Read for Spring launch')).toBeInTheDocument()
    expect(screen.getByText('Settles the launch date.')).toBeInTheDocument()
    expect(screen.getByText('Second paragraph.')).toBeInTheDocument()
    expect(screen.getByText('Point one')).toBeInTheDocument()
    expect(screen.getByText('Acme')).toBeInTheDocument()
    expect(screen.getByText('Ideas for Spring launch')).toBeInTheDocument()
  })

  it('shows five ideas, hides the ones answered no, and opens one in place', async () => {
    const ideas = [
      ...Array.from({ length: 7 }, (_, i) => idea(i + 1)),
      idea(8, { verdict: 'no' }),
    ]
    await renderPanel('ready', lens({ ideas }))
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

  it('tracks the steps while the file is read', async () => {
    await renderPanel('reading', undefined)
    expect(screen.getByText('Extract text')).toBeInTheDocument()
    expect(screen.getByText('Distil ideas')).toBeInTheDocument()
  })

  it('keeps a reading on screen while it is read again', async () => {
    await renderPanel('ready', lens({ status: 'running' }))
    expect(screen.getByText(/Re-reading for Spring launch/)).toBeInTheDocument()
    expect(screen.getByText('Second paragraph.')).toBeInTheDocument()
  })

  it('reads the summary as light Markdown, mentions with their kind', async () => {
    await renderPanel(
      'ready',
      lens({ summary: 'Lead with **the chart**.\n\n- one\n- two' }),
    )
    expect(screen.getByText('the chart').tagName).toBe('STRONG')
    expect(screen.getByText('two').tagName).toBe('LI')
    expect(screen.getByText('Acme')).toHaveAttribute('title', 'Organisation')
  })
})
