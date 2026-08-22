import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'

import { SuspendedNotice } from './SuspendedNotice'
import { LockedBadge } from './LockedBadge'

describe('SuspendedNotice', () => {
  it('renders nothing for a resource that is not suspended', () => {
    const { container } = render(
      <SuspendedNotice suspension={{ suspended: false, since: null }} />,
    )
    expect(container).toBeEmptyDOMElement()
  })

  it('leads with the reassurance, not the upsell', () => {
    // The first thing a person thinks when a campaign stops accepting edits is
    // that they have lost it. A downgrade suspends and never deletes, so the
    // notice has to say so before it says anything about paying.
    render(
      <SuspendedNotice
        suspension={{ suspended: true, since: '2026-09-14T00:00:00Z' }}
        onUpgrade={() => {}}
      />,
    )

    expect(screen.getByText('Read-only')).toBeInTheDocument()
    expect(screen.getByText(/Nothing has been deleted/)).toBeInTheDocument()
    expect(screen.getByText('Read-only since September 14, 2026.')).toBeInTheDocument()
  })

  it('works without a date, which the server may not have kept', () => {
    render(<SuspendedNotice suspension={{ suspended: true, since: null }} />)

    expect(screen.getByText('Read-only')).toBeInTheDocument()
    expect(screen.queryByText(/since/)).not.toBeInTheDocument()
  })
})

describe('LockedBadge', () => {
  it('names the reason without selling anything', () => {
    // The structural rendering: it explains, and the offer waits for the moment
    // the user reaches for the feature.
    render(<LockedBadge />)

    expect(screen.getByText('Not in your plan')).toBeInTheDocument()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })
})
