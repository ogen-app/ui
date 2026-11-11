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

function sentence() {
  // The sentence's words, whatever elements its clauses are drawn in.
  return screen.getByText(/Mostrando/).closest('div')?.textContent ?? ''
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
    const words = sentence()
    expect(words).toContain('borradores')
    expect(words).toContain('Instagram')
    expect(words).toContain('Carrusel')
    expect(words).toContain('con fecha')
    expect(words).not.toMatch(/Showing|drafts|with a date/)
  })

  it('says it shows every post when nothing narrows it', () => {
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
    expect(screen.getByText('todas las publicaciones')).toBeTruthy()
  })
})
