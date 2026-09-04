import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { WorkspaceScopeBar } from './WorkspaceScopeBar'

/**
 * The bar that says what the dashboard is counting.
 *
 * Worth testing rather than eyeballing because the states that matter are the
 * ones a developer's own workspace rarely has: one connected platform (where
 * the filter must not appear at all) and several (where exactly one is counted
 * at a time, because that is all the server can answer).
 */

const WINDOWS = [
  { window: '7d', label: 'last 7 days' },
  { window: '28d', label: 'last 28 days' },
]

const THREE = [
  { id: 'instagram', label: 'Instagram', accounts: 2 },
  { id: 'linkedin', label: 'LinkedIn', accounts: 1 },
  { id: 'facebook', label: 'Facebook', accounts: 1 },
]

function setup(props: Partial<Parameters<typeof WorkspaceScopeBar>[0]> = {}) {
  const onPlatformChange = vi.fn()
  render(
    <WorkspaceScopeBar
      platforms={THREE}
      onPlatformChange={onPlatformChange}
      window="28d"
      windows={WINDOWS}
      onWindowChange={vi.fn()}
      {...props}
    />,
  )
  return { onPlatformChange }
}

/** The platform marks — the buttons that carry a pressed state. */
const marks = () =>
  screen.queryAllByRole('button').filter((b) => b.hasAttribute('aria-pressed'))

describe('WorkspaceScopeBar', () => {
  it('offers no filter when there is nothing to filter', () => {
    setup({
      platforms: [
        { id: 'instagram', label: 'Instagram', accounts: 1 },
        { id: 'linkedin', label: 'LinkedIn', accounts: 0 },
      ],
    })

    // One connected platform means every state of the control shows the same
    // numbers. The period survives, so the bar keeps its place either way.
    expect(marks()).toHaveLength(0)
    expect(screen.getByText('last 28 days')).toBeInTheDocument()
  })

  it('counts every platform until one is chosen', () => {
    setup()

    // Not "none selected": the default is everything in the numbers, and marks
    // drawn as off would say the opposite of what the figures are showing.
    expect(marks()).toHaveLength(3)
    for (const mark of marks()) {
      expect(mark).toHaveAttribute('aria-pressed', 'true')
    }
  })

  it('narrows to exactly one', async () => {
    const { onPlatformChange } = setup()
    await userEvent.click(screen.getByRole('button', { name: /LinkedIn/ }))

    expect(onPlatformChange).toHaveBeenCalledWith('linkedin')
  })

  it('shows only the chosen platform as counted', () => {
    setup({ platform: 'linkedin' })

    const pressed = marks().filter(
      (m) => m.getAttribute('aria-pressed') === 'true',
    )
    expect(pressed).toHaveLength(1)
    expect(pressed[0]).toHaveAccessibleName(/LinkedIn/)
  })

  it('lets the chosen platform be pressed again to clear', async () => {
    const { onPlatformChange } = setup({ platform: 'linkedin' })
    await userEvent.click(screen.getByRole('button', { name: /LinkedIn/ }))

    // Without this the only way out of a filter is to guess which other control
    // clears it — and a filter left on is a filtered screenshot read as the
    // whole picture.
    expect(onPlatformChange).toHaveBeenCalledWith(undefined)
  })

  it('offers a way back only while it is narrowed', async () => {
    const { onPlatformChange } = setup({ platform: 'linkedin' })
    const clear = screen.getByRole('button', { name: 'ALL PLATFORMS' })
    await userEvent.click(clear)

    expect(onPlatformChange).toHaveBeenCalledWith(undefined)
  })

  it('does not offer a way back from a state it is already in', () => {
    setup()

    expect(
      screen.queryByRole('button', { name: 'ALL PLATFORMS' }),
    ).not.toBeInTheDocument()
  })
})
