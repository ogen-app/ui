import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { MeasureTile } from './MeasureTile'
import type { MeasureReading } from './types'

/**
 * The one thing a period tile says about its own scope: on a campaign's page
 * the followers figure is the whole workspace's (CON-288), and a bare count
 * there would read as the campaign's audience.
 */

const FOLLOWERS: MeasureReading = {
  measure: 'followers',
  value: 5120,
  previous: 5000,
  expected: null,
  series: [],
}

describe('MeasureTile', () => {
  it('says a figure counts the whole workspace when it does', () => {
    render(
      <MeasureTile
        reading={{ ...FOLLOWERS, wholeWorkspace: true }}
        comparedTo={null}
      />,
    )

    expect(screen.getByText('Whole workspace')).toBeInTheDocument()
  })

  it('says nothing about scope on an ordinary reading', () => {
    render(<MeasureTile reading={FOLLOWERS} comparedTo={null} />)

    expect(screen.queryByText('Whole workspace')).toBeNull()
  })
})
