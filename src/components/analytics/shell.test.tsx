import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ScopeNote } from './shell'

/**
 * The line opening a card's body saying which controls above it do not reach
 * it.
 *
 * This is the whole defence of a dashboard whose cards obey different scopes:
 * the period does not reach the lessons card. A card that quietly ignored a
 * control above it would be worse than not offering the control.
 */

describe('ScopeNote', () => {
  it('says nothing when the controls above reach the card', () => {
    const { container } = render(<ScopeNote scope="lens" />)

    expect(container).toBeEmptyDOMElement()
  })

  it('disclaims the period', () => {
    render(<ScopeNote scope="all-time" />)

    expect(
      screen.getByText('All time — not affected by the period above'),
    ).toBeInTheDocument()
  })
})
