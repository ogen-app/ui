import type { ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import * as api from '@/services/api/announcements'
import type { Announcement } from '@/types/announcements'
import { AnnouncementFrame } from './AnnouncementRibbon'

/**
 * The ribbon's promises: it shows the newest and only the newest, closing it
 * is immediate and reveals the next, a failed close does not lose it, and the
 * frame only claims height while there is something to show — every
 * viewport-sized page subtracts that height.
 */

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  })
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}

function announcement(id: string, overrides: Partial<Announcement> = {}) {
  return {
    id,
    title: `Title ${id}`,
    body: `Body ${id}`,
    cta: null,
    publishedAt: null,
    endsAt: null,
    clicked: false,
    ...overrides,
  } satisfies Announcement
}

function renderFrame() {
  return render(
    <AnnouncementFrame>
      <main>page</main>
    </AnnouncementFrame>,
    { wrapper },
  )
}

function ribbonHeight(container: HTMLElement) {
  return (container.firstElementChild as HTMLElement).style.getPropertyValue(
    '--announcement-h',
  )
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('AnnouncementFrame', () => {
  it('claims no height and renders no ribbon when nothing is showing', async () => {
    const list = vi.spyOn(api, 'listAnnouncements').mockResolvedValue([])
    const { container } = renderFrame()
    await waitFor(() => expect(list).toHaveBeenCalled())

    expect(screen.queryByRole('complementary')).not.toBeInTheDocument()
    expect(ribbonHeight(container)).toBe('0px')
    expect(screen.getByText('page')).toBeInTheDocument()
  })

  it('shows the newest only, claims its height, and closing it reveals the next', async () => {
    vi.spyOn(api, 'listAnnouncements').mockResolvedValue([
      announcement('a'),
      announcement('b'),
    ])
    const dismiss = vi
      .spyOn(api, 'dismissAnnouncement')
      .mockResolvedValue(undefined)

    const { container } = renderFrame()

    expect(await screen.findByText('Title a')).toBeInTheDocument()
    expect(screen.queryByText('Title b')).not.toBeInTheDocument()
    expect(ribbonHeight(container)).not.toBe('0px')

    await userEvent.click(
      screen.getByRole('button', { name: 'Hide this announcement' }),
    )

    expect(await screen.findByText('Title b')).toBeInTheDocument()
    expect(dismiss.mock.calls[0][0]).toBe('a')
  })

  it('gives the height back once the last one is closed', async () => {
    vi.spyOn(api, 'listAnnouncements').mockResolvedValue([announcement('a')])
    vi.spyOn(api, 'dismissAnnouncement').mockResolvedValue(undefined)

    const { container } = renderFrame()
    await userEvent.click(
      await screen.findByRole('button', { name: 'Hide this announcement' }),
    )

    await waitFor(() => expect(ribbonHeight(container)).toBe('0px'))
    expect(screen.queryByText('Title a')).not.toBeInTheDocument()
  })

  it('puts the ribbon back when the server refuses the close', async () => {
    vi.spyOn(api, 'listAnnouncements').mockResolvedValue([announcement('a')])
    vi.spyOn(api, 'dismissAnnouncement').mockRejectedValue(new Error('nope'))

    renderFrame()
    await userEvent.click(
      await screen.findByRole('button', { name: 'Hide this announcement' }),
    )

    expect(await screen.findByText('Title a')).toBeInTheDocument()
  })

  it('opens the CTA in a new tab and records the click', async () => {
    vi.spyOn(api, 'listAnnouncements').mockResolvedValue([
      announcement('a', {
        cta: { label: 'Learn more', url: 'https://getogen.com/x' },
      }),
    ])
    const click = vi
      .spyOn(api, 'recordAnnouncementClick')
      .mockResolvedValue(undefined)

    renderFrame()
    const link = await screen.findByRole('link', { name: /Learn more/ })

    expect(link).toHaveAttribute('href', 'https://getogen.com/x')
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', 'noopener noreferrer')

    // jsdom doesn't navigate; the click handler is what's under test.
    link.addEventListener('click', (e) => e.preventDefault())
    await userEvent.click(link)
    expect(click.mock.calls[0][0]).toBe('a')
  })
})
