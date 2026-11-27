import { screen } from '@testing-library/react'
import { afterAll, describe, expect, it } from 'vitest'
import { i18next, loadLocaleResources } from '@/i18n'
import { renderWithProviders } from '@/test/renderWithProviders'
import type { Post } from '@/types/posts'
import { CalendarSelectionBar, PostSelectionLine } from './BulkActionsBar'

const posts = [{ id: 'p1' }, { id: 'p2' }] as Post[]

const handlers = {
  onClear: () => {},
  onApply: async () => 0,
  onDelete: async () => 0,
}

function show(allMatching = false) {
  return renderWithProviders(
    <PostSelectionLine posts={posts} allMatching={allMatching} {...handlers} />,
  )
}

describe('the posts selection line (CON-482)', () => {
  it('says when every matching post is ticked', async () => {
    await show(true)
    expect(screen.getByText('All 2 matching posts selected')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Clear' })).toBeTruthy()
  })

  it('counts a plain selection', async () => {
    await show()
    expect(screen.getByText('2 selected')).toBeTruthy()
  })

  it('offers each action as a button of its own, not a menu', async () => {
    await show()
    for (const name of ['Change date', 'Change time', 'Unschedule', 'Delete'])
      expect(screen.getByRole('button', { name })).toBeTruthy()
  })

  it('floats over the calendar’s grid, which has no list head (CON-486)', async () => {
    await renderWithProviders(
      <CalendarSelectionBar posts={posts} {...handlers} />,
    )
    expect(screen.getByText('2 selected').closest('.absolute')).toBeTruthy()
  })
})

describe('in Spanish', () => {
  afterAll(async () => {
    await i18next.changeLanguage('en')
  })

  it('words the line (bug 9)', async () => {
    await loadLocaleResources('es')
    await i18next.changeLanguage('es')
    await show()
    expect(screen.getByText('2 seleccionadas')).toBeTruthy()
    expect(screen.getByText('Desprogramar')).toBeTruthy()
    expect(screen.queryByText('2 selected')).toBeNull()
    expect(screen.queryByText('Unschedule')).toBeNull()
  })
})
