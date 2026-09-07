import { describe, expect, it, vi } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { renderWithProviders } from '@/test/renderWithProviders'
import { ArchivedCampaigns } from './ArchivedCampaigns'
import type { Campaign } from '@/types/campaigns'

/**
 * The drawer's visibility rules (CON-156).
 *
 * Whether the archive is *there* is the whole of this component's judgement —
 * the rows below it are the same rows they were when this was a screen of its
 * own. The hooks are mocked rather than the transport because the four states
 * being tested are query states, and driving them through a fake server would
 * be a longer way of writing the same four objects.
 */

const query = vi.hoisted(() => ({
  result: {} as {
    data?: Campaign[]
    isLoading: boolean
    isError: boolean
  },
}))

vi.mock('@/hooks/useCampaigns', () => ({
  useArchivedCampaigns: () => query.result,
  useUnarchiveCampaign: () => ({ mutate: vi.fn(), isPending: false }),
}))

function campaign(name: string): Campaign {
  return {
    id: `id-${name}`,
    name,
    archived_at: '2026-08-01T09:00:00Z',
  } as Campaign
}

function loaded(...names: string[]) {
  query.result = {
    data: names.map(campaign),
    isLoading: false,
    isError: false,
  }
}

/** The disclosure's own button — `null` when the drawer isn't rendered. */
function drawer() {
  return screen.queryByRole('button', { name: /Archived campaigns/ })
}

describe('ArchivedCampaigns', () => {
  it('is not there at all when nothing has been archived', async () => {
    // The common case, and the reason this is a drawer rather than a section:
    // an empty one is furniture that has never held anything.
    loaded()
    await renderWithProviders(<ArchivedCampaigns />)

    expect(drawer()).toBeNull()
  })

  it('stays out of the list while the answer is still in flight', async () => {
    // Rather than a row that appears and then removes itself, under a list
    // that has already painted.
    query.result = { isLoading: true, isError: false }
    await renderWithProviders(<ArchivedCampaigns />)

    expect(drawer()).toBeNull()
  })

  it('arrives closed, and opens on the click', async () => {
    loaded('Spring launch')
    await renderWithProviders(<ArchivedCampaigns />)

    const toggle = drawer()!
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    // The count is on the closed row: how much is in there is most of what
    // someone needs to decide whether to open it.
    expect(toggle).toHaveTextContent('1')

    await userEvent.click(toggle)
    expect(toggle).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByText('Spring launch')).toBeInTheDocument()
  })

  it('opens on arrival when the address asked for it', async () => {
    // Where archiving a campaign lands (`/campaigns?archived=true`): the
    // campaign has just left the list above, and has to be visibly somewhere
    // rather than apparently deleted.
    loaded('Spring launch')
    await renderWithProviders(<ArchivedCampaigns defaultOpen />)

    expect(drawer()).toHaveAttribute('aria-expanded', 'true')
  })

  it('keeps the drawer when the fetch fails', async () => {
    // The one case where hiding it would be a lie: someone who has just
    // archived a campaign would read the absence as a delete.
    query.result = { isLoading: false, isError: true }
    await renderWithProviders(<ArchivedCampaigns />)

    const toggle = drawer()
    expect(toggle).not.toBeNull()
    await userEvent.click(toggle!)
    expect(
      screen.getByText('Failed to load archived campaigns'),
    ).toBeInTheDocument()
  })
})
