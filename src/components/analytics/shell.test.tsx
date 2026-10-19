import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { SectionCard } from './shell'

/**
 * The line under a card's heading saying which controls above it do not reach
 * it.
 *
 * This is the whole defence of a dashboard whose cards obey different scopes:
 * the period does not reach the lessons card. A card that quietly ignored a
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
})
