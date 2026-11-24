import { screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderWithProviders } from '@/test/renderWithProviders'
import { useJustWrittenStore } from '@/stores/justWrittenStore'
import type { Post } from '@/types/posts'
import { NotScheduledPanel } from './NotScheduledPanel'

const data = vi.hoisted(() => ({
  posts: [] as Post[],
  updating: [] as string[],
  params: [] as unknown[],
}))
vi.mock('@tanstack/react-query', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@tanstack/react-query')>()),
  useMutationState: () => data.updating,
}))
vi.mock('@/hooks/usePosts', () => ({
  UPDATE_POST_KEY: ['posts', 'update'],
  useCampaignPosts: (_campaignId: string, params?: unknown) => {
    data.params.push(params)
    return {
      data: data.posts,
      isPending: false,
      isFetching: false,
      isError: false,
      status: 'success',
      fetchStatus: 'idle',
    }
  },
  useWorkspacePosts: () => ({ data: [] }),
  useAddPost: () => () => {},
  useUpdatePost: () => ({ mutate: vi.fn() }),
}))
vi.mock('@/hooks/useCampaigns', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/hooks/useCampaigns')>()),
  useCampaign: () => ({ data: { target_platforms: [] } }),
}))
vi.mock('@/hooks/usePlatforms', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/hooks/usePlatforms')>()),
  usePlatformCatalog: () => ({
    resolve: () => ({
      name: 'Instagram',
      postTypes: [{ slug: 'carousel', label: 'Carousel' }],
    }),
  }),
  // The panel splits the posts by whether they have an account to publish
  // as, and waits for the platforms to do it: Instagram has one account, so
  // a post on it is ready; any other platform has none.
  usePlatforms: () => ({ isPending: false }),
  usePlatformViews: () => [
    {
      platform: { id: 'ig' },
      connectedPublishers: [
        {
          accounts: [{ id: 'acct', username: 'hotel', display_name: 'Hotel' }],
        },
      ],
    },
  ],
}))

const post = (id: string, overrides: Partial<Post> = {}): Post =>
  ({
    id,
    campaign_id: 'c1',
    platform_id: 'ig',
    platform_post_type: 'carousel',
    title: id,
    content: '',
    media_urls: [],
    scheduled_at: null,
    published_at: null,
    status: 'draft',
    grounding_mode: null,
    idea_count: 1,
    ...overrides,
  }) as Post

beforeEach(() => {
  useJustWrittenStore.setState({ ids: new Set() })
  data.updating = []
  data.params = []
})

describe('the Not scheduled panel (CON-485)', () => {
  it('counts what waits and lists compact rows', async () => {
    data.posts = [
      post('A pool in the rock'),
      post('Wedding packages', { idea_count: 0 }),
    ]
    await renderWithProviders(<NotScheduledPanel campaignId="c1" />)
    expect(screen.getByText('Not scheduled')).toBeTruthy()
    expect(screen.getByText('2')).toBeTruthy()
    expect(screen.getByText('Instagram · Carousel · from 1 idea')).toBeTruthy()
    // Written directly: no "from N ideas".
    expect(screen.getByText('Instagram · Carousel')).toBeTruthy()
  })

  it('puts what was just written on top, tinted, under its eyebrow', async () => {
    data.posts = [post('Older'), post('Fresh')]
    useJustWrittenStore.setState({ ids: new Set(['Fresh']) })
    await renderWithProviders(<NotScheduledPanel campaignId="c1" />)
    const titles = screen
      .getAllByRole('link')
      .map((l) => l.querySelector('span:nth-child(2)')?.textContent)
    expect(titles[0]).toBe('Fresh')
    expect(screen.getByText('JUST WRITTEN')).toBeTruthy()
  })

  it('folds the posts with no account to publish as into their own group', async () => {
    data.posts = [post('Ready'), post('Stranded', { platform_id: 'tt' })]
    await renderWithProviders(<NotScheduledPanel campaignId="c1" />)
    const ready = screen.getByRole('button', { name: /Ready to schedule/ })
    const blocked = screen.getByRole('button', { name: /Needs an account/ })
    // The one group anybody can act on from here is open; the other is
    // listed, so nothing undated disappears, but folded away.
    expect(ready.getAttribute('aria-expanded')).toBe('true')
    expect(blocked.getAttribute('aria-expanded')).toBe('false')
    expect(screen.getByText('Stranded')).toBeTruthy()
  })

  it('says nothing is ready, and opens the no-account group, when every post needs an account', async () => {
    data.posts = [post('Stranded', { platform_id: 'tt' })]
    await renderWithProviders(<NotScheduledPanel campaignId="c1" />)
    const blocked = screen.getByRole('button', { name: /Needs an account/ })
    expect(blocked.getAttribute('aria-expanded')).toBe('true')
    const ready = screen.getByRole('button', { name: /Ready to schedule/ })
    expect(ready.getAttribute('aria-expanded')).toBe('true')
    expect(screen.getByText('Nothing is ready to be scheduled')).toBeTruthy()
  })

  it('lets go of a just-written draft once it has a date', async () => {
    data.posts = [post('Dated', { scheduled_at: '2026-11-26T09:00:00Z' })]
    useJustWrittenStore.setState({ ids: new Set(['Dated']) })
    await renderWithProviders(<NotScheduledPanel campaignId="c1" />)
    expect(useJustWrittenStore.getState().ids.has('Dated')).toBe(false)
  })

  it('keeps the mark while the date is only the update in flight', async () => {
    data.posts = [post('Moving', { scheduled_at: '2026-11-26T09:00:00Z' })]
    data.updating = ['Moving']
    useJustWrittenStore.setState({ ids: new Set(['Moving']) })
    await renderWithProviders(<NotScheduledPanel campaignId="c1" />)
    expect(useJustWrittenStore.getState().ids.has('Moving')).toBe(true)
  })
})
