import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { WorkspaceOverviewView } from './WorkspaceOverview'

/**
 * The four ways the workspace overview withdraws.
 *
 * Worth pinning as a set rather than one by one, because the distinction
 * between them is the whole point: "nothing is switched on", "nothing has been
 * published", and "the request failed" send the reader somewhere different, and
 * all three look identical if one of them silently falls through to another.
 *
 * The live state is not asserted here — the card itself is `NowSection`, which
 * the campaign surface already covers, and what feeds it is covered in
 * `lib/analyticsOverviewView.test.ts`.
 */

const SETTLED = {
  isPending: false,
  isError: false,
  isUnavailable: false,
  isEmpty: false,
  platforms: [] as readonly string[],
}

describe('WorkspaceOverviewView', () => {
  it('spins only while the answer is genuinely on its way', () => {
    const { container } = render(
      <WorkspaceOverviewView {...SETTLED} isPending />,
    )

    expect(container.querySelector('.animate-pulse')).not.toBeNull()
  })

  it('explains a workspace that is not measuring anything', () => {
    render(<WorkspaceOverviewView {...SETTLED} isUnavailable />)

    expect(
      screen.getByText(/Nothing is being measured for this workspace/i),
    ).toBeInTheDocument()
  })

  it('tells a wired-up workspace that has published nothing apart from a fault', () => {
    render(<WorkspaceOverviewView {...SETTLED} isEmpty />)

    expect(screen.getByText(/Nothing measured yet/i)).toBeInTheDocument()
    // Not the setup explanation — this workspace is set up.
    expect(screen.queryByText(/isn't switched on/i)).toBeNull()
  })

  it('says which platforms had nothing, when the filter narrowed it', () => {
    // Narrowed, `no_data` means nothing on these platforms. "Once this
    // workspace starts publishing" would be false, and send the reader looking
    // for a fault.
    render(
      <WorkspaceOverviewView
        {...SETTLED}
        isEmpty
        narrowedTo={['LinkedIn', 'Instagram']}
      />,
    )

    expect(
      screen.getByText('Nothing measured on LinkedIn and Instagram'),
    ).toBeInTheDocument()
    expect(screen.queryByText(/Once this workspace starts/i)).toBeNull()
  })

  it('says a failed request is a failed request', () => {
    render(<WorkspaceOverviewView {...SETTLED} isError />)

    expect(screen.getByText(/Couldn't load analytics/i)).toBeInTheDocument()
  })

  /**
   * The state a paused or never-resolving query lands in. React Query parks a
   * retry when its online manager says the browser is offline, and a settled
   * result with no view has to explain itself rather than sit on a skeleton —
   * a card that spins forever is indistinguishable from a hung app.
   */
  it('does not spin when the query has settled without a view', () => {
    const { container } = render(<WorkspaceOverviewView {...SETTLED} />)

    expect(container.querySelector('.animate-pulse')).toBeNull()
    expect(screen.getByText(/Couldn't load analytics/i)).toBeInTheDocument()
  })
})
