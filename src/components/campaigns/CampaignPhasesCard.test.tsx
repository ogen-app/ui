import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { i18next, loadLocaleResources } from '@/i18n'
import type { CampaignPhasePlan, CampaignPhaseWindow } from '@/types/campaigns'
import { CampaignPhasesCard } from './CampaignPhasesCard'

/**
 * What the phase card offers in each state of the plan (CON-166). The hooks
 * are mocked: the windows are the server's answer and the card only decides
 * which of them may be moved, so the states under test are plans, not fetches.
 */

const hooks = vi.hoisted(() => ({
  plan: undefined as CampaignPhasePlan | undefined,
  save: vi.fn(),
  reset: vi.fn(),
}))

vi.mock('@/hooks/useCampaigns', () => ({
  useCampaignPhases: () => ({ data: hooks.plan, isError: false }),
  useSavePhasePlan: () => ({ mutate: hooks.save, isPending: false }),
  useResetPhasePlan: () => ({ mutate: hooks.reset, isPending: false }),
}))

function phase(
  id: string,
  start: string | null,
  end: string | null,
  post_count = 0,
): CampaignPhaseWindow {
  return {
    phase_id: id,
    sequence: 0,
    name: `Phase ${id}`,
    purpose: `Why ${id}`,
    start_date: start,
    end_date: end,
    post_count,
  }
}

function plan(
  source: CampaignPhasePlan['source'],
  phases: CampaignPhaseWindow[],
): CampaignPhasePlan {
  return {
    campaign_id: 'c1',
    campaign_type_id: 't1',
    source,
    type_locked: false,
    phases,
  }
}

const DATED = [
  phase('a', '2026-10-01', '2026-10-16', 2),
  phase('b', '2026-10-17', '2026-10-31'),
]

function boundaries() {
  return screen.queryAllByRole('group', { name: /^When Phase .* ends$/ })
}

afterEach(() => {
  hooks.save.mockReset()
  hooks.reset.mockReset()
})

describe('CampaignPhasesCard', () => {
  it('states each window and offers the boundary between two phases', () => {
    hooks.plan = plan('derived', DATED)
    render(<CampaignPhasesCard campaignId="c1" pending={null} />)

    expect(screen.getByText('Oct 1 – Oct 16')).toBeInTheDocument()
    expect(screen.getByText('16 days · 2 posts')).toBeInTheDocument()
    expect(screen.getByText('15 days · 0 posts')).toBeInTheDocument()
    // Only the first phase has a boundary after it.
    expect(boundaries()).toHaveLength(1)
    expect(
      screen.getByText('Split evenly across the campaign dates.'),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Split evenly again' }),
    ).not.toBeInTheDocument()
  })

  it('moves the boundary as a whole, contiguous plan', async () => {
    hooks.plan = plan('derived', DATED)
    render(<CampaignPhasesCard campaignId="c1" pending={null} />)

    await userEvent.click(within(boundaries()[0]).getByRole('button'))
    await userEvent.click(await screen.findByRole('button', { name: /20th/ }))

    expect(hooks.save).toHaveBeenCalledWith([
      { phase_id: 'a', start_date: '2026-10-01', end_date: '2026-10-20' },
      { phase_id: 'b', start_date: '2026-10-21', end_date: '2026-10-31' },
    ])
  })

  it('offers the even split back once the dates were set by hand', async () => {
    hooks.plan = plan('manual', DATED)
    render(<CampaignPhasesCard campaignId="c1" pending={null} />)

    expect(screen.getByText('Dates set by hand.')).toBeInTheDocument()
    await userEvent.click(
      screen.getByRole('button', { name: 'Split evenly again' }),
    )
    expect(hooks.reset).toHaveBeenCalled()
  })

  it('lists the phases without dates on an unscheduled campaign', () => {
    hooks.plan = plan('unscheduled', [
      phase('a', null, null),
      phase('b', null, null),
    ])
    render(<CampaignPhasesCard campaignId="c1" pending={null} />)

    expect(screen.getByText('Phase a')).toBeInTheDocument()
    expect(boundaries()).toHaveLength(0)
    expect(
      screen.getByText('Set a start and end date to see when each phase runs.'),
    ).toBeInTheDocument()
  })

  it('refuses to split a campaign shorter than its phases', () => {
    hooks.plan = plan('derived', [
      phase('a', '2026-10-01', '2026-10-02'),
      phase('b', '2026-10-01', '2026-10-02'),
      phase('c', '2026-10-01', '2026-10-02'),
    ])
    render(<CampaignPhasesCard campaignId="c1" pending={null} />)

    expect(boundaries()).toHaveLength(0)
    expect(
      screen.getByText(
        "The campaign is shorter than its 3 phases, so they can't be split.",
      ),
    ).toBeInTheDocument()
  })

  it('holds editing while the page has unsaved dates or type', () => {
    hooks.plan = plan('manual', DATED)
    const { rerender } = render(
      <CampaignPhasesCard campaignId="c1" pending="dates" />,
    )
    expect(boundaries()).toHaveLength(0)
    expect(
      screen.queryByRole('button', { name: 'Split evenly again' }),
    ).not.toBeInTheDocument()
    expect(
      screen.getByText('Save the new dates to re-plan the phases.'),
    ).toBeInTheDocument()

    rerender(<CampaignPhasesCard campaignId="c1" pending="type" />)
    expect(
      screen.getByText('Save the new type to see its phases.'),
    ).toBeInTheDocument()
  })

  it('renders from the catalogue in Spanish', async () => {
    await loadLocaleResources('es')
    await i18next.changeLanguage('es')
    try {
      hooks.plan = plan('manual', DATED)
      render(<CampaignPhasesCard campaignId="c1" pending={null} />)

      expect(screen.getByText('Fases')).toBeInTheDocument()
      expect(screen.getByText('16 días · 2 publicaciones')).toBeInTheDocument()
      expect(screen.getByText('Fechas fijadas a mano.')).toBeInTheDocument()
      expect(screen.queryByText('Dates set by hand.')).not.toBeInTheDocument()
      expect(screen.queryByText(/days/)).not.toBeInTheDocument()
    } finally {
      await i18next.changeLanguage('en')
    }
  })
})
