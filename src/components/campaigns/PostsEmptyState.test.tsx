import { describe, expect, it, afterEach, vi } from 'vitest'
import { screen } from '@testing-library/react'

import { renderWithProviders } from '@/test/renderWithProviders'
import { i18next, loadLocaleResources } from '@/i18n'
import { DEFAULT_LOCALE } from '@/i18n/config'
import { PostsEmptyState } from './PostsEmptyState'

/**
 * The calendar's conversion to the catalogue (CON-174), asserted where it is
 * densest: this one component carries copy, a weekday name from `Intl`, a
 * capitalised action label and the posts table's own column headers.
 *
 * The point is the *switch*, not the Spanish. English passing proves only that
 * the keys resolve; the same render in another language is what proves nothing
 * was left baked in at import — which is the failure mode a module-level table
 * of sentences produces, and the one this screen had.
 */

vi.mock('@/hooks/useCalendarSettings', () => ({
  useCalendarSettings: () => ({
    firstDayOfWeek: 1,
    hiddenDays: [],
    imagePreviews: false,
    card: { week: {}, month: {} },
    isPending: false,
  }),
}))

afterEach(async () => {
  await i18next.changeLanguage(DEFAULT_LOCALE)
})

// A fixed Monday, so the weekday assertions don't depend on the day the suite
// runs — the sketch starts its week from the anchor.
const ANCHOR = new Date(2026, 0, 5)

describe('PostsEmptyState', () => {
  it('reads from the catalogue in English', async () => {
    await renderWithProviders(
      <PostsEmptyState
        variant="week"
        campaignId="c1"
        anchor={ANCHOR}
        onAddPost={() => {}}
      />,
    )

    expect(screen.getByText('Your calendar is empty')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'ADD POST' })).toBeInTheDocument()
    // From `Intl`, not from the catalogue — the sketch's column headers.
    expect(screen.getByText('Monday')).toBeInTheDocument()
  })

  it('follows a language switch, copy and weekdays together', async () => {
    // English is the only bundled catalogue; every other locale is a chunk
    // fetched on demand, so the switch has to load it first — exactly what
    // `localeStore.setLocale` does before it calls `changeLanguage`.
    await loadLocaleResources('es')
    await i18next.changeLanguage('es')
    await renderWithProviders(
      <PostsEmptyState
        variant="week"
        campaignId="c1"
        anchor={ANCHOR}
        onAddPost={() => {}}
      />,
    )

    expect(screen.getByText('Tu calendario está vacío')).toBeInTheDocument()
    // Capitals survive translation — a destructive/action label's caps are the
    // copy, in every language.
    expect(
      screen.getByRole('button', { name: 'AÑADIR PUBLICACIÓN' }),
    ).toBeInTheDocument()
    expect(screen.getByText('lunes')).toBeInTheDocument()
  })

  it('says something different for the list and the panel', async () => {
    const { unmount } = await renderWithProviders(
      <PostsEmptyState variant="list" campaignId="c1" onAddPost={() => {}} />,
    )
    expect(screen.getByText('No posts yet')).toBeInTheDocument()
    // The sketch of the table draws the table's own headers, from the same keys.
    expect(screen.getByText('Publish date')).toBeInTheDocument()
    unmount()

    await renderWithProviders(
      <PostsEmptyState variant="panel" campaignId="c1" onAddPost={() => {}} />,
    )
    expect(screen.getByText('Nothing unscheduled')).toBeInTheDocument()
  })
})
