import { screen } from '@testing-library/react'
import { afterAll, describe, expect, it } from 'vitest'
import { i18next, loadLocaleResources } from '@/i18n'
import { renderWithProviders } from '@/test/renderWithProviders'
import type { Post } from '@/types/posts'
import { BulkActionsBar } from './BulkActionsBar'

const posts = [{ id: 'p1' }, { id: 'p2' }] as Post[]

function show(allMatching = false) {
  return renderWithProviders(
    <BulkActionsBar
      posts={posts}
      allMatching={allMatching}
      onClear={() => {}}
      onApply={async () => 0}
      onDelete={async () => 0}
    />,
  )
}

describe('the posts selection bar (CON-482)', () => {
  it('says when every matching post is ticked', async () => {
    await show(true)
    expect(screen.getByText('All 2 matching posts selected')).toBeTruthy()
    expect(screen.getByText('CLEAR')).toBeTruthy()
  })

  it('counts a plain selection', async () => {
    await show()
    expect(screen.getByText('2 selected')).toBeTruthy()
  })
})

describe('in Spanish', () => {
  afterAll(async () => {
    await i18next.changeLanguage('en')
  })

  it('words the bar (bug 9)', async () => {
    await loadLocaleResources('es')
    await i18next.changeLanguage('es')
    await show()
    expect(screen.getByText('2 seleccionadas')).toBeTruthy()
    expect(screen.getByText('Estado')).toBeTruthy()
    expect(screen.queryByText('2 selected')).toBeNull()
    expect(screen.queryByText('Status')).toBeNull()
  })
})
