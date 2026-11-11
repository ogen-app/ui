import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, renderHook } from '@testing-library/react'
import type { ReactNode } from 'react'

import { PostCard } from './PostCard'
import {
  coverDrawable,
  resetFailedCovers,
  useFailedCovers,
} from '@/lib/failedCovers'
import { DEFAULT_WEEK_FIELDS } from './cardFields'
import { CARD_RUNGS } from './cardRungs'
import { CalendarSelectionContext } from './calendarSelection'
import type { Post } from '@/types/posts'

/**
 * The card's picture (CON-247): where it comes from, and what happens when it
 * will not load. Both are invisible in an English snapshot of a working
 * calendar — the first because `media_urls` and `cover_url` draw the same
 * band, the second because a presigned URL only fails once it is 15 minutes
 * old.
 */

vi.mock('@tanstack/react-router', () => ({
  Link: ({
    children,
    className,
  }: {
    children: ReactNode
    className?: string
  }) => <a className={className}>{children}</a>,
}))
// Unresolved by default, which `hasVisibleProblem` reads as a post with a
// problem — so a test of what a problem-free card drops resolves one.
const platform = vi.hoisted(() => ({ resolved: undefined as unknown }))
vi.mock('@/hooks/usePlatforms', () => ({
  usePlatformCatalog: () => ({ resolve: () => platform.resolved }),
}))
vi.mock('@/hooks/usePublishingAccount', () => ({
  usePublishingAccount: () => ({ ambiguous: false, mismatched: false }),
}))

const COVER = 'https://bucket.example/posts/p1/cover.png?X-Amz-Expires=900'

function post(overrides: Partial<Post> = {}): Post {
  return {
    id: 'p1',
    campaign_id: 'c1',
    platform_id: '',
    platform_post_type: '',
    title: 'A post',
    content: '',
    media_urls: [],
    scheduled_at: '2099-01-01T10:00:00Z',
    published_at: null,
    status: 'draft',
    ...overrides,
  } as Post
}

const cover = (container: HTMLElement) => container.querySelector('img')

describe('PostCard cover', () => {
  // The failed set is module-wide, as it is in the app.
  afterEach(() => {
    act(() => resetFailedCovers())
  })

  it("draws the server's cover_url, lazily", () => {
    const { container } = render(<PostCard post={post({ cover_url: COVER })} />)
    const img = cover(container)
    expect(img?.getAttribute('src')).toBe(COVER)
    expect(img?.getAttribute('loading')).toBe('lazy')
  })

  it('reads nothing else — a stray media_urls entry is not a cover', () => {
    const { container } = render(
      <PostCard post={post({ media_urls: ['https://elsewhere/a.png'] })} />,
    )
    expect(cover(container)).toBeNull()
  })

  it('draws none when previews are switched off', () => {
    const { container } = render(
      <PostCard
        post={post({ cover_url: COVER })}
        fields={{ ...DEFAULT_WEEK_FIELDS, image: false }}
      />,
    )
    expect(cover(container)).toBeNull()
  })

  it('drops a cover that fails, and takes the next URL the list brings', () => {
    const { container, rerender } = render(
      <PostCard post={post({ cover_url: COVER })} />,
    )
    fireEvent.error(cover(container)!)
    // No broken-image glyph standing in for an expired link.
    expect(cover(container)).toBeNull()

    // The refetch signs a fresh URL — not the one that failed.
    const fresh = COVER.replace('900', '901')
    rerender(<PostCard post={post({ cover_url: fresh })} />)
    expect(cover(container)?.getAttribute('src')).toBe(fresh)
  })

  it('tells the grid a failed cover no longer costs a band', () => {
    // What the week and month grids read to budget each card's height.
    const grid = renderHook(() => useFailedCovers())
    expect(coverDrawable(COVER, grid.result.current)).toBe(true)

    const { container } = render(<PostCard post={post({ cover_url: COVER })} />)
    act(() => {
      fireEvent.error(cover(container)!)
    })

    expect(coverDrawable(COVER, grid.result.current)).toBe(false)
    const fresh = COVER.replace('900', '901')
    expect(coverDrawable(fresh, grid.result.current)).toBe(true)
  })
})

describe('PostCard not-grounded mark (CON-469)', () => {
  const minimal = CARD_RUNGS.find((r) => r.id === 'minimal')!

  afterEach(() => {
    platform.resolved = undefined
  })

  it('keeps its row on the tightest rung, which drops the time', () => {
    // A post with nothing else to flag, so the mark is all that keeps the row.
    platform.resolved = { icon: () => null, color: 'currentColor' }
    const { getByText } = render(
      <PostCard
        post={post({ grounding_mode: 'exploratory' })}
        rung={minimal}
      />,
    )
    expect(getByText('Not grounded')).toHaveClass('sr-only')
  })

  it('draws nothing for a post nobody generated', () => {
    const { queryByText } = render(
      <PostCard post={post({ grounding_mode: null })} />,
    )
    expect(queryByText('Not grounded')).not.toBeInTheDocument()
  })
})

describe('PostCard on a calendar that ticks (CON-472)', () => {
  const ticking = (ticked: string[], toggle = vi.fn()) =>
    render(
      <CalendarSelectionContext.Provider
        value={{ ticked: new Set(ticked), toggle }}
      >
        <PostCard post={post()} />
      </CalendarSelectionContext.Provider>,
    )

  it('offers a tick beside the link, which toggles the post', () => {
    const toggle = vi.fn()
    const { getByRole, container } = ticking([], toggle)
    const tick = getByRole('checkbox')
    // Not inside the link: a control in a link is two targets in one.
    expect(container.querySelector('a')?.contains(tick)).toBe(false)
    expect(tick).toHaveClass('opacity-0')
    // A touch screen has no hover to reveal it with.
    expect(tick).toHaveClass('[@media(hover:none)]:opacity-100')
    fireEvent.click(tick)
    expect(toggle).toHaveBeenCalledWith('p1')
  })

  it('outlines a ticked card, and shows every tick once any is ticked', () => {
    const { getByRole, container } = ticking(['p1'])
    expect(getByRole('checkbox')).toHaveAttribute('data-state', 'checked')
    expect(getByRole('checkbox')).not.toHaveClass('opacity-0')
    expect(container.querySelector('a')).toHaveClass('outline-2')
  })

  it('is only a link outside a calendar that ticks', () => {
    const { queryByRole } = render(<PostCard post={post()} />)
    expect(queryByRole('checkbox')).toBeNull()
  })
})
