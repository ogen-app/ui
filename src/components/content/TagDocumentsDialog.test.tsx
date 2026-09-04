import { afterEach, describe, expect, it, vi } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '@/test/renderWithProviders'
import { TagDocumentsDialog } from './TagDocumentsDialog'
import type { Asset, Tag } from '@/types/content'

function tag(id: string, name: string): Tag {
  return { id, name } as Tag
}

function asset(id: string, tags: Tag[]): Asset {
  return {
    id,
    title: id,
    content: '',
    status: 'ready',
    type: 'MD',
    alt_text: '',
    tag_ids: tags.map((t) => t.id),
    tags,
    created_by: 'u1',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  }
}

const BRAND = tag('t1', 'Brand')
const RESEARCH = tag('t2', 'Research')

function open(assets: Asset[], onConfirm = vi.fn()) {
  return {
    onConfirm,
    ui: (
      <TagDocumentsDialog
        assets={assets}
        isOpen
        onClose={() => {}}
        onConfirm={onConfirm}
        saving={false}
      />
    ),
  }
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('TagDocumentsDialog', () => {
  it('offers only the tags the selection carries, with how many carry each', async () => {
    // Two of three have Brand, one has Research — and the workspace has other
    // tags besides, which must not appear as things to remove.
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify([BRAND, RESEARCH, tag('t3', 'Unused')]), {
          headers: { 'Content-Type': 'application/json' },
        }),
      ),
    )

    await renderWithProviders(
      open([
        asset('a1', [BRAND]),
        asset('a2', [BRAND]),
        asset('a3', [RESEARCH]),
      ]).ui,
    )

    expect(screen.getByRole('button', { name: /Brand/ })).toHaveTextContent(
      'on 2 of 3',
    )
    expect(screen.getByRole('button', { name: /Research/ })).toHaveTextContent(
      'on 1 of 3',
    )
    expect(screen.queryByText('Unused')).not.toBeInTheDocument()
  })

  it('says so when there is nothing to remove', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response('[]', {
          headers: { 'Content-Type': 'application/json' },
        }),
      ),
    )

    await renderWithProviders(open([asset('a1', [])]).ui)

    expect(
      screen.getByText('Nothing in this selection is tagged yet.'),
    ).toBeInTheDocument()
  })

  it('applies nothing until a tag is marked, then reports it as a removal', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify([BRAND]), {
          headers: { 'Content-Type': 'application/json' },
        }),
      ),
    )
    const { onConfirm, ui } = open([asset('a1', [BRAND])])

    await renderWithProviders(ui)

    const apply = screen.getByRole('button', { name: 'APPLY' })
    expect(apply).toBeDisabled()

    await userEvent.click(screen.getByRole('button', { name: /Brand/ }))
    expect(apply).toBeEnabled()

    await userEvent.click(apply)
    expect(onConfirm).toHaveBeenCalledWith({ add: [], remove: ['t1'] })
  })
})
