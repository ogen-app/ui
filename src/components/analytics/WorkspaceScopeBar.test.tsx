import { render, screen } from '@testing-library/react'
import { QueryWrapper } from '@/test/queryWrapper'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { WorkspaceScopeBar } from './WorkspaceScopeBar'

/**
 * The bar that says what the dashboard is counting.
 *
 * Worth testing rather than eyeballing because the states that matter are the
 * ones a developer's own workspace rarely has: one connected platform (where
 * the filter must not appear at all) and several (where any set of them can be
 * counted, and every one of them is the same state as none).
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
  const onSelectedChange = vi.fn()
  render(
    <WorkspaceScopeBar
      platforms={THREE}
      selected={[]}
      onSelectedChange={onSelectedChange}
      window="28d"
      windows={WINDOWS}
      onWindowChange={vi.fn()}
      {...props}
    />,
    { wrapper: QueryWrapper },
  )
  return { onSelectedChange }
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

  it('narrows to the first platform chosen', async () => {
    const { onSelectedChange } = setup()
    await userEvent.click(screen.getByRole('button', { name: /LinkedIn/ }))

    // Not "everything but LinkedIn": from the whole workspace the useful first
    // move is towards one platform.
    expect(onSelectedChange).toHaveBeenCalledWith(['linkedin'])
  })

  it('adds a second platform to the first', async () => {
    const { onSelectedChange } = setup({ selected: ['linkedin'] })
    await userEvent.click(screen.getByRole('button', { name: /Instagram/ }))

    expect(onSelectedChange).toHaveBeenCalledWith(['linkedin', 'instagram'])
  })

  it('shows only the chosen platforms as counted', () => {
    setup({ selected: ['linkedin', 'facebook'] })

    const pressed = marks().filter(
      (m) => m.getAttribute('aria-pressed') === 'true',
    )
    expect(pressed).toHaveLength(2)
    expect(pressed[0]).toHaveAccessibleName(/LinkedIn/)
    expect(pressed[1]).toHaveAccessibleName(/Facebook/)
  })

  it('takes a chosen platform back out', async () => {
    const { onSelectedChange } = setup({ selected: ['linkedin', 'facebook'] })
    await userEvent.click(screen.getByRole('button', { name: /Facebook/ }))

    expect(onSelectedChange).toHaveBeenCalledWith(['linkedin'])
  })

  it('returns to everything when the last chosen one is pressed again', async () => {
    const { onSelectedChange } = setup({ selected: ['linkedin'] })
    await userEvent.click(screen.getByRole('button', { name: /LinkedIn/ }))

    // Without this the only way out of a filter is to guess which other control
    // clears it — and a filter left on is a filtered screenshot read as the
    // whole picture.
    expect(onSelectedChange).toHaveBeenCalledWith([])
  })

  it('reads every platform chosen as none chosen', async () => {
    const { onSelectedChange } = setup({ selected: ['linkedin', 'facebook'] })
    await userEvent.click(screen.getByRole('button', { name: /Instagram/ }))

    // Sent as the full list it would leave out a platform connected tomorrow,
    // in a view that looks like the whole workspace.
    expect(onSelectedChange).toHaveBeenCalledWith([])
  })

  it('ignores a chosen platform that has no mark any more', () => {
    // LinkedIn lost its last account while it was chosen. Counting it as
    // chosen would leave a filter on that nothing on screen can switch off.
    setup({
      platforms: [
        { id: 'instagram', label: 'Instagram', accounts: 2 },
        { id: 'linkedin', label: 'LinkedIn', accounts: 0 },
        { id: 'facebook', label: 'Facebook', accounts: 1 },
      ],
      selected: ['linkedin'],
    })

    for (const mark of marks()) {
      expect(mark).toHaveAttribute('aria-pressed', 'true')
    }
    expect(
      screen.queryByRole('button', { name: 'ALL PLATFORMS' }),
    ).not.toBeInTheDocument()
  })

  it('offers a way back only while it is narrowed', async () => {
    const { onSelectedChange } = setup({ selected: ['linkedin', 'facebook'] })
    const clear = screen.getByRole('button', { name: 'ALL PLATFORMS' })
    await userEvent.click(clear)

    expect(onSelectedChange).toHaveBeenCalledWith([])
  })

  it('does not offer a way back from a state it is already in', () => {
    setup()

    expect(
      screen.queryByRole('button', { name: 'ALL PLATFORMS' }),
    ).not.toBeInTheDocument()
  })
})
