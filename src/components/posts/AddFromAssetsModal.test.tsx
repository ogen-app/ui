import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { i18next, loadLocaleResources } from '@/i18n'
import { QueryWrapper } from '@/test/queryWrapper'
import { queryAssets } from '@/services/api/content'
import type { AssetListItem, AssetQueryParams } from '@/types/assetList'
import { AddFromAssetsModal } from './AddFromAssetsModal'

/**
 * The server, as far as the picker asks it anything: three images, whatever
 * the scope. What the picker *asked* is the assertion, not what came back.
 */
vi.mock('@/services/api/content', () => ({
  queryAssets: vi.fn(async (_params: AssetQueryParams) => ({
    assets: [
      image('img-1', 'Harbour'),
      image('img-2', 'Lighthouse'),
      image('img-3', 'Dunes'),
    ],
    next_cursor: null,
    total: 3,
    total_unfiltered: 3,
    facets: {},
    groups: [],
    ideas_undecided_total: 0,
  })),
}))

function image(id: string, title: string): AssetListItem {
  return {
    id,
    title,
    type: 'IMG',
    kind: 'image',
    status: 'ready',
    failure_code: '',
    source_url: null,
    created_at: '2026-10-01T00:00:00Z',
    updated_at: '2026-10-01T00:00:00Z',
    analysis_status: null,
    file: {
      mime_type: 'image/png',
      duration_ms: 0,
      url: `https://cdn/${id}.png`,
    },
    tags: [],
    campaign_ids: ['c1'],
    idea_counts: { waiting: 0, yes: 0, later: 0, no: 0 },
    gist: null,
    next_idea: null,
    published_at: null,
  }
}

function open(props: Partial<Parameters<typeof AddFromAssetsModal>[0]> = {}) {
  const onAdd = vi.fn()
  render(
    <QueryWrapper>
      <AddFromAssetsModal
        campaignId="c1"
        room={null}
        attachedAssetIds={new Set()}
        onAdd={onAdd}
        onClose={() => {}}
        {...props}
      />
    </QueryWrapper>,
  )
  return { onAdd }
}

const lastParams = () => vi.mocked(queryAssets).mock.lastCall?.[0]

afterEach(() => {
  vi.mocked(queryAssets).mockClear()
})

describe('AddFromAssetsModal', () => {
  it('asks for the campaign’s images first, and the whole bank on the switch', async () => {
    const user = userEvent.setup()
    open()
    await screen.findByRole('checkbox', { name: 'Harbour' })
    expect(lastParams()).toMatchObject({ kind: 'image', scope_campaign: 'c1' })

    await user.click(screen.getByRole('tab', { name: 'All assets' }))
    await waitFor(() => expect(lastParams()?.scope_campaign).toBeUndefined())
    expect(lastParams()).toMatchObject({ kind: 'image' })
  })

  it('adds the images in the order they were ticked', async () => {
    const user = userEvent.setup()
    const { onAdd } = open()
    await user.click(await screen.findByRole('checkbox', { name: 'Dunes' }))
    await user.click(screen.getByRole('checkbox', { name: 'Harbour' }))
    await user.click(screen.getByRole('button', { name: 'Add 2 images' }))

    expect(onAdd).toHaveBeenCalledWith([
      { id: 'img-3', title: 'Dunes' },
      { id: 'img-1', title: 'Harbour' },
    ])
  })

  it('stops at the room the post has left', async () => {
    const user = userEvent.setup()
    open({ room: 1 })
    await user.click(await screen.findByRole('checkbox', { name: 'Harbour' }))

    expect(screen.getByRole('checkbox', { name: 'Lighthouse' })).toBeDisabled()
    expect(screen.getByRole('checkbox', { name: 'Harbour' })).toBeEnabled()
  })

  it('shows an image already on the post as ticked and inert', async () => {
    open({ attachedAssetIds: new Set(['img-2']) })
    const choice = await screen.findByRole('checkbox', { name: 'Lighthouse' })

    expect(choice).toBeChecked()
    expect(choice).toBeDisabled()
    expect(screen.getByText('On this post')).toBeInTheDocument()
  })

  it('speaks Spanish when the app does', async () => {
    await loadLocaleResources('es')
    await i18next.changeLanguage('es')
    try {
      open({ room: 2 })
      await screen.findByRole('checkbox', { name: 'Harbour' })

      expect(
        screen.getByText('Añadir imágenes desde Recursos'),
      ).toBeInTheDocument()
      expect(
        screen.getByRole('tab', { name: 'Esta campaña' }),
      ).toBeInTheDocument()
      expect(
        screen.queryByText('Add images from Assets'),
      ).not.toBeInTheDocument()
      expect(screen.queryByText('This campaign')).not.toBeInTheDocument()
    } finally {
      await i18next.changeLanguage('en')
    }
  })
})
