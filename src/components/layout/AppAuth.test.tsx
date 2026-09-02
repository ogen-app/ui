import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent } from '@testing-library/react'
import { renderWithProviders } from '@/test/renderWithProviders'

/**
 * These assert the *reveal*, not the animation: the transition itself is CSS
 * and jsdom has no compositor. What matters here is that the card always ends
 * up visible — every path out of the loading state, including the ones where
 * the photograph never arrives — and that it only makes an entrance once.
 *
 * `AppAuth` latches `introPlayed` for the life of the module, so every test
 * that wants the entrance needs a fresh copy of it.
 */
async function shell() {
  const { AppAuth } = await import('./AppAuth')
  return renderWithProviders(
    <AppAuth
      title="Log in"
      form={<button type="submit">LOG IN</button>}
      bottomNav={undefined}
    />,
  )
}

async function freshShell() {
  vi.resetModules()
  return shell()
}

const card = (c: HTMLElement) => c.querySelector('.bg-primary') as HTMLElement
const photo = (c: HTMLElement) =>
  c.querySelector('img[src$=".webp"]') as HTMLImageElement

afterEach(() => {
  vi.useRealTimers()
})

describe('AppAuth', () => {
  it('holds the card back until the photograph is on screen', async () => {
    const { container } = await freshShell()

    expect(card(container).classList.contains('opacity-0')).toBe(true)

    act(() => {
      fireEvent.load(photo(container))
    })

    expect(card(container).classList.contains('auth-card-motion')).toBe(true)
  })

  it('brings the card up when the photograph fails', async () => {
    // The blurred stand-in is already painted, so a missing file costs nothing
    // visually — but it must not cost the user a login form either.
    const { container } = await freshShell()

    act(() => {
      fireEvent.error(photo(container))
    })

    expect(card(container).classList.contains('auth-card-motion')).toBe(true)
  })

  it('stops waiting for a photograph that is merely slow', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    const { container } = await freshShell()

    expect(card(container).classList.contains('opacity-0')).toBe(true)

    act(() => {
      vi.advanceTimersByTime(600)
    })

    expect(card(container).classList.contains('auth-card-motion')).toBe(true)
  })

  it('makes its entrance once, not on every auth screen', async () => {
    // Login → register → forgot are three mounts of this shell. Only the
    // arrival is an arrival; the rest are a change of contents.
    const first = await freshShell()
    act(() => {
      fireEvent.load(photo(first.container))
    })
    expect(card(first.container).classList.contains('auth-card-motion')).toBe(
      true,
    )

    // Navigating away tears this shell down and stands the next one up.
    first.unmount()
    const second = await shell()

    const next = card(second.container)
    expect(next.classList.contains('auth-card-motion')).toBe(false)
    // Visible from its first frame, rather than waiting on the photograph again.
    expect(next.classList.contains('opacity-0')).toBe(false)
  })
})
