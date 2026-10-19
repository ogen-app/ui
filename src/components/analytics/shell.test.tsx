import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { SectionCard } from './shell'

/**
 * The line under a card's heading saying which controls above it do not reach
 * it.
 *
 * This is the whole defence of a dashboard whose cards obey different scopes:
 * the period does not reach the lessons card, and on a campaign's page neither
 * does the campaign. A card that quietly ignored a
 * control above it would be worse than not offering the control.
 */

describe('SectionCard scope note', () => {
  it('says nothing when the controls above reach the card', () => {
    const { container } = render(
      <SectionCard title="What happened">
        <p>figures</p>
      </SectionCard>,
    )

    expect(container.querySelector('header p')).toBeNull()
  })

  it('disclaims the period', () => {
    render(
      <SectionCard title="What we've learned" scope="all-time">
        <p>lessons</p>
      </SectionCard>,
    )

    expect(
      screen.getByText('All time — not affected by the period above'),
    ).toBeInTheDocument()
  })

  it('disclaims the campaign as well as the period, in one line', () => {
    // On a campaign's page the lessons card is the workspace's (CON-288): the
    // server refuses a campaign there, so the card names both things above it
    // that it ignores rather than stacking two notes.
    render(
      <SectionCard title="What we've learned" scope="all-time" wholeWorkspace>
        <p>lessons</p>
      </SectionCard>,
    )

    expect(
      screen.getByText(
        'All time, across the whole workspace — not narrowed to this campaign or the period above',
      ),
    ).toBeInTheDocument()
  })
})
