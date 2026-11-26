import { render, screen } from '@testing-library/react'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { QueryWrapper } from '@/test/queryWrapper'
import { i18next, loadLocaleResources } from '@/i18n'
import { postFilterFromSearch } from '@/lib/postFilter'
import { PostsFilterBar } from './PostsFilterBar'

vi.mock('@/hooks/useCampaigns', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/hooks/useCampaigns')>()),
  useCampaign: () => ({
    data: {
      target_platforms: [{ id: 'sq-ig', post_types: ['carousel'] }],
    },
  }),
}))
vi.mock('@/hooks/usePlatforms', () => ({
  usePlatformCatalog: () => ({
    resolve: (id: string) =>
      id === 'sq-ig'
        ? {
            name: 'Instagram',
            postTypes: [{ slug: 'carousel', label: 'Carrusel' }],
          }
        : undefined,
  }),
}))

function pills() {
  // The pills' words, whatever elements their clauses are drawn in.
  return screen.getByRole('group', { name: 'Filtro' }).textContent ?? ''
}

describe('the posts filter in Spanish (CON-472)', () => {
  beforeAll(async () => {
    await loadLocaleResources('es')
    await i18next.changeLanguage('es')
  })
  afterAll(async () => {
    await i18next.changeLanguage('en')
  })

  it('reads the filter from the catalogue, in the campaign’s own words', () => {
    render(
      <PostsFilterBar
        campaignId="c1"
        filter={postFilterFromSearch({
          status: 'draft',
          platform: 'sq-ig',
          post_type: 'carousel',
          scheduled: 'yes',
        })}
        onChange={() => {}}
        total={2}
        totalUnfiltered={6}
      />,
      { wrapper: QueryWrapper },
    )
    const words = pills()
    expect(words).toContain('borradores')
    expect(words).toContain('Instagram')
    expect(words).toContain('Carrusel')
    expect(words).toContain('con fecha')
    expect(words).not.toMatch(/Showing|drafts|with a date/)
  })

  it('is the Filter button alone when nothing narrows the list', () => {
    render(
      <PostsFilterBar
        campaignId="c1"
        filter={postFilterFromSearch({})}
        onChange={() => {}}
        total={6}
        totalUnfiltered={6}
      />,
      { wrapper: QueryWrapper },
    )
    expect(screen.getByRole('button', { name: 'Filtro' })).toBeTruthy()
    expect(screen.queryByRole('group', { name: 'Filtro' })).toBeNull()
    expect(screen.queryByText(/6 de 6|Mostrando/)).toBeNull()
  })

  it('ends the pills on how many match', () => {
    render(
      <PostsFilterBar
        campaignId="c1"
        filter={postFilterFromSearch({ status: 'draft' })}
        onChange={() => {}}
        total={2}
        totalUnfiltered={6}
      />,
      { wrapper: QueryWrapper },
    )
    expect(pills()).toContain('2 de 6')
  })

  it('quotes a search the Spanish way (CON-534)', () => {
    render(
      <PostsFilterBar
        campaignId="c1"
        filter={postFilterFromSearch({ text: 'precios' })}
        onChange={() => {}}
        total={1}
        totalUnfiltered={6}
      />,
      { wrapper: QueryWrapper },
    )
    expect(pills()).toContain('que mencionan «precios»')
  })

  it('says a date range as scheduled, and holds the count while the list answers', () => {
    render(
      <PostsFilterBar
        campaignId="c1"
        filter={postFilterFromSearch({
          scheduled_after: '2026-04-21',
          scheduled_before: '2026-04-27',
        })}
        onChange={() => {}}
        total={2}
        totalUnfiltered={6}
        showCount={false}
      />,
      { wrapper: QueryWrapper },
    )
    const words = pills()
    expect(words).toContain('programadas')
    expect(words).not.toContain('con fecha')
    expect(words).not.toMatch(/2 de 6/)
  })
})
