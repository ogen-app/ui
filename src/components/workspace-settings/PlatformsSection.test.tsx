import { useState } from 'react'
import { fireEvent, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { renderWithProviders } from '@/test/renderWithProviders'
import { PlatformsSection } from './PlatformsSection'

const start = vi.hoisted(() => vi.fn())

vi.mock('./connectPlatform', () => ({
  useConnectPlatform: () => ({ start, modal: null }),
}))
vi.mock('./AutoPublishControl', () => ({ AutoPublishControl: () => null }))
vi.mock('./DisconnectAccountDialog', () => ({
  DisconnectAccountDialog: () => null,
}))

const instagram = {
  platform: { id: 'pf1' },
  info: { zernioId: 'instagram', name: 'Instagram' },
  allowed: [],
  connectedPublishers: [
    {
      id: 'zernio',
      name: 'Zernio',
      state: 'active',
      connected: true,
      supported_post_types: [],
      accounts: [
        {
          id: 'a1',
          username: 'villaaurora',
          display_name: 'Villa Aurora',
          avatar_url: '',
          is_active: false,
          connected_at: '',
        },
      ],
    },
  ],
}

vi.mock('@/hooks/usePlatforms', () => ({
  usePlatformViews: () => [instagram],
}))

// jsdom draws nothing, so it has no scrolling to do.
Element.prototype.scrollIntoView = () => {}

describe('arriving at an account to reconnect (CON-480)', () => {
  it('asks first, and CONTINUE is what starts the flow', async () => {
    await renderWithProviders(
      <PlatformsSection focus={{ accountId: 'a1', platform: 'instagram' }} />,
    )
    expect(screen.getByText('Reconnect Instagram')).toBeTruthy()
    expect(screen.getByText('Needs reconnecting')).toBeTruthy()
    expect(start).not.toHaveBeenCalled()
    fireEvent.click(screen.getByText('CONTINUE TO INSTAGRAM'))
    expect(start).toHaveBeenCalledWith(instagram)
  })

  it('leaves the row singled out when cancelled, without starting anything', async () => {
    start.mockClear()
    await renderWithProviders(
      <PlatformsSection focus={{ accountId: 'a1', platform: 'instagram' }} />,
    )
    fireEvent.click(screen.getByText('CANCEL'))
    expect(screen.queryByText('Reconnect Instagram')).toBeNull()
    expect(start).not.toHaveBeenCalled()
  })

  it('asks nothing when the address names no account', async () => {
    await renderWithProviders(<PlatformsSection />)
    expect(screen.queryByText('Reconnect Instagram')).toBeNull()
  })

  it('keeps the focus in the dialog, and gives it back to Reconnect after', async () => {
    await renderWithProviders(
      <PlatformsSection focus={{ accountId: 'a1', platform: 'instagram' }} />,
    )
    expect(document.activeElement?.textContent).not.toBe('Reconnect')
    fireEvent.click(screen.getByText('CANCEL'))
    expect(document.activeElement?.textContent).toBe('Reconnect')
  })

  it('closes the dialog when the address moves on', async () => {
    function Moving() {
      const [here, setHere] = useState(true)
      return (
        <>
          <button type="button" onClick={() => setHere(false)}>
            move on
          </button>
          <PlatformsSection
            focus={
              here ? { accountId: 'a1', platform: 'instagram' } : undefined
            }
          />
        </>
      )
    }
    await renderWithProviders(<Moving />)
    expect(screen.getByText('Reconnect Instagram')).toBeTruthy()
    fireEvent.click(screen.getByText('move on'))
    expect(screen.queryByText('Reconnect Instagram')).toBeNull()
  })
})
