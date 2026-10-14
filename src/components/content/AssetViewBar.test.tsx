import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '@/test/renderWithProviders'
import { i18next, loadLocaleResources } from '@/i18n'
import { AssetViewBar } from './AssetViewBar'

function show({
  undecided = 29,
  documents = 6,
  scoped = false,
  searching = false,
  onGroupingChange = vi.fn(),
  onSortChange = vi.fn(),
} = {}) {
  return renderWithProviders(
    <AssetViewBar
      undecided={undecided}
      documents={documents}
      ideasLink={{ to: '/ideas' }}
      grouping="created"
      onGroupingChange={onGroupingChange}
      scoped={scoped}
      sort="-created_at"
      onSortChange={onSortChange}
      searching={searching}
    />,
  )
}

describe('AssetViewBar', () => {
  it('counts the undecided ideas over the documents, the figure going to where they are answered', async () => {
    await show()
    expect(
      screen.getByText(/in 6 documents are waiting for a verdict\./),
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '29 ideas' })).toHaveAttribute(
      'href',
      '/ideas',
    )
  })

  it('says nothing about ideas when none are waiting', async () => {
    await show({ undecided: 0 })
    expect(screen.queryByText(/waiting for a verdict/)).not.toBeInTheDocument()
    expect(screen.getByText('Group by')).toBeInTheDocument()
  })

  it('offers every grouping, and none of them is a campaign on a campaign’s page', async () => {
    const onGroupingChange = vi.fn()
    const { unmount } = await show({ onGroupingChange })
    await userEvent.click(screen.getByText('Group by'))
    expect(
      screen
        .getAllByRole('menuitemradio')
        .map((item) => item.textContent?.trim()),
    ).toEqual([
      'Date added',
      'Campaign',
      'Tagonce per tag',
      'Type',
      'No grouping',
    ])
    await userEvent.click(screen.getByRole('menuitemradio', { name: /^Tag/ }))
    expect(onGroupingChange).toHaveBeenCalledWith('tag')
    unmount()

    await show({ scoped: true })
    await userEvent.click(screen.getByText('Group by'))
    expect(
      screen.queryByRole('menuitemradio', { name: 'Campaign' }),
    ).not.toBeInTheDocument()
  })

  it('offers the sorts in pairs, with a rule between pairs', async () => {
    await show()
    await userEvent.click(screen.getByText('Sort'))
    const menu = screen.getByRole('menu')
    expect(
      [
        ...menu.querySelectorAll('[role="menuitemradio"], [role="separator"]'),
      ].map((el) =>
        el.getAttribute('role') === 'separator' ? '—' : el.textContent?.trim(),
      ),
    ).toEqual([
      'Recently updated',
      'Least recently updated',
      '—',
      'Newest first',
      'Oldest first',
      '—',
      'Title A–Z',
      'Title Z–A',
    ])
  })

  it('offers Best match only while searching inside the documents', async () => {
    const onSortChange = vi.fn()
    await show({ onSortChange })
    await userEvent.click(screen.getByText('Sort'))
    expect(
      screen.queryByRole('menuitemradio', { name: 'Best match' }),
    ).not.toBeInTheDocument()
    await userEvent.click(
      screen.getByRole('menuitemradio', { name: 'Newest first' }),
    )
    expect(onSortChange).toHaveBeenCalledWith('-created_at')
  })
})

describe('AssetViewBar in Spanish', () => {
  beforeAll(async () => {
    await loadLocaleResources('es')
    await i18next.changeLanguage('es')
  })
  afterAll(async () => {
    await i18next.changeLanguage('en')
  })

  it('reads its sentence and its controls from the catalogue', async () => {
    await show({ undecided: 1, documents: 1 })
    expect(screen.getByRole('link', { name: '1 idea' })).toBeInTheDocument()
    expect(
      screen.getByText(/de 1 documento espera un veredicto\./),
    ).toBeInTheDocument()
    expect(screen.getByText('Agrupar por')).toBeInTheDocument()
    expect(screen.queryByText('Group by')).not.toBeInTheDocument()
  })
})
