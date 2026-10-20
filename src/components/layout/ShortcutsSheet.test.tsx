import { fireEvent, render, screen } from '@testing-library/react'
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { i18next, loadLocaleResources } from '@/i18n'
import { useShortcutsStore } from '@/stores/shortcutsStore'
import { ShortcutsSheet } from './ShortcutsSheet'

let pathname = '/ideas'
vi.mock('@tanstack/react-router', () => ({
  useRouterState: ({
    select,
  }: {
    select: (s: { location: { pathname: string } }) => unknown
  }) => select({ location: { pathname } }),
}))

function open(at: string) {
  pathname = at
  useShortcutsStore.setState({ open: true })
  return render(<ShortcutsSheet />)
}

beforeEach(() => {
  useShortcutsStore.setState({ open: false })
})

describe('ShortcutsSheet', () => {
  it('lists the workspace’s places, and names the campaign keys in one line', () => {
    open('/ideas')
    expect(screen.getByText('Ogen keyboard shortcuts')).toBeInTheDocument()
    const text = document.body.textContent
    expect(text).toContain('Workspace settings')
    expect(text).toContain(
      'Strategy, Posts and Calendar have keys inside a campaign.',
    )
    expect(screen.queryByText('In this campaign')).not.toBeInTheDocument()
    expect(screen.queryByText('this campaign’s')).not.toBeInTheDocument()
  })

  it('inside a campaign, adds its own rows and says whose sections they are', () => {
    open('/campaigns/c1/strategy')
    expect(screen.getByText('In this campaign')).toBeInTheDocument()
    expect(screen.getAllByText('this campaign’s')).toHaveLength(4)
    expect(document.body.textContent).not.toContain('Workspace settings')
  })

  it('closes on `?`', () => {
    open('/ideas')
    fireEvent.keyDown(window, { key: '?', shiftKey: true })
    expect(useShortcutsStore.getState().open).toBe(false)
  })

  it('leaves Ctrl + `?` to the browser', () => {
    open('/ideas')
    fireEvent.keyDown(window, { key: '?', ctrlKey: true, shiftKey: true })
    expect(useShortcutsStore.getState().open).toBe(true)
  })

  describe('in Spanish', () => {
    afterAll(async () => {
      await i18next.changeLanguage('en')
    })

    it('carries no English', async () => {
      await loadLocaleResources('es')
      await i18next.changeLanguage('es')
      open('/campaigns/c1/strategy')
      expect(screen.getByText('Atajos de teclado de Ogen')).toBeInTheDocument()
      const text = document.body.textContent
      for (const english of [
        'Go to',
        'Anywhere',
        'In this campaign',
        'Strategy',
        'to close',
      ])
        expect(text).not.toContain(english)
    })
  })
})
