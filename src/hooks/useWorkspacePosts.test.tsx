import { describe, expect, it, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import { renderWithProviders } from '@/test/renderWithProviders'
import { listPosts } from '@/services/api/posts'
import { useWorkspacePosts } from './usePosts'
import type { Post } from '@/types/posts'
import type { Campaign } from '@/types/campaigns'

/**
 * What the workspace calendar is drawn from.
 *
 * One behaviour worth a test of its own: `GET /api/posts` has no archive
 * filter, so the archived set arrives with everything else and would otherwise
 * be drawn on the grid. CON-156 is explicit that an archived campaign must not
 * reach the sidebar or seed `useCampaign`, and a calendar is the same claim —
 * a post on next Tuesday from a campaign somebody put away reads as work still
 * planned. The stamp is already in the payload on the hydrated campaign, so no
 * second request decides this.
 *
 * The other half is the case that must *not* be filtered: an unhydrated
 * campaign is a gap in the payload, not evidence of archiving, and dropping
 * those rows would silently empty the grid if the relation ever stopped coming
 * back.
 */
vi.mock('@/services/api/posts', async () => {
  const actual = await vi.importActual<typeof import('@/services/api/posts')>(
    '@/services/api/posts',
  )
  return { ...actual, listPosts: vi.fn() }
})

function campaign(id: string, archivedAt: string | null): Campaign {
  return { id, archived_at: archivedAt } as Campaign
}

function post(id: string, campaign: Campaign | null): Post {
  return { id, campaign_id: campaign?.id ?? '', campaign } as Post
}

function Probe() {
  const { data } = useWorkspacePosts()
  if (!data) return <p>loading</p>
  return <p>{`drawn:${data.map((p) => p.id).join(',')}`}</p>
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('useWorkspacePosts', () => {
  it('leaves out posts belonging to an archived campaign', async () => {
    vi.mocked(listPosts).mockResolvedValue([
      post('live', campaign('c-live', null)),
      post('filed', campaign('c-filed', '2026-09-01T00:00:00Z')),
      post('also-live', campaign('c-live', null)),
    ])

    await renderWithProviders(<Probe />)

    await waitFor(() => {
      expect(screen.getByText('drawn:live,also-live')).toBeInTheDocument()
    })
  })

  it('keeps a post whose campaign came back unhydrated', async () => {
    vi.mocked(listPosts).mockResolvedValue([post('orphan', null)])

    await renderWithProviders(<Probe />)

    await waitFor(() => {
      expect(screen.getByText('drawn:orphan')).toBeInTheDocument()
    })
  })
})
