import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { SectionCard } from './shell'

/**
 * The line under a card's heading saying which controls above it do not reach
 * it.
 *
 * This is the whole defence of a dashboard whose three cards obey three
 * different scopes: the period does not reach the lessons card, and the
 * platform filter reaches only the board. A card that quietly ignored a control
 * above it would be worse than not offering the control.
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

  it('disclaims the filter on a card that does obey the period', () => {
    render(
      <SectionCard title="What happened" everyPlatform>
        <p>figures</p>
      </SectionCard>,
    )

    expect(
      screen.getByText('Every platform — not affected by the filter above'),
    ).toBeInTheDocument()
  })

  it('disclaims both in one sentence', () => {
    render(
      <SectionCard title="What we've learned" scope="all-time" everyPlatform>
        <p>lessons</p>
      </SectionCard>,
    )

    // One line, not two stacked footnotes — that would put more type under the
    // heading than the heading.
    expect(
      screen.getByText(
        'All time and every platform — not affected by the controls above',
      ),
    ).toBeInTheDocument()
  })
})
