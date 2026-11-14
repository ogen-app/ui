import { screen } from '@testing-library/react'
import { afterAll, describe, expect, it, vi } from 'vitest'
import { i18next, loadLocaleResources } from '@/i18n'
import { renderWithProviders } from '@/test/renderWithProviders'
import type { Post } from '@/types/posts'
import { CalendarSelectionContext } from './calendarSelection'
import { MonthDensity } from './MonthDensity'

vi.mock('@/hooks/usePlatforms', () => ({
  usePlatformCatalog: () => ({ resolve: () => ({ name: 'Instagram' }) }),
}))

const posts = ['p1', 'p2', 'p3'].map(
  (id) =>
    ({
      id,
      platform_id: 'ig',
      scheduled_at: '2026-04-22T09:00:00Z',
    }) as Post,
)

function show(ticked: string[]) {
  return renderWithProviders(
    <CalendarSelectionContext.Provider
      value={{ ticked: new Set(ticked), toggle: () => {} }}
    >
      <MonthDensity campaignId="c1" day={new Date(2026, 3, 22)} posts={posts} />
    </CalendarSelectionContext.Provider>,
  )
}

describe('a month day too busy for its cards (CON-486)', () => {
  it('says how many of its posts are ticked, so a selection is never invisible', async () => {
    await show(['p1', 'p3'])
    expect(screen.getByText('2 ticked')).toBeTruthy()
  })

  it('says nothing about ticks when none of its posts are', async () => {
    await show(['elsewhere'])
    expect(screen.queryByText(/ticked/)).toBeNull()
  })
})

describe('in Spanish', () => {
  afterAll(async () => {
    await i18next.changeLanguage('en')
  })

  it('words the ticked count', async () => {
    await loadLocaleResources('es')
    await i18next.changeLanguage('es')
    await show(['p1', 'p3'])
    expect(screen.getByText('2 marcadas')).toBeTruthy()
    expect(screen.queryByText(/ticked/)).toBeNull()
  })
})
